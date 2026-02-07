import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useGameList } from "../../src/hooks/useGameList";
import { LoadingScreen, Card } from "../../src/components";
import { colors, spacing, fontSize, borderRadius } from "../../src/theme";
import {
  formatUSDC,
  formatUnits,
  priceToNumber,
  formatDate,
  getGameStatus,
  computeVaultPnL,
} from "../../src/utils/format";
import { TEAM_SYMBOL } from "../../src/config/constants";

/**
 * Game List Page
 * --------------
 * Shows all registered games with aggregate wager info:
 * - USDC amount bet
 * - NO tokens sold
 * - Latest NO price
 * - PnL for the game
 * - Number of market makers
 */
export default function GameListScreen() {
  const { games, loading, refresh } = useGameList();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading && games.length === 0) return <LoadingScreen />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.pageTitle}>{TEAM_SYMBOL} Games</Text>
      <Text style={styles.subtitle}>
        {games.length} registered game{games.length !== 1 ? "s" : ""}
      </Text>

      {games.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            No games registered yet. Check back later.
          </Text>
        </Card>
      ) : (
        games.map((game) => {
          const status = getGameStatus(game.gameTime);
          const noPrice = priceToNumber(game.latestNoPrice);
          const pnl = computeVaultPnL(
            game.vaultWager.noTokensSold > 0n
              ? (game.vaultWager.noTokensSold * game.vaultWager.averageNoPrice) /
                  BigInt(1e18)
              : 0n,
            game.vaultWager.noTokensSold,
            game.latestNoPrice
          );

          const statusColor =
            status === "live"
              ? colors.success
              : status === "ended"
                ? colors.textMuted
                : colors.warning;

          return (
            <TouchableOpacity
              key={game.gameId}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/games/[gameId]",
                  params: { gameId: game.gameId },
                })
              }
            >
              <Card style={styles.gameCard}>
                {/* Header row */}
                <View style={styles.gameHeader}>
                  <View style={styles.teamsRow}>
                    <Text style={styles.teamText}>
                      {game.homeTeam}
                      <Text style={styles.vsText}> vs </Text>
                      {game.awayTeam}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColor + "22" },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.dateText}>
                  {formatDate(game.gameTime)}
                </Text>

                {/* Stats grid */}
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>USDC Bet</Text>
                    <Text style={styles.statValue}>
                      {formatUSDC(game.vaultWager.usdcAmountForBet)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>NO Sold</Text>
                    <Text style={styles.statValue}>
                      {Number(
                        formatUnits(game.vaultWager.noTokensSold)
                      ).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>NO Price</Text>
                    <Text style={styles.statValue}>
                      {noPrice > 0 ? `$${noPrice.toFixed(4)}` : "—"}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>PnL</Text>
                    <Text
                      style={[
                        styles.statValue,
                        {
                          color:
                            pnl > 0
                              ? colors.success
                              : pnl < 0
                                ? colors.error
                                : colors.textSecondary,
                        },
                      ]}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {pnl.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Makers</Text>
                    <Text style={styles.statValue}>
                      {game.marketMakerCount}
                    </Text>
                  </View>
                </View>

                <Text style={styles.slugText}>{game.slug}</Text>
              </Card>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  pageTitle: {
    fontSize: fontSize.xxl,
    fontWeight: "900",
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  gameCard: {
    gap: spacing.sm,
  },
  gameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamsRow: {
    flex: 1,
  },
  teamText: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "800",
  },
  vsText: {
    color: colors.textMuted,
    fontWeight: "400",
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statItem: {
    minWidth: "28%",
    flex: 1,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "700",
    marginTop: 2,
  },
  slugText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: "monospace",
    marginTop: spacing.xs,
  },
});
