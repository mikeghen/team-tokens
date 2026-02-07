import React, { useState, useCallback } from "react";
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
import { useGameData } from "../../src/hooks/useGameData";
import { useWeb3 } from "../../src/providers/Web3Provider";
import {
  PriceChart,
  Card,
  StatBox,
  Button,
  LoadingScreen,
} from "../../src/components";
import { colors, spacing, fontSize, borderRadius } from "../../src/theme";
import {
  formatUSDC,
  formatUnits,
  priceToNumber,
  formatDate,
  formatDateTime,
  getGameStatus,
  parseUnits,
} from "../../src/utils/format";
import { CONTRACTS } from "../../src/config/constants";

/**
 * Game View Page
 * ---------------
 * Shows price history chart from Oracle observations, vault wager info,
 * and an option for the connected account to buy NO tokens.
 */
export default function GameViewScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const { gameData, vaultWager, gameInfo, loading, refresh } = useGameData(
    gameId ?? ""
  );
  const {
    isConnected,
    signedVaultContract,
    signedUsdcContract,
  } = useWeb3();

  const [buyAmount, setBuyAmount] = useState("");
  const [buying, setBuying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleBuy = useCallback(async () => {
    if (!signedVaultContract || !signedUsdcContract || !gameId) return;
    const amount = buyAmount.trim();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Invalid Amount", "Enter a valid USDC amount.");
      return;
    }

    try {
      setBuying(true);
      const amountBN = parseUnits(amount, 18);

      // Approve USDC spend
      const approveTx = await signedUsdcContract.approve(
        CONTRACTS.TEAM_VAULT,
        amountBN
      );
      await approveTx.wait();

      // Buy NO tokens (isYes = false, minShares = 0)
      const buyTx = await signedVaultContract.buy(
        gameId,
        amountBN,
        false,
        0
      );
      await buyTx.wait();

      Alert.alert("Success", `Purchased NO tokens with ${amount} USDC`);
      setBuyAmount("");
      await refresh();
    } catch (err: any) {
      console.error("Buy error:", err);
      Alert.alert("Transaction Failed", err?.reason || err?.message || "Unknown error");
    } finally {
      setBuying(false);
    }
  }, [signedVaultContract, signedUsdcContract, gameId, buyAmount, refresh]);

  if (loading || !gameData || !gameInfo) return <LoadingScreen />;

  const status = getGameStatus(gameData.gameTime);
  const observations = gameData.observations;

  // Build chart data from observations
  const yesPriceChart = observations.map((obs) => ({
    label: formatDateTime(obs.timestamp),
    value: priceToNumber(obs.yesPrice),
  }));

  const noPriceChart = observations.map((obs) => ({
    label: formatDateTime(obs.timestamp),
    value: priceToNumber(obs.noPrice),
  }));

  const latestYes =
    observations.length > 0
      ? priceToNumber(observations[observations.length - 1].yesPrice)
      : 0;
  const latestNo =
    observations.length > 0
      ? priceToNumber(observations[observations.length - 1].noPrice)
      : 0;

  const canBuy = status !== "ended" && isConnected;

  // Available for sale calculation
  const noTokensSold = vaultWager ? vaultWager.noTokensSold : 0n;
  const usdcBet = vaultWager ? vaultWager.usdcAmountForBet : 0n;
  const avgNoPrice = vaultWager ? vaultWager.averageNoPrice : 0n;

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
        title="← Back to Games"
        onPress={() => router.back()}
        variant="secondary"
        style={styles.backButton}
      />

      {/* Game header */}
      <View style={styles.gameHeader}>
        <Text style={styles.teamsText}>
          {gameData.homeTeam} vs {gameData.awayTeam}
        </Text>
        <Text style={styles.dateText}>{formatDate(gameData.gameTime)}</Text>
        <Text style={styles.slugText}>{gameData.polymarket_slug}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                (status === "live"
                  ? colors.success
                  : status === "ended"
                    ? colors.textMuted
                    : colors.warning) + "22",
            },
          ]}
        >
          <Text
            style={[
              styles.statusLabel,
              {
                color:
                  status === "live"
                    ? colors.success
                    : status === "ended"
                      ? colors.textMuted
                      : colors.warning,
              },
            ]}
          >
            {status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Price Charts */}
      <PriceChart
        data={yesPriceChart}
        title="YES Price History"
        color={colors.success}
        height={200}
      />
      <PriceChart
        data={noPriceChart}
        title="NO Price History"
        color={colors.error}
        height={200}
      />

      {/* Current prices */}
      <Card>
        <View style={styles.priceRow}>
          <StatBox
            label="YES Price"
            value={`$${latestYes.toFixed(4)}`}
            color={colors.success}
          />
          <StatBox
            label="NO Price"
            value={`$${latestNo.toFixed(4)}`}
            color={colors.error}
          />
        </View>
      </Card>

      {/* Vault Wager Info */}
      <Card title="Vault Wager">
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>USDC Allocated</Text>
          <Text style={styles.infoValue}>{formatUSDC(usdcBet)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>NO Tokens Sold</Text>
          <Text style={styles.infoValue}>
            {Number(formatUnits(noTokensSold)).toFixed(4)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Avg NO Price</Text>
          <Text style={styles.infoValue}>
            ${priceToNumber(avgNoPrice).toFixed(4)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Team Side</Text>
          <Text style={styles.infoValue}>
            {gameInfo.isHomeTeam ? "Home" : "Away"}
          </Text>
        </View>
      </Card>

      {/* Buy NO Section */}
      <Card title="Buy NO Tokens">
        {canBuy ? (
          <>
            <Text style={styles.buyDescription}>
              Purchase NO tokens for this game. You are betting against the
              vault's team winning. If the team loses, you can redeem your NO
              tokens 1:1 for USDC.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="USDC Amount"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={buyAmount}
                onChangeText={setBuyAmount}
              />
              <Button
                title="Buy NO"
                onPress={handleBuy}
                loading={buying}
                disabled={!buyAmount || buying}
                variant="danger"
                style={styles.buyButton}
              />
            </View>
            {buyAmount && latestNo > 0 ? (
              <Text style={styles.estimateText}>
                Est. NO tokens: ~
                {(Number(buyAmount) / latestNo).toFixed(4)}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.disabledText}>
            {status === "ended"
              ? "This game has ended. No more purchases."
              : "Connect your wallet to buy NO tokens."}
          </Text>
        )}
      </Card>

      {/* Observations table */}
      <Card title={`Price Observations (${observations.length})`}>
        {observations.length === 0 ? (
          <Text style={styles.disabledText}>
            No price observations recorded yet.
          </Text>
        ) : (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>
                Time
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>
                YES
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>
                NO
              </Text>
            </View>
            {observations.slice(-20).map((obs, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableCell}>
                  {formatDateTime(obs.timestamp)}
                </Text>
                <Text style={[styles.tableCell, { color: colors.success }]}>
                  {priceToNumber(obs.yesPrice).toFixed(4)}
                </Text>
                <Text style={[styles.tableCell, { color: colors.error }]}>
                  {priceToNumber(obs.noPrice).toFixed(4)}
                </Text>
              </View>
            ))}
          </>
        )}
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
  backButton: {
    alignSelf: "flex-start",
  },
  gameHeader: {
    gap: spacing.xs,
    alignItems: "center",
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
  slugText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: "monospace",
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  statusLabel: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: "row",
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
  buyDescription: {
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
  buyButton: {
    minWidth: 100,
  },
  estimateText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  disabledText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  tableCell: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
  },
  tableCellHeader: {
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: fontSize.xs,
  },
});
