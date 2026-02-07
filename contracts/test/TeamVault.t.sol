// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "openzeppelin/access/Ownable.sol";
import {ERC20Mock} from "openzeppelin/mocks/token/ERC20Mock.sol";
import {TeamVault} from "../src/TeamVault.sol";
import {TeamVaultHarness} from "./harness/TeamVaultHarness.sol";
import {Oracle} from "../src/Oracle.sol";
import {Oracle as IOracle} from "../src/interface/IOracle.sol";
import {ITeamVault} from "../src/interface/ITeamVault.sol";

contract TeamVaultTest is Test {
    string internal constant TEAM_SYMBOL = "PHI";
    string internal constant DEFAULT_SLUG = "nba-phi-dal-2026-01-31";
    string internal constant DEFAULT_AWAY = "DAL";
    uint256 internal constant ONE = 1e18;

    TeamVault internal vault;
    Oracle internal oracle;
    ERC20Mock internal usdc;

    address internal owner;
    address internal trader;
    address internal maker;
    address internal reporter;

    function setUp() public virtual {
        owner = makeAddr("Owner");
        trader = makeAddr("Trader");
        maker = makeAddr("Maker");
        reporter = makeAddr("Reporter");

        oracle = new Oracle(owner);
        vm.prank(owner);
        oracle.setReporter(reporter, true);

        usdc = new ERC20Mock();
        vault = new TeamVault(owner, address(oracle), address(usdc), TEAM_SYMBOL);

        usdc.mint(trader, 1_000_000e18);
        usdc.mint(maker, 1_000_000e18);
    }

    function _registerGame(
        string memory _slug,
        string memory _homeTeam,
        string memory _awayTeam,
        uint128 _gameTime,
        bool _homeWin
    ) internal returns (bytes32) {
        IOracle.GameDataObservation[] memory observations = new IOracle.GameDataObservation[](0);
        IOracle.GameData memory gameData = IOracle.GameData({
            polymarket_slug: _slug,
            homeTeam: _homeTeam,
            awayTeam: _awayTeam,
            gameTime: _gameTime,
            homeWin: _homeWin,
            observations: observations
        });

        vm.prank(owner);
        oracle.registerGame(gameData);
        return keccak256(bytes(_slug));
    }

    function _registerDefaultGame(uint128 _gameTime, bool _homeWin) internal returns (bytes32) {
        return _registerGame(DEFAULT_SLUG, TEAM_SYMBOL, DEFAULT_AWAY, _gameTime, _homeWin);
    }

    function _registerGameInVault(bytes32 _gameId) internal {
        vm.prank(owner);
        vault.registerGame(_gameId);
    }

    function _registerDefaultGameInVault(uint128 _gameTime, bool _homeWin) internal returns (bytes32) {
        bytes32 gameId = _registerDefaultGame(_gameTime, _homeWin);
        _registerGameInVault(gameId);
        return gameId;
    }

    function _recordPrice(bytes32 _gameId, uint128 _timestamp, uint256 _yesPrice, uint256 _noPrice) internal {
        vm.prank(reporter);
        oracle.recordGameData(
            _gameId, IOracle.GameDataObservation({timestamp: _timestamp, yesPrice: _yesPrice, noPrice: _noPrice})
        );
    }

    function _recordLatestPrice(bytes32 _gameId, uint256 _yesPrice, uint256 _noPrice) internal {
        _recordPrice(_gameId, uint128(block.timestamp - 1), _yesPrice, _noPrice);
    }

    function _warpIntoBuyWindow(uint128 _gameTime) internal {
        vm.warp(uint256(_gameTime) - (vault.BUY_WINDOW() / 2));
    }

    function _deposit(address _account, uint256 _amount) internal {
        vm.startPrank(_account);
        usdc.approve(address(vault), _amount);
        vault.deposit(_amount, 0);
        vm.stopPrank();
    }

    function _buyNoTokens(address _buyer, bytes32 _gameId, uint256 _amount, uint256 _minNoTokens) internal {
        vm.startPrank(_buyer);
        usdc.approve(address(vault), _amount);
        vault.buy(_gameId, _amount, false, _minNoTokens);
        vm.stopPrank();
    }

    function _vaultNoTokenStats(bytes32 _gameId) internal view returns (uint256 noTokensSold, uint256 averageNoPrice) {
        (, uint256 _noTokensSold, uint256 _averageNoPrice) = vault.vaultWagers(_gameId);
        return (_noTokensSold, _averageNoPrice);
    }
}

