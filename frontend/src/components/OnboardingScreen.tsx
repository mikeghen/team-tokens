import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, fontSize, borderRadius } from "../theme";
import { Button } from "./Button";
import { useWeb3 } from "../providers/Web3Provider";

const FEATURES = [
  {
    emoji: "🏀",
    title: "Season-Long Exposure",
    body: "Deposit USDC, receive shares that track a team's season.",
  },
  {
    emoji: "🤖",
    title: "Automated Betting",
    body: "2% per game, streamed over 48 hours — no manual bets.",
  },
  {
    emoji: "🔗",
    title: "Intent-Based Execution",
    body: "Market makers fill orders on any settlement layer.",
  },
  {
    emoji: "📈",
    title: "On-Chain Oracle",
    body: "Permissionless moneyline data for any contract.",
  },
];

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { connect } = useWeb3();

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Title ---- */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Unexpected </Text>
            <Text style={styles.titleAccent}>Sports</Text>
          </View>
          <Text style={styles.tagline}>
            Set-and-forget NBA betting vaults.
          </Text>
        </View>

        {/* ---- Feature cards ---- */}
        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <View style={styles.featureTextCol}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ---- CTA ---- */}
        <View style={styles.actions}>
          <Text style={styles.ctaText}>
            Create an account to get started
          </Text>
          <Button title="Get Started" onPress={connect} style={styles.ctaButton} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  title: {
    color: colors.text,
    fontSize: fontSize.hero,
    fontWeight: "900",
  },
  titleAccent: {
    color: colors.success,
    fontSize: fontSize.hero,
    fontWeight: "900",
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    marginTop: spacing.sm,
    textAlign: "center",
    lineHeight: 24,
  },

  /* Features */
  features: {
    gap: spacing.md,
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: "flex-start",
  },
  featureEmoji: {
    fontSize: 28,
    marginTop: 2,
  },
  featureTextCol: {
    flex: 1,
    gap: spacing.xs,
  },
  featureTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "800",
  },
  featureBody: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 20,
  },

  /* Actions */
  actions: {
    marginTop: "auto",
    paddingTop: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  ctaText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: "center",
  },
  ctaButton: {
    width: "100%",
  },
});
