import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAccount, AccountButton, ConnectButton } from "@reown/appkit-react-native";
import { colors, spacing, fontSize } from "../theme";

export function Header() {
  const { isConnected } = useAccount();

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>Unexpected Sports</Text>
        <Text style={styles.subtitle}>PHI Team Vault</Text>
      </View>

      {isConnected ? (
        <AccountButton />
      ) : (
        <ConnectButton />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