contract TeamVaultHarnessTest is Test {
    string internal constant TEAM_SYMBOL = "PHI";
    string internal constant DEFAULT_SLUG = "nba-phi-dal-2026-01-31";
    string internal constant DEFAULT_AWAY = "DAL";

    TeamVaultHarness internal vault;
    Oracle internal oracle;
    ERC20Mock internal usdc;

    address internal owner;
    address internal reporter;

    function setUp() public virtual {
        owner = makeAddr("Owner");
        reporter = makeAddr("Reporter");

        oracle = new Oracle(owner);
        vm.prank(owner);
        oracle.setReporter(reporter, true);

        usdc = new ERC20Mock();
        vault = new TeamVaultHarness(owner, address(oracle), address(usdc), TEAM_SYMBOL);
    }

    function _registerGame(
        string memory _slug,
        string memory _homeTeam,
        string memory _awayTeam,
        uint128 _gameTime,
        bool _homeWin
    ) internal returns (bytes32) {
        IOracle.GameDataObservation[] memory observations = new IOracle.GameDataObservation[](0);
        IOracle.GameData memory gameData = IOracle.GameData({
            polymarket_slug: _slug,
            homeTeam: _homeTeam,
            awayTeam: _awayTeam,
            gameTime: _gameTime,
            homeWin: _homeWin,
            observations: observations
        });

        vm.prank(owner);
        oracle.registerGame(gameData);
        return keccak256(bytes(_slug));
    }

    function _registerDefaultGame(uint128 _gameTime, bool _homeWin) internal returns (bytes32) {
        return _registerGame(DEFAULT_SLUG, TEAM_SYMBOL, DEFAULT_AWAY, _gameTime, _homeWin);
    }

    function _registerGameInVault(bytes32 _gameId) internal {
        vm.prank(owner);
        vault.registerGame(_gameId);
    }

    function _registerDefaultGameInVault(uint128 _gameTime, bool _homeWin) internal returns (bytes32) {
        bytes32 gameId = _registerDefaultGame(_gameTime, _homeWin);
        _registerGameInVault(gameId);
        return gameId;
    }

    function _recordPrice(bytes32 _gameId, uint128 _timestamp, uint256 _yesPrice, uint256 _noPrice) internal {
        vm.prank(reporter);
        oracle.recordGameData(
            _gameId, IOracle.GameDataObservation({timestamp: _timestamp, yesPrice: _yesPrice, noPrice: _noPrice})
        );
    }

    function _recordLatestPrice(bytes32 _gameId, uint256 _yesPrice, uint256 _noPrice) internal {
        _recordPrice(_gameId, uint128(block.timestamp - 1), _yesPrice, _noPrice);
    }
}

contract Constructor is TeamVaultTest {
    function test_SetsVaultConfiguration() public view {
        assertEq(vault.owner(), owner);
        assertEq(address(vault.ORACLE()), address(oracle));
        assertEq(address(vault.USDC()), address(usdc));
        assertEq(vault.TEAM_SYMBOL(), TEAM_SYMBOL);
    }
}

contract RegisterGame is TeamVaultTest {
    function test_RegistersGame() public {
        uint128 gameTime = uint128(block.timestamp + 3 days);
        bytes32 gameId = _registerDefaultGame(gameTime, false);

        _registerGameInVault(gameId);

        (uint128 storedTime, bool isRegistered, bool isHomeTeam) = vault.gameInfo(gameId);
        assertTrue(isRegistered);
        assertEq(storedTime, gameTime);
        assertTrue(isHomeTeam);
    }

    function test_RevertIf_NotOwner() public {
        uint128 gameTime = uint128(block.timestamp + 3 days);
        bytes32 gameId = _registerDefaultGame(gameTime, false);

        vm.prank(trader);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, trader));
        vault.registerGame(gameId);
    }

    function test_RevertIf_GameNotInOracle() public {
        bytes32 gameId = keccak256("missing-game");
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Oracle.Oracle__GameNotFound.selector, gameId));
        vault.registerGame(gameId);
    }

    function test_RevertIf_TeamNotInGame() public {
        uint128 gameTime = uint128(block.timestamp + 3 days);
        bytes32 gameId = _registerGame("nba-nyk-dal-2026-01-31", "NYK", "DAL", gameTime, false);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(TeamVault.TeamVault__InvalidTeamForGame.selector, gameId));
        vault.registerGame(gameId);
    }

    function test_RevertIf_GameAlreadyRegistered() public {
        uint128 gameTime = uint128(block.timestamp + 3 days);
        bytes32 gameId = _registerDefaultGame(gameTime, false);

        _registerGameInVault(gameId);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(TeamVault.TeamVault__GameAlreadyRegistered.selector, gameId));
        vault.registerGame(gameId);
    }
}

