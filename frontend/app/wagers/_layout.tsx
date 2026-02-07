import React from "react";
import { Stack } from "expo-router";
import { colors } from "../../src/theme";

export default function WagersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[gameId]" />
    </Stack>
  );
}
