import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useSharePrice } from "../src/hooks/useSharePrice";
import { useWeb3 } from "../src/providers/Web3Provider";
import { PriceChart, Card, StatBox, LoadingScreen } from "../src/components";
import { colors, spacing, fontSize } from "../src/theme";
import { formatUSD, formatUnits, truncateAddress } from "../src/utils/format";
import { TEAM_SYMBOL, TEAM_NAME, CONTRACTS } from "../src/config/constants";

/**
 * Home Page
 * ---------
 * Landing page showing the TeamVault share price and key stats.
 * Displays a chart of the share price over time and the vault's high-level numbers.
 */
export default function HomeScreen() {
  const { priceNumber, loading, refresh } = useSharePrice();
  const { vaultContract, isConnected, address } = useWeb3();

  const [totalSupply, setTotalSupply] = useState<bigint>(0n);
  const [userBalance, setUserBalance] = useState<bigint>(0n);
  const [gameCount, setGameCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Mock historical share prices for the chart (in production, fetch from events or an indexer)
  const [chartData, setChartData] = useState<
    { label: string; value: number }[]
  >([]);

  useEffect(() => {
    async function fetchStats() {
      if (!vaultContract) return;
      try {
        const supply = await vaultContract.totalSupply();
        setTotalSupply(BigInt(supply));

        const gameIds = await vaultContract.getRegisteredGameIds();
        setGameCount(gameIds.length);

        if (isConnected && address) {
          const bal = await vaultContract.balanceOf(address);
          setUserBalance(BigInt(bal));
        }

        // Generate sample chart data for display purposes.
        // In production, this would come from historical share price snapshots.
        const samplePrices = [
          1.0, 1.01, 1.02, 1.015, 1.03, 1.025, 1.04, 1.035, 1.05, 1.06,
          1.055, 1.07, 1.065, 1.08, priceNumber,
        ];
        setChartData(
          samplePrices.map((v, i) => ({
            label: `Day ${i + 1}`,
            value: v,
          }))
        );
      } catch (err) {
        console.error("Home stats error:", err);
      }
    }
    fetchStats();
  }, [vaultContract, isConnected, address, priceNumber]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const latestPrice = priceNumber;
  const previousPrice =
    chartData.length > 1 ? chartData[chartData.length - 2].value : priceNumber;
  const priceChange = latestPrice - previousPrice;
  const priceChangePct = previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0;
  const priceChangePrefix = priceChange > 0 ? "+" : priceChange < 0 ? "-" : "";
  const priceChangeValue = `${priceChangePrefix}${formatUSD(Math.abs(priceChange))}`;
  const priceChangePctValue = `${priceChangePrefix}${Math.abs(priceChangePct).toFixed(2)}%`;
  const priceChangeColor = priceChange > 0 ? colors.success : priceChange < 0 ? colors.error : colors.text;

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.teamSymbol}>{TEAM_SYMBOL}</Text>
        <Text style={styles.teamName}>{TEAM_NAME}</Text>
        <Text style={styles.sharePrice}>{formatUSD(priceNumber)}</Text>
        <Text style={styles.sharePriceLabel}>Share Price</Text>
      </View>

      {/* User Info */}
      {isConnected && address ? (
        <Card title="Your Position" style={styles.positionCard}>
          <View style={styles.positionRow}>
            <Text style={styles.positionLabel}>Wallet</Text>
            <Text style={styles.positionValue}>
              {truncateAddress(address)}
            </Text>
          </View>
          <View style={styles.positionRow}>
            <Text style={styles.positionLabel}>Vault Shares</Text>
            <Text style={styles.positionValue}>
              {Number(formatUnits(userBalance)).toFixed(4)}
            </Text>
          </View>
          <View style={styles.positionRow}>
            <Text style={styles.positionLabel}>Value (est.)</Text>
            <Text style={[styles.positionValue, { color: colors.accent }]}>
              {formatUSD(
                Number(formatUnits(userBalance)) * priceNumber
              )}
            </Text>
          </View>
          <View style={styles.positionRow}>
            <Text style={styles.positionLabel}>Current Share Price</Text>
            <Text style={styles.positionValue}>{formatUSD(priceNumber)}</Text>
          </View>
          <View style={[styles.positionRow, styles.positionRowLast]}>
            <Text style={styles.positionLabel}>24h Change</Text>
            <Text style={[styles.positionValue, { color: priceChangeColor }]}>
              {priceChangeValue} ({priceChangePctValue})
            </Text>
          </View>
        </Card>
      ) : (
        <Card style={styles.connectPrompt}>
          <Text style={styles.connectText}>
            Connect your wallet to view your position and interact with the
            vault.
          </Text>
        </Card>
      )}

      {/* Chart */}
      <PriceChart
        data={chartData}
        title="Share Price History"
        yLabel="USD"
        height={220}
        color={colors.accent}
      />

      {/* Stats Row */}
      <Card style={styles.statsCard}>
        <View style={styles.statsRow}>
          <StatBox label="Total Supply" value={formatUnits(totalSupply)} />
          <StatBox label="Games" value={String(gameCount)} />
          <StatBox
            label="Share Price"
            value={formatUSD(priceNumber)}
            color={colors.accent}
          />
        </View>
      </Card>

      {/* Contract Info */}
      <Card title="Contract Details" style={styles.contractCard}>
        <View style={styles.positionRow}>
          <Text style={styles.positionLabel}>Vault</Text>
          <Text style={styles.addressText}>
            {truncateAddress(CONTRACTS.TEAM_VAULT)}
          </Text>
        </View>
        <View style={styles.positionRow}>
          <Text style={styles.positionLabel}>Oracle</Text>
          <Text style={styles.addressText}>
            {truncateAddress(CONTRACTS.ORACLE)}
          </Text>
        </View>
        <View style={styles.positionRow}>
          <Text style={styles.positionLabel}>USDC</Text>
          <Text style={styles.addressText}>
            {truncateAddress(CONTRACTS.USDC)}
          </Text>
        </View>
      </Card>
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
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  teamSymbol: {
    fontSize: fontSize.hero,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: 4,
  },
  teamName: {
    fontSize: fontSize.md,
    color: colors.primaryLight,
    marginTop: spacing.xs,
  },
  sharePrice: {
    fontSize: 48,
    fontWeight: "900",
    color: colors.text,
    marginTop: spacing.lg,
  },
  sharePriceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  statsCard: {
    marginTop: 0,
  },
  statsRow: {
    flexDirection: "row",
  },
  positionCard: {
    marginTop: 0,
  },
  positionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  positionRowLast: {
    borderBottomWidth: 0,
  },
  positionLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  positionValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  connectPrompt: {
    alignItems: "center",
  },
  connectText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: "center",
  },
  contractCard: {
    marginTop: 0,
  },
  addressText: {
    color: colors.primaryLight,
    fontSize: fontSize.md,
    fontFamily: "monospace",
  },
});
