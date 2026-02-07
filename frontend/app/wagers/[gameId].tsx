import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useWeb3 } from "../../src/providers/Web3Provider";
import { useGameData } from "../../src/hooks/useGameData";
import {
  PriceChart,
  Card,
  Button,
  LoadingScreen,
} from "../../src/components";
import { colors, spacing, fontSize, borderRadius } from "../../src/theme";
import {
  formatUnits,
  priceToNumber,
  formatDate,
  formatDateTime,
  computeMarketMakerPnL,
  parseUnits,
  getGameStatus,
} from "../../src/utils/format";
import type { MarketMakerWager } from "../../src/types";

/**
 * Market Maker Wager View Page
 * ----------------------------
 * Shows details for a specific wager made by the connected market maker.
 * Includes a Redeem button to claim USDC if the team lost.
 */
export default function WagerViewScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const {
    isConnected,
    address,
    vaultContract,
    signedVaultContract,
    oracleContract,
  } = useWeb3();
  const { gameData, gameInfo, loading: gameLoading, refresh: refreshGame } =
    useGameData(gameId ?? "");

  const [wager, setWager] = useState<MarketMakerWager | null>(null);
  const [currentNoPrice, setCurrentNoPrice] = useState(0n);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchWager = useCallback(async () => {
    if (!vaultContract || !address || !gameId || !oracleContract) return;
    try {
      setLoading(true);

      const [noTokens, averagePrice] = await vaultContract.marketMakerWagers(
        gameId,
        address
      );

      setWager({
        gameId,
        noTokens: BigInt(noTokens),
        averagePrice: BigInt(averagePrice),
      });

      try {
        const [, noPrice] = await oracleContract.getLatestPrice(gameId);
        setCurrentNoPrice(BigInt(noPrice));
      } catch {
        setCurrentNoPrice(0n);
      }
    } catch (err) {
      console.error("fetchWager error:", err);
    } finally {
      setLoading(false);
    }
  }, [vaultContract, address, gameId, oracleContract]);

  useEffect(() => {
    fetchWager();
  }, [fetchWager]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchWager(), refreshGame()]);
    setRefreshing(false);
  };

  const handleRedeem = useCallback(async () => {
    if (!signedVaultContract || !gameId || !wager) return;

    const amount = redeemAmount.trim();
    let redeemShares: bigint;

    if (!amount || amount === "max") {
      redeemShares = wager.noTokens;
    } else {
      redeemShares = parseUnits(amount, 18);
    }

    if (redeemShares <= 0n) {
      Alert.alert("Invalid Amount", "Enter a valid number of NO tokens to redeem.");
      return;
    }

    if (redeemShares > wager.noTokens) {
      Alert.alert("Insufficient Tokens", "You don't have that many NO tokens.");
      return;
    }

    try {
      setRedeeming(true);
      const tx = await signedVaultContract.redeem(gameId, redeemShares, 0);
      await tx.wait();

      Alert.alert(
        "Redeemed",
        `Successfully redeemed ${Number(formatUnits(redeemShares)).toFixed(4)} NO tokens for USDC.`
      );
      setRedeemAmount("");
      await fetchWager();
    } catch (err: any) {
      console.error("Redeem error:", err);
      Alert.alert(
        "Redemption Failed",
        err?.reason || err?.message || "Unknown error"
      );
    } finally {
      setRedeeming(false);
    }
  }, [signedVaultContract, gameId, wager, redeemAmount, fetchWager]);

  if (!isConnected || !address) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.connectText}>
          Connect your wallet to view wager details.
        </Text>
      </View>
    );
  }

  if (loading || gameLoading || !gameData || !gameInfo) return <LoadingScreen />;

  const status = getGameStatus(gameData.gameTime);
  const noTokens = wager?.noTokens ?? 0n;
  const avgPrice = wager?.averagePrice ?? 0n;
  const pnl = computeMarketMakerPnL(noTokens, avgPrice, currentNoPrice);

  // Build NO price chart from observations
  const noPriceChart = gameData.observations.map((obs) => ({
    label: formatDateTime(obs.timestamp),
    value: priceToNumber(obs.noPrice),
  }));

  // Can redeem only if game ended and team lost (i.e., NO tokens are redeemable)
  const gameEnded = status === "ended";
  const teamWon = gameData.homeWin === gameInfo.isHomeTeam;
  const canRedeem = gameEnded && !teamWon && noTokens > 0n && isConnected;

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
      {/* Back button */}
      <Button
        title="← Back to Wagers"
        onPress={() => router.back()}
        variant="secondary"
        style={styles.backButton}
      />

      {/* Game info header */}
      <View style={styles.gameHeader}>
        <Text style={styles.teamsText}>
          {gameData.homeTeam} vs {gameData.awayTeam}
        </Text>
        <Text style={styles.dateText}>{formatDate(gameData.gameTime)}</Text>
      </View>

      {/* NO price chart */}
      <PriceChart
        data={noPriceChart}
        title="NO Price History"
        color={colors.error}
        height={200}
      />

      {/* Wager details */}
      <Card title="Your Wager">
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>NO Tokens</Text>
          <Text style={styles.infoValue}>
            {Number(formatUnits(noTokens)).toFixed(4)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Avg Entry Price</Text>
          <Text style={styles.infoValue}>
            ${priceToNumber(avgPrice).toFixed(4)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Current NO Price</Text>
          <Text style={styles.infoValue}>
            ${priceToNumber(currentNoPrice).toFixed(4)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Cost Basis</Text>
          <Text style={styles.infoValue}>
            {Number(formatUnits((noTokens * avgPrice) / BigInt(1e18))).toFixed(4)}{" "}
            USDC
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Current Value</Text>
          <Text style={styles.infoValue}>
            {Number(
              formatUnits((noTokens * currentNoPrice) / BigInt(1e18))
            ).toFixed(4)}{" "}
            USDC
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Unrealized PnL</Text>
          <Text
            style={[
              styles.infoValue,
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
      </Card>

      {/* Redeem section */}
      <Card title="Redeem NO Tokens">
        {canRedeem ? (
          <>
            <Text style={styles.redeemDescription}>
              The team lost this game. You can redeem your NO tokens 1:1 for
              USDC from the vault.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder={`Max: ${Number(formatUnits(noTokens)).toFixed(4)}`}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={redeemAmount}
                onChangeText={setRedeemAmount}
              />
              <Button
                title="Redeem"
                onPress={handleRedeem}
                loading={redeeming}
                disabled={redeeming}
                variant="primary"
                style={styles.redeemButton}
              />
            </View>
            <Button
              title="Redeem All"
              onPress={() => {
                setRedeemAmount("max");
                handleRedeem();
              }}
              variant="secondary"
              style={styles.redeemAllButton}
              disabled={redeeming}
            />
          </>
        ) : (
          <Text style={styles.disabledText}>
            {!gameEnded
              ? "Redemption is available after the game ends."
              : teamWon
                ? "The team won — NO tokens are not redeemable."
                : noTokens === 0n
                  ? "You have no NO tokens for this game."
                  : "Connect your wallet to redeem."}
          </Text>
        )}
      </Card>

      {/* Game result if ended */}
      {gameEnded ? (
        <Card title="Game Result">
          <View style={styles.resultRow}>
            <Text style={styles.infoLabel}>Outcome</Text>
            <Text
              style={[
                styles.infoValue,
                { color: teamWon ? colors.success : colors.error },
              ]}
            >
              {teamWon ? "Team Won" : "Team Lost"}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.infoLabel}>NO Tokens Redeemable</Text>
            <Text style={styles.infoValue}>{teamWon ? "No" : "Yes"}</Text>
          </View>
        </Card>
      ) : null}
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
  backButton: {
    alignSelf: "flex-start",
  },
  gameHeader: {
    alignItems: "center",
    gap: spacing.xs,
  },
  teamsText: {
    fontSize: fontSize.xxl,
    fontWeight: "900",
    color: colors.text,
  },
  dateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  infoValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  redeemDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  redeemButton: {
    minWidth: 100,
  },
  redeemAllButton: {
    marginTop: spacing.sm,
  },
  disabledText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
