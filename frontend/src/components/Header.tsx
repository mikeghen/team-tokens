import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, fontSize } from "../theme";
import { useWeb3 } from "../providers/Web3Provider";
import { truncateAddress } from "../utils/format";

export function Header() {
  const { address, disconnect } = useWeb3();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: spacing.md + insets.top }]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Unexpected </Text>
        <Text style={styles.titleAccent}>Sports</Text>
      </View>
      <View style={styles.accountRow}>
        <Text style={styles.addressText}>
          {truncateAddress(address ?? "")}
        </Text>
          <TouchableOpacity onPress={() => disconnect()} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: "900",
  },
  titleAccent: {
    color: colors.success,
    fontSize: fontSize.xxl,
    fontWeight: "900",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  addressText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: "monospace",
  },
  logoutButton: {
    padding: spacing.xs,
  },
});
