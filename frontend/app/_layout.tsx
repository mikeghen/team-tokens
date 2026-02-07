import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppKit, AppKitProvider } from "@reown/appkit-react-native";
import { appKit } from "../src/AppKitConfig";
import { Web3Provider, useWeb3 } from "../src/providers/Web3Provider";
import { Header } from "../src/components/Header";
import { OnboardingScreen } from "../src/components/OnboardingScreen";
import { colors } from "../src/theme";

function AppContent() {
  const { isConnected } = useWeb3();

  if (!isConnected) {
    return <OnboardingScreen />;
  }

  return (
    <>
      <Header />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingBottom: 4,
            height: 56,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="games"
          options={{
            title: "Games",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="basketball-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="wagers"
          options={{
            title: "My Wagers",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <AppKitProvider instance={appKit}>
          <Web3Provider>
            <StatusBar style="light" />
            <AppContent />
            <AppKit />
          </Web3Provider>
        </AppKitProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