contract RegisterGames is TeamVaultTest {
    function test_RegistersMultipleGames() public {
        uint128 gameTime = uint128(block.timestamp + 3 days);
        bytes32 gameIdA = _registerDefaultGame(gameTime, false);
        bytes32 gameIdB = _registerGame("nba-phi-nyk-2026-02-02", TEAM_SYMBOL, "NYK", gameTime + 1 days, false);

        bytes32[] memory gameIds = new bytes32[](2);
        gameIds[0] = gameIdA;
        gameIds[1] = gameIdB;

        vm.prank(owner);
        vault.registerGames(gameIds);

        (, bool isRegisteredA,) = vault.gameInfo(gameIdA);
        (, bool isRegisteredB,) = vault.gameInfo(gameIdB);
        assertTrue(isRegisteredA);
        assertTrue(isRegisteredB);
    }
}

contract Deposit is TeamVaultTest {
    function test_RevertIf_AmountIsZero() public {
        vm.prank(trader);
        vm.expectRevert(TeamVault.TeamVault__InvalidAmount.selector);
        vault.deposit(0, 0);
    }
    function test_MintsSharesAndTransfersAssets() public {
        uint256 amount = 100e18;
        _deposit(trader, amount);

        assertEq(vault.balanceOf(trader), amount);
        assertEq(vault.totalSupply(), amount);
        assertEq(usdc.balanceOf(address(vault)), amount);
    }

    function test_MintsProRataSharesWhenSupplyExists() public {
        _deposit(trader, 100e18);

        vm.warp(block.timestamp + 1 days + 1);
        _deposit(trader, 50e18);

        assertEq(vault.balanceOf(trader), 150e18);
        assertEq(vault.totalSupply(), 150e18);
    }

    function test_RevertIf_MinSharesNotMet() public {
        uint256 amount = 100e18;
        vm.startPrank(trader);
        usdc.approve(address(vault), amount);
        vm.expectRevert(abi.encodeWithSelector(TeamVault.TeamVault__MinSharesNotMet.selector, amount, amount + 1));
        vault.deposit(amount, amount + 1);
        vm.stopPrank();
    }

    function test_RevertIf_RateLimitExceeded() public {
        _deposit(trader, 100e18);

        vm.startPrank(trader);
        usdc.approve(address(vault), 3e18);
        vm.expectRevert(TeamVault.TeamVault__RateLimitExceeded.selector);
        vault.deposit(3e18, 0);
        vm.stopPrank();
    }
}

contract Withdraw is TeamVaultTest {
    function test_RevertIf_SharesAreZero() public {
        vm.prank(trader);
        vm.expectRevert(TeamVault.TeamVault__InvalidAmount.selector);
        vault.withdraw(0, 0);
    }
    function test_RevertIf_WithdrawalLocked() public {
        _deposit(trader, 100e18);

        uint256 unlockTime = vault.lastDepositTimestamp(trader) + vault.LOCKUP_PERIOD();
        vm.prank(trader);
        vm.expectRevert(abi.encodeWithSelector(TeamVault.TeamVault__WithdrawalLocked.selector, unlockTime));
        vault.withdraw(10e18, 0);
    }

    function test_RevertIf_MinAmountNotMet() public {
        _deposit(trader, 100e18);

        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(trader);
        vm.expectRevert(abi.encodeWithSelector(TeamVault.TeamVault__MinAmountNotMet.selector, 50e18, 60e18));
        vault.withdraw(50e18, 60e18);
    }

    function test_WithdrawsAssetsAfterLockup() public {
        _deposit(trader, 100e18);

        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(trader);
        vault.withdraw(50e18, 0);

        assertEq(usdc.balanceOf(trader), 1_000_000e18 - 50e18);
        assertEq(vault.balanceOf(trader), 50e18);
        assertEq(vault.totalSupply(), 50e18);
    }
}

