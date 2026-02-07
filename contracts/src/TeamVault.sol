// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "openzeppelin/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "openzeppelin/access/Ownable.sol";
import {Oracle as IOracle} from "./interface/IOracle.sol";
import {ITeamVault} from "./interface/ITeamVault.sol";

/// @title Unexpected Sports Team Vault
/// @notice Tokenized vault that sells NO exposure for team games.
contract TeamVault is ERC20, Ownable, ITeamVault {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant BET_FRACTION = 2e16; // 2% in 1e18 fixed point
    uint256 public constant BUY_WINDOW = 48 hours;
    uint256 public constant TWAP_LOOKBACK = 2 hours;
    uint256 public constant MAX_TWAP_DEVIATION_BPS = 500;
    uint256 public constant LOCKUP_PERIOD = 1 days;
    uint256 public constant DEPOSIT_RATE_BPS = 200;
    uint256 public constant WITHDRAW_RATE_BPS = 100;

    error TeamVault__GameAlreadyRegistered(bytes32 gameId);
    error TeamVault__GameNotRegistered(bytes32 gameId);
    error TeamVault__InvalidTeamForGame(bytes32 gameId);
    error TeamVault__InvalidAmount();
    error TeamVault__MinSharesNotMet(uint256 shares, uint256 minShares);
    error TeamVault__MinAmountNotMet(uint256 amount, uint256 minAmount);
    error TeamVault__WithdrawalLocked(uint256 unlockTime);
    error TeamVault__RateLimitExceeded();
    error TeamVault__BuyWindowNotOpen();
    error TeamVault__GameStarted();
    error TeamVault__GameNotEnded();
    error TeamVault__UnsupportedSide();
    error TeamVault__NotRedeemable();
    error TeamVault__InsufficientNoTokens();
    error TeamVault__OraclePriceUnavailable();

    event GameRegistered(bytes32 indexed gameId, uint128 gameTime, bool isHomeTeam);
    event Deposit(address indexed account, uint256 amount, uint256 shares);
    event Withdraw(address indexed account, uint256 amount, uint256 shares);
    event Buy(address indexed account, bytes32 indexed gameId, uint256 amount, uint256 noTokens, uint256 price);
    event Redeem(address indexed account, bytes32 indexed gameId, uint256 noTokens, uint256 amount);

    struct GameInfo {
        uint128 gameTime;
        bool isRegistered;
        bool isHomeTeam;
    }

    IERC20 public immutable USDC;
    IOracle public immutable ORACLE;
    string public TEAM_SYMBOL;

    mapping(bytes32 gameId => GameInfo info) public gameInfo;
    bytes32[] public registeredGameIds;

    mapping(bytes32 gameId => VaultWager wager) public vaultWagers;
    mapping(bytes32 gameId => mapping(address marketMaker => MarketMakerWager wager)) public marketMakerWagers;
    mapping(bytes32 gameId => uint256 usdcSold) public usdcSold;
    mapping(bytes32 gameId => address[] makers) private gameMarketMakers;
    mapping(bytes32 gameId => mapping(address maker => bool isAdded)) private isMarketMakerForGame;

    mapping(address account => uint256 timestamp) public lastDepositTimestamp;
    uint256 public lastRateTimestamp;
    uint256 public lastRateAssets;

    constructor(address _owner, address _oracle, address _usdc, string memory _teamSymbol)
        ERC20("TeamVault Share", "TVS")
        Ownable(_owner)
    {
        ORACLE = IOracle(_oracle);
        USDC = IERC20(_usdc);
        TEAM_SYMBOL = _teamSymbol;
    }

    function registerGame(bytes32 _gameId) external onlyOwner {
        _registerGame(_gameId);
    }

    function registerGames(bytes32[] memory _gameIds) external onlyOwner {
        uint256 _length = _gameIds.length;
        for (uint256 i = 0; i < _length; i++) {
            _registerGame(_gameIds[i]);
        }
    }

    function deposit(uint256 _amount, uint256 _minShares) external {
        if (_amount == 0) {
            revert TeamVault__InvalidAmount();
        }

        uint256 _currentAssets = _totalAssets();
        uint256 _totalSupply = totalSupply();
        uint256 _shares = _totalSupply == 0 ? _amount : (_amount * _totalSupply) / _currentAssets;
        if (_shares < _minShares) {
            revert TeamVault__MinSharesNotMet(_shares, _minShares);
        }

        _enforceRateLimit(true, _amount, _currentAssets);
        USDC.safeTransferFrom(msg.sender, address(this), _amount);
        _mint(msg.sender, _shares);

        lastDepositTimestamp[msg.sender] = block.timestamp;
        _updateRateLimitBaseline(_currentAssets + _amount);

        emit Deposit(msg.sender, _amount, _shares);
    }

    function withdraw(uint256 _shares, uint256 _minAmount) external {
        if (_shares == 0) {
            revert TeamVault__InvalidAmount();
        }
        uint256 _unlockTime = lastDepositTimestamp[msg.sender] + LOCKUP_PERIOD;
        if (block.timestamp < _unlockTime) {
            revert TeamVault__WithdrawalLocked(_unlockTime);
        }

        uint256 _currentAssets = _totalAssets();
        uint256 _totalSupply = totalSupply();
        uint256 _amount = (_currentAssets * _shares) / _totalSupply;
        if (_amount < _minAmount) {
            revert TeamVault__MinAmountNotMet(_amount, _minAmount);
        }

        _enforceRateLimit(false, _amount, _currentAssets);
        _burn(msg.sender, _shares);
        USDC.safeTransfer(msg.sender, _amount);

        _updateRateLimitBaseline(_currentAssets - _amount);

        emit Withdraw(msg.sender, _amount, _shares);
    }

    function buy(bytes32 _gameId, uint256 _amount, bool _isYes, uint256 _minShares) external {
        if (_amount == 0) {
            revert TeamVault__InvalidAmount();
        }
        if (_isYes) {
            revert TeamVault__UnsupportedSide();
        }

        GameInfo memory _info = gameInfo[_gameId];
        if (!_info.isRegistered) {
            revert TeamVault__GameNotRegistered(_gameId);
        }
        if (block.timestamp >= _info.gameTime) {
            revert TeamVault__GameStarted();
        }

        uint256 _windowStart = _info.gameTime > BUY_WINDOW ? _info.gameTime - BUY_WINDOW : 0;
        if (block.timestamp < _windowStart) {
            revert TeamVault__BuyWindowNotOpen();
        }

        VaultWager storage _wager = vaultWagers[_gameId];
        if (_wager.usdcAmountForBet == 0) {
            uint256 _currentAssets = _totalAssets();
            _wager.usdcAmountForBet = (_currentAssets * BET_FRACTION) / 1e18;
        }

        uint256 _availableUsdc = _availableUsdcToSell(_info.gameTime, _wager.usdcAmountForBet);
        if (usdcSold[_gameId] + _amount > _availableUsdc) {
            revert TeamVault__RateLimitExceeded();
        }

        uint256 _price = _selectNoPrice(_gameId);
        uint256 _noTokens = (_amount * 1e18) / _price;
        if (_noTokens < _minShares) {
            revert TeamVault__MinSharesNotMet(_noTokens, _minShares);
        }

        USDC.safeTransferFrom(msg.sender, address(this), _amount);
        usdcSold[_gameId] += _amount;

        _wager.noTokensSold += _noTokens;
        _wager.averageNoPrice =
            _weightedAveragePrice(_wager.averageNoPrice, _wager.noTokensSold - _noTokens, _price, _noTokens);

        MarketMakerWager storage _makerWager = marketMakerWagers[_gameId][msg.sender];
        if (!isMarketMakerForGame[_gameId][msg.sender]) {
            isMarketMakerForGame[_gameId][msg.sender] = true;
            gameMarketMakers[_gameId].push(msg.sender);
        }
        _makerWager.noTokens += _noTokens;
        _makerWager.averagePrice =
            _weightedAveragePrice(_makerWager.averagePrice, _makerWager.noTokens - _noTokens, _price, _noTokens);

        emit Buy(msg.sender, _gameId, _amount, _noTokens, _price);
    }

    function redeem(bytes32 _gameId, uint256 _shares, uint256 _minAmount) external {
        if (_shares == 0) {
            revert TeamVault__InvalidAmount();
        }

        GameInfo memory _info = gameInfo[_gameId];
        if (!_info.isRegistered) {
            revert TeamVault__GameNotRegistered(_gameId);
        }
        if (block.timestamp < _info.gameTime) {
            revert TeamVault__GameNotEnded();
        }

        IOracle.GameData memory _gameData = ORACLE.getGameData(_gameId);
        bool _teamWon = _gameData.homeWin == _info.isHomeTeam;
        if (_teamWon) {
            revert TeamVault__NotRedeemable();
        }

        MarketMakerWager storage _makerWager = marketMakerWagers[_gameId][msg.sender];
        if (_makerWager.noTokens < _shares) {
            revert TeamVault__InsufficientNoTokens();
        }

        uint256 _amount = _shares;
        if (_amount < _minAmount) {
            revert TeamVault__MinAmountNotMet(_amount, _minAmount);
        }

        _makerWager.noTokens -= _shares;
        if (_makerWager.noTokens == 0) {
            _makerWager.averagePrice = 0;
        }

        VaultWager storage _wager = vaultWagers[_gameId];
        if (_wager.noTokensSold >= _shares) {
            _wager.noTokensSold -= _shares;
        } else {
            _wager.noTokensSold = 0;
        }

        USDC.safeTransfer(msg.sender, _amount);

        emit Redeem(msg.sender, _gameId, _shares, _amount);
    }

    function getRegisteredGameIds() external view returns (bytes32[] memory) {
        return registeredGameIds;
    }

    function getGameMarketMakers(bytes32 _gameId) external view returns (address[] memory) {
        return gameMarketMakers[_gameId];
    }

    function getMarketMakerWagers(address _maker, bytes32[] calldata _gameIds)
        external
        view
        returns (MarketMakerWager[] memory)
    {
        uint256 _length = _gameIds.length;
        MarketMakerWager[] memory _wagers = new MarketMakerWager[](_length);
        for (uint256 i = 0; i < _length; i++) {
            _wagers[i] = marketMakerWagers[_gameIds[i]][_maker];
        }
        return _wagers;
    }

    function getMarketMakerWagersForGame(bytes32 _gameId)
        external
        view
        returns (address[] memory makers, MarketMakerWager[] memory wagers)
    {
        address[] memory _makers = gameMarketMakers[_gameId];
        uint256 _length = _makers.length;
        MarketMakerWager[] memory _wagers = new MarketMakerWager[](_length);
        for (uint256 i = 0; i < _length; i++) {
            _wagers[i] = marketMakerWagers[_gameId][_makers[i]];
        }
        return (_makers, _wagers);
    }

    function getSharePrice() external view returns (uint256) {
        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            return 1e18;
        }
        uint256 _assets = _totalAssets();
        return (_assets * 1e18) / _totalSupply;
    }

    function _registerGame(bytes32 _gameId) internal {
        if (gameInfo[_gameId].isRegistered) {
            revert TeamVault__GameAlreadyRegistered(_gameId);
        }

        IOracle.GameData memory _gameData = ORACLE.getGameData(_gameId);
        bool _isHomeTeam = _resolveTeamSide(_gameId, _gameData.homeTeam, _gameData.awayTeam);

        gameInfo[_gameId] = GameInfo({gameTime: _gameData.gameTime, isRegistered: true, isHomeTeam: _isHomeTeam});
        registeredGameIds.push(_gameId);

        emit GameRegistered(_gameId, _gameData.gameTime, _isHomeTeam);
    }

    function _resolveTeamSide(bytes32 _gameId, string memory _homeTeam, string memory _awayTeam)
        internal
        view
        returns (bool)
    {
        bytes32 _teamHash = keccak256(bytes(TEAM_SYMBOL));
        if (keccak256(bytes(_homeTeam)) == _teamHash) {
            return true;
        }
        if (keccak256(bytes(_awayTeam)) == _teamHash) {
            return false;
        }
        revert TeamVault__InvalidTeamForGame(_gameId);
    }

    function _availableUsdcToSell(uint128 _gameTime, uint256 _usdcAmountForBet) internal view returns (uint256) {
        if (block.timestamp >= _gameTime) {
            return _usdcAmountForBet;
        }

        uint256 _windowStart = _gameTime > BUY_WINDOW ? _gameTime - BUY_WINDOW : 0;
        if (block.timestamp <= _windowStart) {
            return 0;
        }

        uint256 _elapsed = block.timestamp - _windowStart;
        return (_usdcAmountForBet * _elapsed) / BUY_WINDOW;
    }

    function _selectNoPrice(bytes32 _gameId) internal view returns (uint256) {
        (, uint256 _latestNo) = ORACLE.getLatestPrice(_gameId);
        if (_latestNo == 0) {
            revert TeamVault__OraclePriceUnavailable();
        }

        if (block.timestamp < TWAP_LOOKBACK) {
            return _latestNo;
        }

        uint128 _start = uint128(block.timestamp - TWAP_LOOKBACK);
        uint128 _end = uint128(block.timestamp);
        try ORACLE.getTwapPrice(_gameId, _start, _end) returns (uint256, uint256 _twapNo) {
            if (_twapNo == 0) {
                return _latestNo;
            }
            uint256 _deviation = _latestNo > _twapNo ? _latestNo - _twapNo : _twapNo - _latestNo;
            uint256 _deviationBps = (_deviation * BPS) / _latestNo;
            if (_deviationBps <= MAX_TWAP_DEVIATION_BPS) {
                return _twapNo;
            }
        } catch {
            return _latestNo;
        }

        return _latestNo;
    }

    function _weightedAveragePrice(uint256 _avgPrice, uint256 _avgAmount, uint256 _newPrice, uint256 _newAmount)
        internal
        pure
        returns (uint256)
    {
        if (_avgAmount + _newAmount == 0) {
            return 0;
        }
        return ((_avgPrice * _avgAmount) + (_newPrice * _newAmount)) / (_avgAmount + _newAmount);
    }

    function _totalAssets() internal view returns (uint256) {
        uint256 _assets = USDC.balanceOf(address(this));
        uint256 _length = registeredGameIds.length;

        for (uint256 i = 0; i < _length; i++) {
            bytes32 _gameId = registeredGameIds[i];
            VaultWager storage _wager = vaultWagers[_gameId];
            if (_wager.noTokensSold == 0) {
                continue;
            }

            GameInfo memory _info = gameInfo[_gameId];
            uint256 _liability;

            if (block.timestamp >= _info.gameTime) {
                IOracle.GameData memory _gameData = ORACLE.getGameData(_gameId);
                bool _teamWon = _gameData.homeWin == _info.isHomeTeam;
                if (!_teamWon) {
                    _liability = _wager.noTokensSold;
                }
            } else {
                try ORACLE.getLatestPrice(_gameId) returns (uint256, uint256 _noPrice) {
                    _liability = (_wager.noTokensSold * _noPrice) / 1e18;
                } catch {
                    _liability = _wager.noTokensSold;
                }
            }

            if (_liability >= _assets) {
                return 0;
            }
            _assets -= _liability;
        }

        return _assets;
    }

    function _enforceRateLimit(bool _isIncrease, uint256 _amount, uint256 _currentAssets) internal view {
        if (lastRateTimestamp == 0 || block.timestamp >= lastRateTimestamp + 1 days) {
            return;
        }

        if (_isIncrease) {
            uint256 _maxIncrease = (lastRateAssets * DEPOSIT_RATE_BPS) / BPS;
            if (_currentAssets + _amount > lastRateAssets + _maxIncrease) {
                revert TeamVault__RateLimitExceeded();
            }
        } else {
            uint256 _maxDecrease = (lastRateAssets * WITHDRAW_RATE_BPS) / BPS;
            if (_currentAssets < _amount || _currentAssets - _amount < lastRateAssets - _maxDecrease) {
                revert TeamVault__RateLimitExceeded();
            }
        }
    }

    function _updateRateLimitBaseline(uint256 _newAssets) internal {
        if (lastRateTimestamp == 0 || block.timestamp >= lastRateTimestamp + 1 days) {
            lastRateTimestamp = block.timestamp;
            lastRateAssets = _newAssets;
        }
    }
}
