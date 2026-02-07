// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "openzeppelin/access/Ownable.sol";
import {Oracle} from "../src/Oracle.sol";
import {Oracle as IOracle} from "../src/interface/IOracle.sol";

contract OracleTest is Test {
    string internal constant DEFAULT_SLUG = "nba-phi-dal-2026-01-31";
    string internal constant DEFAULT_HOME = "PHI";
    string internal constant DEFAULT_AWAY = "DAL";
    uint128 internal constant DEFAULT_GAME_TIME = 1000;

    Oracle internal oracle;
    address internal owner;
    address internal nonOwner;
    address internal reporter;

    function setUp() public virtual {
        owner = makeAddr("Owner");
        nonOwner = makeAddr("NonOwner");
        reporter = makeAddr("Reporter");
        oracle = new Oracle(owner);
        vm.prank(owner);
        oracle.setReporter(reporter, true);
    }

    function _defaultGameData() internal pure returns (IOracle.GameData memory) {
        IOracle.GameDataObservation[] memory observations = new IOracle.GameDataObservation[](0);
        return IOracle.GameData({
            polymarket_slug: DEFAULT_SLUG,
            homeTeam: DEFAULT_HOME,
            awayTeam: DEFAULT_AWAY,
            gameTime: DEFAULT_GAME_TIME,
            homeWin: false,
            observations: observations
        });
    }

    function _gameIdFromSlug(string memory _slug) internal pure returns (bytes32) {
        return keccak256(bytes(_slug));
    }

    function _recordObservation(bytes32 _gameId, uint128 _timestamp, uint256 _yesPrice, uint256 _noPrice) internal {
        vm.prank(reporter);
        oracle.recordGameData(
            _gameId, IOracle.GameDataObservation({timestamp: _timestamp, yesPrice: _yesPrice, noPrice: _noPrice})
        );
    }
}

contract SetReporter is OracleTest {
    function test_SetsReporterAuthorization() public {
        address newReporter = makeAddr("NewReporter");

        vm.prank(owner);
        oracle.setReporter(newReporter, true);
        assertTrue(oracle.isReporter(newReporter));

        vm.prank(owner);
        oracle.setReporter(newReporter, false);
        assertTrue(!oracle.isReporter(newReporter));
    }

    function test_EmitsReporterSetEvent() public {
        address newReporter = makeAddr("NewReporter");

        vm.expectEmit(true, false, false, true);
        emit Oracle.ReporterSet(newReporter, true);

        vm.prank(owner);
        oracle.setReporter(newReporter, true);
    }

    function test_RevertIf_NotReporter() public {
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        oracle.setReporter(nonOwner, true);
    }
}

contract RegisterGame is OracleTest {
    function test_RegistersGameAndReturnsId() public {
        vm.prank(owner);
        uint256 gameId = oracle.registerGame(_defaultGameData());

        bytes32 expectedId = _gameIdFromSlug(DEFAULT_SLUG);
        assertEq(gameId, uint256(expectedId));

        IOracle.GameData memory stored = oracle.getGameData(expectedId);
        assertEq(stored.polymarket_slug, DEFAULT_SLUG);
        assertEq(stored.homeTeam, DEFAULT_HOME);
        assertEq(stored.awayTeam, DEFAULT_AWAY);
        assertEq(stored.gameTime, DEFAULT_GAME_TIME);
        assertEq(stored.homeWin, false);
        assertEq(stored.observations.length, 0);
    }

    function test_EmitsGameRegisteredEvent() public {
        bytes32 expectedId = _gameIdFromSlug(DEFAULT_SLUG);
        vm.expectEmit(true, false, false, true);
        emit Oracle.GameRegistered(expectedId, DEFAULT_SLUG, DEFAULT_GAME_TIME, DEFAULT_HOME, DEFAULT_AWAY);

        vm.prank(owner);
        oracle.registerGame(_defaultGameData());
    }

    function test_RevertIf_NotOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        oracle.registerGame(_defaultGameData());
    }

    function test_RevertIf_GameAlreadyRegistered() public {
        vm.prank(owner);
        oracle.registerGame(_defaultGameData());

        bytes32 expectedId = _gameIdFromSlug(DEFAULT_SLUG);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Oracle.Oracle__GameAlreadyRegistered.selector, expectedId));
        oracle.registerGame(_defaultGameData());
    }
}