contract Buy is TeamVaultTest {
    function test_RevertIf_AmountIsZero() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        vm.prank(maker);
        vm.expectRevert(TeamVault.TeamVault__InvalidAmount.selector);
        vault.buy(gameId, 0, false, 0);
    }

    function test_RevertIf_GameNotRegistered() public {
        vm.prank(maker);
        vm.expectRevert(abi.encodeWithSelector(TeamVault.TeamVault__GameNotRegistered.selector, bytes32("missing")));
        vault.buy(bytes32("missing"), 1e18, false, 0);
    }

    function test_RevertIf_WindowNotOpen() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        vm.prank(maker);
        vm.expectRevert(TeamVault.TeamVault__BuyWindowNotOpen.selector);
        vault.buy(gameId, 1e18, false, 0);
    }

    function test_RevertIf_GameStarted() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        vm.warp(gameTime + 1);
        vm.prank(maker);
        vm.expectRevert(TeamVault.TeamVault__GameStarted.selector);
        vault.buy(gameId, 1e18, false, 0);
    }

    function test_SellsNoTokensAndTracksWagers() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        _deposit(trader, 1_000e18);

        _warpIntoBuyWindow(gameTime);
        _recordLatestPrice(gameId, 4e17, 6e17);

        _buyNoTokens(maker, gameId, 10e18, 0);

        (uint256 usdcAmountForBet, uint256 noTokensSold, uint256 averageNoPrice) = vault.vaultWagers(gameId);
        assertEq(usdcAmountForBet, 20e18);
        assertEq(noTokensSold, (10e18 * ONE) / 6e17);
        assertEq(averageNoPrice, 6e17);

        (uint256 makerTokens, uint256 makerAvg) = vault.marketMakerWagers(gameId, maker);
        assertEq(makerTokens, noTokensSold);
        assertEq(makerAvg, 6e17);
    }

    function test_UpdatesAveragePriceOnSecondPurchase() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        _deposit(trader, 2_000e18);

        _warpIntoBuyWindow(gameTime);
        _recordLatestPrice(gameId, 4e17, 6e17);

        _buyNoTokens(maker, gameId, 10e18, 0);
        vm.warp(block.timestamp + 10 seconds);
        _recordLatestPrice(gameId, 6e17, 4e17);

        _buyNoTokens(maker, gameId, 10e18, 0);

        (uint256 noTokensSold, uint256 averageNoPrice) = _vaultNoTokenStats(gameId);
        uint256 noTokensFirst = (10e18 * ONE) / 6e17;
        uint256 noTokensSecond = (10e18 * ONE) / 4e17;
        uint256 expectedNoTokens = noTokensFirst + noTokensSecond;
        uint256 expectedAverage = ((6e17 * noTokensFirst) + (4e17 * noTokensSecond)) / expectedNoTokens;
        assertEq(noTokensSold, expectedNoTokens);
        assertEq(averageNoPrice, expectedAverage);
    }

    function test_RevertIf_MinSharesNotMet() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        _deposit(trader, 1_000e18);

        _warpIntoBuyWindow(gameTime);
        _recordLatestPrice(gameId, 4e17, 6e17);

        uint256 expectedNoTokens = (10e18 * ONE) / 6e17;
        vm.startPrank(maker);
        usdc.approve(address(vault), 10e18);
        vm.expectRevert(
            abi.encodeWithSelector(TeamVault.TeamVault__MinSharesNotMet.selector, expectedNoTokens, expectedNoTokens + 1)
        );
        vault.buy(gameId, 10e18, false, expectedNoTokens + 1);
        vm.stopPrank();
    }

    function test_RevertIf_BuyRateLimitExceeded() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        _deposit(trader, 1_000e18);

        vm.warp(block.timestamp + 25 hours);
        _recordLatestPrice(gameId, 4e17, 6e17);

        vm.startPrank(maker);
        usdc.approve(address(vault), 1e18);
        vm.expectRevert(TeamVault.TeamVault__RateLimitExceeded.selector);
        vault.buy(gameId, 1e18, false, 0);
        vm.stopPrank();
    }

    function test_RevertIf_SideIsYes() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        _warpIntoBuyWindow(gameTime);
        _recordLatestPrice(gameId, 4e17, 6e17);

        vm.prank(maker);
        vm.expectRevert(TeamVault.TeamVault__UnsupportedSide.selector);
        vault.buy(gameId, 1e18, true, 0);
    }
}

