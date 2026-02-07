// Contract addresses – replace with your deployed addresses
export const CONTRACTS = {
  ORACLE: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  TEAM_VAULT: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`, // Mainnet USDC
};

import Constants from "expo-constants";

// Reown (WalletConnect) project ID – set via environment variable (do NOT commit secrets)
// At runtime this reads from `app.config.js` extra values or `process.env.REOWN_PROJECT_ID`
export const REOWN_PROJECT_ID =
  (Constants.expoConfig?.extra?.REOWN_PROJECT_ID as string) ??
  process.env.REOWN_PROJECT_ID ??
  "";

// Chain
export const CHAIN_ID = 1; // Ethereum Mainnet

// Team configuration
export const TEAM_SYMBOL = "PHI";
export const TEAM_NAME = "Philadelphia Basketball Team";

// Game slugs used in the tests
export const GAME_SLUGS = [
  "nba-phi-dal-2026-01-31",
  "nba-phi-nyk-2026-02-02",
];

// Formatting constants
export const USDC_DECIMALS = 18; // In the contract, USDC uses 18 decimals (ERC20Mock)
export const PRICE_DECIMALS = 18;