contract RecordGameData is OracleTest {
    bytes32 internal gameId;

    function setUp() public override {
        super.setUp();
        vm.prank(owner);
        oracle.registerGame(_defaultGameData());
        gameId = _gameIdFromSlug(DEFAULT_SLUG);
    }

    function test_RecordsObservationAndUpdatesLatestPrice() public {
        _recordObservation(gameId, 100, 40, 60);

        (uint256 yesPrice, uint256 noPrice) = oracle.getLatestPrice(gameId);
        assertEq(yesPrice, 40);
        assertEq(noPrice, 60);

        IOracle.GameData memory stored = oracle.getGameData(gameId);
        assertEq(stored.observations.length, 1);
        assertEq(stored.observations[0].timestamp, 100);
    }

    function test_EmitsGameDataRecordedEvent() public {
        vm.expectEmit(true, false, false, true);
        emit Oracle.GameDataRecorded(gameId, 120, 55, 45);

        _recordObservation(gameId, 120, 55, 45);
    }

    function test_RevertIf_NotOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Oracle.Oracle__UnauthorizedReporter.selector, nonOwner));
        oracle.recordGameData(gameId, IOracle.GameDataObservation({timestamp: 100, yesPrice: 40, noPrice: 60}));
    }

    function test_RevertIf_GameNotFound() public {
        bytes32 unknownGame = keccak256("unknown-game");
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Oracle.Oracle__GameNotFound.selector, unknownGame));
        oracle.recordGameData(unknownGame, IOracle.GameDataObservation({timestamp: 100, yesPrice: 40, noPrice: 60}));
    }

    function test_RevertIf_InvalidTimestamp() public {
        vm.prank(owner);
        vm.expectRevert(Oracle.Oracle__InvalidTimestamp.selector);
        oracle.recordGameData(gameId, IOracle.GameDataObservation({timestamp: 0, yesPrice: 40, noPrice: 60}));
    }

    function test_RevertIf_ObservationOutOfOrder() public {
        _recordObservation(gameId, 100, 40, 60);

        vm.prank(owner);
        vm.expectRevert(Oracle.Oracle__ObservationOutOfOrder.selector);
        oracle.recordGameData(gameId, IOracle.GameDataObservation({timestamp: 100, yesPrice: 50, noPrice: 50}));
    }

    function test_OwnerCanRecordGameData() public {
        vm.prank(owner);
        oracle.recordGameData(gameId, IOracle.GameDataObservation({timestamp: 100, yesPrice: 40, noPrice: 60}));

        (uint256 yesPrice, uint256 noPrice) = oracle.getLatestPrice(gameId);
        assertEq(yesPrice, 40);
        assertEq(noPrice, 60);
    }
}

contract GetGameData is OracleTest {
    bytes32 internal gameId;

    function setUp() public override {
        super.setUp();
        vm.prank(owner);
        oracle.registerGame(_defaultGameData());
        gameId = _gameIdFromSlug(DEFAULT_SLUG);
    }

    function test_ReturnsStoredGameData() public {
        IOracle.GameData memory stored = oracle.getGameData(gameId);
        assertEq(stored.polymarket_slug, DEFAULT_SLUG);
        assertEq(stored.homeTeam, DEFAULT_HOME);
        assertEq(stored.awayTeam, DEFAULT_AWAY);
        assertEq(stored.gameTime, DEFAULT_GAME_TIME);
    }

    function test_RevertIf_GameNotFound() public {
        bytes32 unknownGame = keccak256("missing-game");
        vm.expectRevert(abi.encodeWithSelector(Oracle.Oracle__GameNotFound.selector, unknownGame));
        oracle.getGameData(unknownGame);
    }
}

contract GetLatestPrice is OracleTest {
    bytes32 internal gameId;

    function setUp() public override {
        super.setUp();
        vm.prank(owner);
        oracle.registerGame(_defaultGameData());
        gameId = _gameIdFromSlug(DEFAULT_SLUG);
    }

    function test_ReturnsLatestObservationPrices() public {
        _recordObservation(gameId, 100, 40, 60);
        _recordObservation(gameId, 150, 55, 45);

        (uint256 yesPrice, uint256 noPrice) = oracle.getLatestPrice(gameId);
        assertEq(yesPrice, 55);
        assertEq(noPrice, 45);
    }

    function test_RevertIf_NoObservations() public {
        vm.expectRevert(Oracle.Oracle__NoObservations.selector);
        oracle.getLatestPrice(gameId);
    }

    function test_RevertIf_GameNotFound() public {
        bytes32 unknownGame = keccak256("unknown");
        vm.expectRevert(abi.encodeWithSelector(Oracle.Oracle__GameNotFound.selector, unknownGame));
        oracle.getLatestPrice(unknownGame);
    }
}