contract Redeem is TeamVaultTest {
    function test_RevertIf_GameNotRegistered() public {
        vm.prank(maker);
        vm.expectRevert(abi.encodeWithSelector(TeamVault.TeamVault__GameNotRegistered.selector, bytes32("missing")));
        vault.redeem(bytes32("missing"), 1e18, 0);
    }
    function test_RevertIf_AmountIsZero() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        vm.prank(maker);
        vm.expectRevert(TeamVault.TeamVault__InvalidAmount.selector);
        vault.redeem(gameId, 0, 0);
    }

    function test_RevertIf_GameNotEnded() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        vm.prank(maker);
        vm.expectRevert(TeamVault.TeamVault__GameNotEnded.selector);
        vault.redeem(gameId, 1e18, 0);
    }
    function test_RedeemsNoTokensWhenTeamLoses() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        _deposit(trader, 1_000e18);

        _warpIntoBuyWindow(gameTime);
        _recordLatestPrice(gameId, 4e17, 6e17);

        _buyNoTokens(maker, gameId, 10e18, 0);

        vm.warp(gameTime + 1);
        uint256 makerBalanceBefore = usdc.balanceOf(maker);

        (uint256 makerTokens,) = vault.marketMakerWagers(gameId, maker);

        vm.prank(maker);
        vault.redeem(gameId, makerTokens, 0);

        assertEq(usdc.balanceOf(maker), makerBalanceBefore + makerTokens);
        (uint256 remainingTokens,) = vault.marketMakerWagers(gameId, maker);
        assertEq(remainingTokens, 0);
    }

    function test_RevertIf_MinAmountNotMet() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        _deposit(trader, 1_000e18);

        _warpIntoBuyWindow(gameTime);
        _recordLatestPrice(gameId, 4e17, 6e17);

        _buyNoTokens(maker, gameId, 10e18, 0);

        vm.warp(gameTime + 1);
        (uint256 makerTokens,) = vault.marketMakerWagers(gameId, maker);

        vm.prank(maker);
        vm.expectRevert(abi.encodeWithSelector(TeamVault.TeamVault__MinAmountNotMet.selector, makerTokens, makerTokens + 1));
        vault.redeem(gameId, makerTokens, makerTokens + 1);
    }

    function test_RevertIf_TeamWins() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, true);

        _deposit(trader, 1_000e18);

        _warpIntoBuyWindow(gameTime);
        _recordLatestPrice(gameId, 4e17, 6e17);

        _buyNoTokens(maker, gameId, 10e18, 0);

        vm.warp(gameTime + 1);
        (uint256 makerTokens,) = vault.marketMakerWagers(gameId, maker);

        vm.prank(maker);
        vm.expectRevert(TeamVault.TeamVault__NotRedeemable.selector);
        vault.redeem(gameId, makerTokens, 0);
    }

    function test_RevertIf_InsufficientNoTokens() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        vm.warp(gameTime + 1);
        vm.prank(maker);
        vm.expectRevert(TeamVault.TeamVault__InsufficientNoTokens.selector);
        vault.redeem(gameId, 1e18, 0);
    }
}

contract GetSharePrice is TeamVaultTest {
    function test_ReturnsOneWhenNoSupply() public view {
        assertEq(vault.getSharePrice(), 1e18);
    }

    function test_ReturnsAssetsPerShare() public {
        _deposit(trader, 100e18);
        assertEq(vault.getSharePrice(), 1e18);
    }
}

contract FrontendViews is TeamVaultTest {
    function test_ReturnsRegisteredGames() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameIdA = _registerDefaultGame(gameTime, false);
        bytes32 gameIdB = _registerGame("nba-phi-nyk-2026-02-02", TEAM_SYMBOL, "NYK", gameTime, false);

        _registerGameInVault(gameIdA);
        _registerGameInVault(gameIdB);

        bytes32[] memory games = vault.getRegisteredGameIds();
        assertEq(games.length, 2);
        assertEq(games[0], gameIdA);
        assertEq(games[1], gameIdB);
    }

    function test_ReturnsMarketMakerWagersForMaker() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameIdA = _registerDefaultGame(gameTime, false);
        bytes32 gameIdB = _registerGame("nba-phi-nyk-2026-02-02", TEAM_SYMBOL, "NYK", gameTime, false);

        _registerGameInVault(gameIdA);
        _registerGameInVault(gameIdB);

        _deposit(trader, 10_000e18);

        _warpIntoBuyWindow(gameTime);
        _recordLatestPrice(gameIdA, 4e17, 6e17);
        _recordLatestPrice(gameIdB, 5e17, 5e17);

        _buyNoTokens(maker, gameIdA, 10e18, 0);
        _buyNoTokens(maker, gameIdB, 10e18, 0);

        bytes32[] memory games = new bytes32[](2);
        games[0] = gameIdA;
        games[1] = gameIdB;

        ITeamVault.MarketMakerWager[] memory wagers = vault.getMarketMakerWagers(maker, games);
        assertEq(wagers.length, 2);
        assertEq(wagers[0].noTokens, (10e18 * ONE) / 6e17);
        assertEq(wagers[1].noTokens, (10e18 * ONE) / 5e17);
    }

    function test_ReturnsAllMarketMakerWagersForGame() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        _deposit(trader, 10_000e18);

        _warpIntoBuyWindow(gameTime);
        _recordLatestPrice(gameId, 4e17, 6e17);

        address makerTwo = makeAddr("MakerTwo");
        usdc.mint(makerTwo, 500e18);

        _buyNoTokens(maker, gameId, 10e18, 0);
        _buyNoTokens(makerTwo, gameId, 5e18, 0);

        (address[] memory makers, ITeamVault.MarketMakerWager[] memory wagers) =
            vault.getMarketMakerWagersForGame(gameId);
        address[] memory marketMakers = vault.getGameMarketMakers(gameId);

        assertEq(makers.length, 2);
        assertEq(wagers.length, 2);
        assertEq(marketMakers.length, 2);
        assertEq(makers[0], maker);
        assertEq(makers[1], makerTwo);
        assertEq(marketMakers[0], maker);
        assertEq(marketMakers[1], makerTwo);
        assertEq(wagers[0].noTokens, (10e18 * ONE) / 6e17);
        assertEq(wagers[1].noTokens, (5e18 * ONE) / 6e17);
    }
}

