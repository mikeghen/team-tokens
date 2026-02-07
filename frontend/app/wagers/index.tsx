import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useMarketMakerWagers } from "../../src/hooks/useMarketMakerWagers";
import { useWeb3 } from "../../src/providers/Web3Provider";
import { LoadingScreen, Card } from "../../src/components";
import { colors, spacing, fontSize } from "../../src/theme";
import {
  formatUnits,
  priceToNumber,
  computeMarketMakerPnL,
  truncateAddress,
} from "../../src/utils/format";

/**
 * Market Maker Wager List Page
 * ----------------------------
 * Shows all wagers the connected wallet has as a market maker,
 * including latest NO price and PnL for each.
 */
export default function WagerListScreen() {
  const { wagers, loading, refresh } = useMarketMakerWagers();
  const { isConnected, address, oracleContract } = useWeb3();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [latestPrices, setLatestPrices] = useState<
    Record<string, { yesPrice: bigint; noPrice: bigint }>
  >({});

  useEffect(() => {
    async function fetchPrices() {
      if (!oracleContract || wagers.length === 0) return;
      const prices: Record<string, { yesPrice: bigint; noPrice: bigint }> = {};
      for (const w of wagers) {
        try {
          const [yesPrice, noPrice] = await oracleContract.getLatestPrice(
            w.gameId
          );
          prices[w.gameId] = {
            yesPrice: BigInt(yesPrice),
            noPrice: BigInt(noPrice),
          };
        } catch {
          prices[w.gameId] = { yesPrice: 0n, noPrice: 0n };
        }
      }
      setLatestPrices(prices);
    }
    fetchPrices();
  }, [oracleContract, wagers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (!isConnected) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.connectText}>
          Connect your wallet to view your market maker wagers.
        </Text>
      </View>
    );
  }

  if (loading) return <LoadingScreen />;

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
      <Text style={styles.pageTitle}>My Wagers</Text>
      <Text style={styles.subtitle}>
        {address ? truncateAddress(address) : ""} — {wagers.length} open
        wager{wagers.length !== 1 ? "s" : ""}
      </Text>

      {wagers.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            You have no open market maker positions. Buy NO tokens on a game to
            create a wager.
          </Text>
        </Card>
      ) : (
        wagers.map((wager) => {
          const prices = latestPrices[wager.gameId];
          const currentNo = prices?.noPrice ?? 0n;
          const pnl = computeMarketMakerPnL(
            wager.noTokens,
            wager.averagePrice,
            currentNo
          );

          return (
            <TouchableOpacity
              key={wager.gameId}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/wagers/[gameId]",
                  params: { gameId: wager.gameId },
                })
              }
            >
              <Card style={styles.wagerCard}>
                <View style={styles.wagerHeader}>
                  <Text style={styles.gameIdText}>
                    Game: {wager.gameId.slice(0, 10)}...
                  </Text>
                  <Text
                    style={[
                      styles.pnlText,
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
                    {pnl.toFixed(4)} USDC
                  </Text>
                </View>

                <View style={styles.wagerStats}>
                  <View style={styles.wagerStat}>
                    <Text style={styles.wagerStatLabel}>NO Tokens</Text>
                    <Text style={styles.wagerStatValue}>
                      {Number(formatUnits(wager.noTokens)).toFixed(4)}
                    </Text>
                  </View>
                  <View style={styles.wagerStat}>
                    <Text style={styles.wagerStatLabel}>Avg Price</Text>
                    <Text style={styles.wagerStatValue}>
                      ${priceToNumber(wager.averagePrice).toFixed(4)}
                    </Text>
                  </View>
                  <View style={styles.wagerStat}>
                    <Text style={styles.wagerStatLabel}>Current NO</Text>
                    <Text style={styles.wagerStatValue}>
                      ${priceToNumber(currentNo).toFixed(4)}
                    </Text>
                  </View>
                </View>
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
  centeredContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  connectText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    textAlign: "center",
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
  wagerCard: {
    gap: spacing.sm,
  },
  wagerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gameIdText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  pnlText: {
    fontSize: fontSize.lg,
    fontWeight: "800",
  },
  wagerStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  wagerStat: {
    flex: 1,
  },
  wagerStatLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
  },
  wagerStatValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "700",
    marginTop: 2,
  },
});
