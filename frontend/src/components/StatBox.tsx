import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, fontSize } from "../theme";

interface StatBoxProps {
  label: string;
  value: string;
  color?: string;
}

export function StatBox({ label, value, color = colors.text }: StatBoxProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
});