contract InternalAvailableUsdcToSell is TeamVaultHarnessTest {
    function test_ReturnsZeroBeforeWindowStart() public {
        uint128 gameTime = uint128(block.timestamp + 100 hours);
        uint256 available = vault.exposed_availableUsdcToSell(gameTime, 100e18);
        assertEq(available, 0);
    }

    function test_ReturnsZeroAtWindowStart() public {
        uint128 gameTime = uint128(block.timestamp + vault.BUY_WINDOW());
        uint256 available = vault.exposed_availableUsdcToSell(gameTime, 100e18);
        assertEq(available, 0);
    }

    function test_ReturnsFullAfterGameTime() public {
        uint128 gameTime = uint128(block.timestamp - 1);
        uint256 available = vault.exposed_availableUsdcToSell(gameTime, 100e18);
        assertEq(available, 100e18);
    }
}

contract InternalWeightedAveragePrice is TeamVaultHarnessTest {
    function test_ReturnsZeroWhenNoAmounts() public view {
        assertEq(vault.exposed_weightedAveragePrice(0, 0, 0, 0), 0);
    }
}

contract InternalResolveTeamSide is TeamVaultHarnessTest {
    function test_ReturnsHomeWhenHomeTeamMatches() public view {
        bool isHomeTeam = vault.exposed_resolveTeamSide(bytes32("game"), TEAM_SYMBOL, "DAL");
        assertTrue(isHomeTeam);
    }

    function test_ReturnsAwayWhenAwayTeamMatches() public view {
        bool isHomeTeam = vault.exposed_resolveTeamSide(bytes32("game"), "DAL", TEAM_SYMBOL);
        assertTrue(!isHomeTeam);
    }
}

