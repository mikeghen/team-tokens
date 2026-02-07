import { ethers } from "ethers";

/**
 * Format a bigint value from 1e18 fixed point to a human-readable decimal string.
 */
export function formatUnits(value: bigint, decimals: number = 18): string {
  return ethers.formatUnits(value, decimals);
}

/**
 * Parse a human-readable string into a bigint with given decimals.
 */
export function parseUnits(value: string, decimals: number = 18): bigint {
  return ethers.parseUnits(value, decimals);
}

/**
 * Convert a bigint 1e18 price to a display number (e.g. 0.60).
 */
export function priceToNumber(value: bigint): number {
  return Number(ethers.formatUnits(value, 18));
}

/**
 * Format a number as USD string.
 */
export function formatUSD(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a bigint USDC amount as a USD display value.
 */
export function formatUSDC(value: bigint, decimals: number = 18): string {
  return formatUSD(Number(formatUnits(value, decimals)));
}

/**
 * Truncate an Ethereum address for display.
 */
export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a timestamp into a localized date string.
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a timestamp into a short date+time string.
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Compute the game ID from a slug (keccak256 hash).
 */
export function gameIdFromSlug(slug: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(slug));
}

/**
 * Compute PnL for a vault wager given current NO price.
 * If the team has not won yet, PnL = USDC received from selling NO - current mark-to-market liability.
 */
export function computeVaultPnL(
  usdcSold: bigint,
  noTokensSold: bigint,
  currentNoPrice: bigint
): number {
  if (noTokensSold === 0n) return 0;
  const liability = (noTokensSold * currentNoPrice) / BigInt(1e18);
  const pnl = usdcSold - liability;
  return Number(ethers.formatUnits(pnl, 18));
}

/**
 * Compute PnL for a market maker wager.
 * PnL = (currentNoPrice - averagePrice) * noTokens
 */
export function computeMarketMakerPnL(
  noTokens: bigint,
  averagePrice: bigint,
  currentNoPrice: bigint
): number {
  if (noTokens === 0n) return 0;
  // Value of NO tokens at current price minus cost
  const currentValue = (noTokens * currentNoPrice) / BigInt(1e18);
  const cost = (noTokens * averagePrice) / BigInt(1e18);
  const pnl = currentValue - cost;
  return Number(ethers.formatUnits(pnl, 18));
}

/**
 * Get game status label.
 */
export function getGameStatus(gameTime: number): "upcoming" | "live" | "ended" {
  const now = Math.floor(Date.now() / 1000);
  if (now < gameTime - 3 * 3600) return "upcoming";
  if (now < gameTime + 3 * 3600) return "live";
  return "ended";
}