contract GetTwapPrice is OracleTest {
    bytes32 internal gameId;

    function setUp() public override {
        super.setUp();
        vm.prank(owner);
        oracle.registerGame(_defaultGameData());
        gameId = _gameIdFromSlug(DEFAULT_SLUG);

        _recordObservation(gameId, 50, 40, 60);
        _recordObservation(gameId, 150, 60, 40);
        _recordObservation(gameId, 220, 20, 80);
    }

    function test_ReturnsTimeWeightedAverageWithinRange() public {
        (uint256 yesPrice, uint256 noPrice) = oracle.getTwapPrice(gameId, 100, 200);
        assertEq(yesPrice, 50);
        assertEq(noPrice, 50);
    }

    function test_ReturnsTimeWeightedAveragePastLastObservation() public {
        (uint256 yesPrice, uint256 noPrice) = oracle.getTwapPrice(gameId, 160, 260);
        // 160-220 uses 60/40 for 60 seconds, 220-260 uses 20/80 for 40 seconds
        // yes: (60*60 + 20*40) / 100 = 44
        // no: (40*60 + 80*40) / 100 = 56
        assertEq(yesPrice, 44);
        assertEq(noPrice, 56);
    }

    function test_RevertIf_StartTimeAfterEndTime() public {
        vm.expectRevert(Oracle.Oracle__InvalidTimeRange.selector);
        oracle.getTwapPrice(gameId, 200, 100);
    }

    function test_RevertIf_NoObservationBeforeStartTime() public {
        bytes32 newGame = keccak256("new-game");
        vm.prank(owner);
        oracle.registerGame(
            IOracle.GameData({
                polymarket_slug: "new-game",
                homeTeam: DEFAULT_HOME,
                awayTeam: DEFAULT_AWAY,
                gameTime: DEFAULT_GAME_TIME,
                homeWin: false,
                observations: new IOracle.GameDataObservation[](0)
            })
        );

        _recordObservation(newGame, 200, 70, 30);

        vm.expectRevert(Oracle.Oracle__InvalidTimeRange.selector);
        oracle.getTwapPrice(newGame, 100, 150);
    }

    function test_RevertIf_GameNotFound() public {
        bytes32 unknownGame = keccak256("missing");
        vm.expectRevert(abi.encodeWithSelector(Oracle.Oracle__GameNotFound.selector, unknownGame));
        oracle.getTwapPrice(unknownGame, 100, 200);
    }

    function test_RevertIf_NoObservations() public {
        bytes32 emptyGame = keccak256("empty-game");
        vm.prank(owner);
        oracle.registerGame(
            IOracle.GameData({
                polymarket_slug: "empty-game",
                homeTeam: DEFAULT_HOME,
                awayTeam: DEFAULT_AWAY,
                gameTime: DEFAULT_GAME_TIME,
                homeWin: false,
                observations: new IOracle.GameDataObservation[](0)
            })
        );

        vm.expectRevert(Oracle.Oracle__NoObservations.selector);
        oracle.getTwapPrice(emptyGame, 100, 200);
    }

    function test_RevertIf_FirstObservationAfterStartTime() public {
        bytes32 lateGame = keccak256("late-game");
        vm.prank(owner);
        oracle.registerGame(
            IOracle.GameData({
                polymarket_slug: "late-game",
                homeTeam: DEFAULT_HOME,
                awayTeam: DEFAULT_AWAY,
                gameTime: DEFAULT_GAME_TIME,
                homeWin: false,
                observations: new IOracle.GameDataObservation[](0)
            })
        );

        // First observation at 150, which is after startTime 100 but before endTime 200
        _recordObservation(lateGame, 150, 70, 30);

        vm.expectRevert(Oracle.Oracle__InvalidTimeRange.selector);
        oracle.getTwapPrice(lateGame, 100, 200);
    }
}