contract InternalSelectNoPrice is TeamVaultHarnessTest {
    function test_RevertIf_LatestNoIsZero() public {
        bytes32 gameId = _registerDefaultGame(uint128(block.timestamp + 3 days), false);
        vm.warp(block.timestamp + 1 hours);
        _recordLatestPrice(gameId, 4e17, 0);

        vm.expectRevert(TeamVault.TeamVault__OraclePriceUnavailable.selector);
        vault.exposed_selectNoPrice(gameId);
    }

    function test_UsesLatestNoWhenWithinLookback() public {
        bytes32 gameId = _registerDefaultGame(uint128(block.timestamp + 3 days), false);
        vm.warp(1 hours);
        _recordLatestPrice(gameId, 4e17, 5e17);

        uint256 price = vault.exposed_selectNoPrice(gameId);
        assertEq(price, 5e17);
    }

    function test_UsesLatestNoWhenTwapReverts() public {
        bytes32 gameId = _registerDefaultGame(uint128(block.timestamp + 3 days), false);
        vm.warp(10 hours);
        _recordPrice(gameId, uint128(block.timestamp), 4e17, 7e17);

        (, uint256 latestNo) = oracle.getLatestPrice(gameId);
        uint256 price = vault.exposed_selectNoPrice(gameId);
        assertEq(price, latestNo);
    }

    function test_UsesTwapWhenWithinDeviation() public {
        bytes32 gameId = _registerDefaultGame(uint128(block.timestamp + 3 days), false);
        vm.warp(10 hours);

        uint128 startTime = uint128(block.timestamp - 2 hours);
        _recordPrice(gameId, startTime, 4e17, 58e16);
        _recordPrice(gameId, uint128(block.timestamp - 1), 4e17, 6e17);

        (, uint256 twapNo) = oracle.getTwapPrice(gameId, startTime, uint128(block.timestamp));
        uint256 price = vault.exposed_selectNoPrice(gameId);
        assertEq(price, twapNo);
    }

    function test_UsesLatestNoWhenTwapIsZero() public {
        bytes32 gameId = _registerDefaultGame(uint128(block.timestamp + 3 days), false);
        vm.warp(10 hours);

        uint128 startTime = uint128(block.timestamp - 2 hours);
        _recordPrice(gameId, startTime, 4e17, 0);
        _recordPrice(gameId, uint128(block.timestamp), 4e17, 6e17);

        (, uint256 latestNo) = oracle.getLatestPrice(gameId);
        uint256 price = vault.exposed_selectNoPrice(gameId);
        assertEq(price, latestNo);
    }

    function test_UsesLatestWhenDeviationTooHigh() public {
        bytes32 gameId = _registerDefaultGame(uint128(block.timestamp + 3 days), false);
        vm.warp(10 hours);

        uint128 startTime = uint128(block.timestamp - 2 hours);
        _recordPrice(gameId, startTime, 4e17, 2e17);
        _recordPrice(gameId, uint128(block.timestamp - 1), 4e17, 9e17);

        (, uint256 latestNo) = oracle.getLatestPrice(gameId);
        uint256 price = vault.exposed_selectNoPrice(gameId);
        assertEq(price, latestNo);
    }
}

contract InternalTotalAssets is TeamVaultHarnessTest {
    function test_SkipsEmptyWagers() public {
        _registerDefaultGameInVault(uint128(block.timestamp + 3 days), false);

        usdc.mint(address(vault), 10e18);
        assertEq(vault.exposed_totalAssets(), 10e18);
    }

    function test_ReturnsBalanceWhenTeamWins() public {
        bytes32 gameId = _registerDefaultGameInVault(uint128(block.timestamp - 1), true);

        usdc.mint(address(vault), 10e18);
        vault.exposed_setVaultWager(gameId, 0, 5e18, 0);
        assertEq(vault.exposed_totalAssets(), 10e18);
    }

    function test_SubtractsLiabilityWhenTeamLoses() public {
        bytes32 gameId = _registerDefaultGameInVault(uint128(block.timestamp - 1), false);

        usdc.mint(address(vault), 10e18);
        vault.exposed_setVaultWager(gameId, 0, 4e18, 0);
        assertEq(vault.exposed_totalAssets(), 6e18);
    }

    function test_UsesLatestPriceForOngoingGame() public {
        bytes32 gameId = _registerDefaultGameInVault(uint128(block.timestamp + 3 days), false);

        vm.warp(block.timestamp + 2);
        _recordLatestPrice(gameId, 4e17, 6e17);
        usdc.mint(address(vault), 20e18);
        vault.exposed_setVaultWager(gameId, 0, 10e18, 0);

        assertEq(vault.exposed_totalAssets(), 14e18);
    }

    function test_UsesNoTokensWhenPriceUnavailable() public {
        bytes32 gameId = _registerDefaultGameInVault(uint128(block.timestamp + 3 days), false);

        usdc.mint(address(vault), 20e18);
        vault.exposed_setVaultWager(gameId, 0, 7e18, 0);

        assertEq(vault.exposed_totalAssets(), 13e18);
    }

    function test_ReturnsZeroWhenLiabilityExceedsAssets() public {
        bytes32 gameId = _registerDefaultGameInVault(uint128(block.timestamp - 1), false);

        usdc.mint(address(vault), 10e18);
        vault.exposed_setVaultWager(gameId, 0, 30e18, 0);

        assertEq(vault.exposed_totalAssets(), 0);
    }
}

contract InternalRateLimit is TeamVaultHarnessTest {
    function test_UpdateBaselineSetsWhenUnset() public {
        vault.exposed_updateRateLimitBaseline(100e18);
        assertEq(vault.lastRateTimestamp(), block.timestamp);
        assertEq(vault.lastRateAssets(), 100e18);
    }

    function test_UpdateBaselineNoChangeWithinDay() public {
        vault.exposed_setRateState(block.timestamp, 100e18);
        vault.exposed_updateRateLimitBaseline(200e18);

        assertEq(vault.lastRateTimestamp(), block.timestamp);
        assertEq(vault.lastRateAssets(), 100e18);
    }

    function test_UpdateBaselineAfterWindowElapsed() public {
        vm.warp(block.timestamp + 3 days);
        vault.exposed_setRateState(block.timestamp - 2 days, 100e18);
        vault.exposed_updateRateLimitBaseline(200e18);

        assertEq(vault.lastRateTimestamp(), block.timestamp);
        assertEq(vault.lastRateAssets(), 200e18);
    }

    function test_EnforceRateLimitIncreaseWithinLimit() public {
        vault.exposed_setRateState(block.timestamp, 100e18);
        vault.exposed_enforceRateLimit(true, 1e18, 100e18);
    }

    function test_EnforceRateLimitDecreaseWithinLimit() public {
        vault.exposed_setRateState(block.timestamp, 100e18);
        vault.exposed_enforceRateLimit(false, 1e18, 100e18);
    }

    function test_RevertIf_EnforceRateLimitIncreaseExceeded() public {
        vault.exposed_setRateState(block.timestamp, 100e18);
        vm.expectRevert(TeamVault.TeamVault__RateLimitExceeded.selector);
        vault.exposed_enforceRateLimit(true, 3e18, 100e18);
    }

    function test_RevertIf_EnforceRateLimitDecreaseExceeded() public {
        vault.exposed_setRateState(block.timestamp, 100e18);
        vm.expectRevert(TeamVault.TeamVault__RateLimitExceeded.selector);
        vault.exposed_enforceRateLimit(false, 2e18, 100e18);
    }

    function test_RevertIf_EnforceRateLimitDecreaseOverdrawn() public {
        vault.exposed_setRateState(block.timestamp, 100e18);
        vm.expectRevert(TeamVault.TeamVault__RateLimitExceeded.selector);
        vault.exposed_enforceRateLimit(false, 200e18, 100e18);
    }

    function test_EnforceRateLimitSkipsWhenUnset() public view {
        vault.exposed_enforceRateLimit(true, 1e18, 100e18);
    }

    function test_EnforceRateLimitSkipsWhenWindowElapsed() public {
        vm.warp(block.timestamp + 3 days);
        vault.exposed_setRateState(block.timestamp - 2 days, 100e18);
        vault.exposed_enforceRateLimit(true, 1e18, 100e18);
    }
}

contract InternalStateSetters is TeamVaultHarnessTest {
    function test_CanSetGameInfoAndRegisteredIds() public {
        bytes32 gameId = keccak256("game-id");
        vault.exposed_setGameInfo(gameId, uint128(1234), true, true);

        bytes32[] memory gameIds = new bytes32[](1);
        gameIds[0] = gameId;
        vault.exposed_setRegisteredGameIds(gameIds);

        (uint128 gameTime, bool isRegistered, bool isHomeTeam) = vault.gameInfo(gameId);
        assertEq(gameTime, 1234);
        assertTrue(isRegistered);
        assertTrue(isHomeTeam);

        bytes32[] memory storedIds = vault.getRegisteredGameIds();
        assertEq(storedIds.length, 1);
        assertEq(storedIds[0], gameId);
    }
}

contract InternalRedeemCoverage is TeamVaultHarnessTest {
    function test_RedeemClearsNoTokensSoldWhenBelowShares() public {
        uint128 gameTime = uint128(block.timestamp + 72 hours);
        bytes32 gameId = _registerDefaultGameInVault(gameTime, false);

        address maker = makeAddr("Maker");
        usdc.mint(address(vault), 1_000e18);
        usdc.mint(maker, 100e18);

        vm.warp(block.timestamp + 48 hours);
        _recordLatestPrice(gameId, 4e17, 6e17);

        vm.startPrank(maker);
        usdc.approve(address(vault), 10e18);
        vault.buy(gameId, 10e18, false, 0);
        vm.stopPrank();

        vault.exposed_setVaultWager(gameId, 0, 1e18, 0);

        vm.warp(gameTime + 1);
        (uint256 makerTokens,) = vault.marketMakerWagers(gameId, maker);

        vm.prank(maker);
        vault.redeem(gameId, makerTokens, 0);

        (, uint256 noTokensSold,) = vault.vaultWagers(gameId);
        assertEq(noTokensSold, 0);
    }
}
