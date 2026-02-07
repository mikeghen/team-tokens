import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../providers/Web3Provider";
import type { MarketMakerWager } from "../types";

/**
 * Hook to fetch the connected wallet's market maker wagers across all registered games.
 */
export function useMarketMakerWagers() {
  const { vaultContract, address, isConnected } = useWeb3();
  const [wagers, setWagers] = useState<MarketMakerWager[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!vaultContract || !isConnected || !address) {
      setWagers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const gameIds: string[] = await vaultContract.getRegisteredGameIds();

      if (gameIds.length === 0) {
        setWagers([]);
        setLoading(false);
        return;
      }

      const rawWagers = await vaultContract.getMarketMakerWagers(
        address,
        gameIds
      );

      const items: MarketMakerWager[] = [];
      for (let i = 0; i < gameIds.length; i++) {
        const noTokens = BigInt(rawWagers[i].noTokens);
        if (noTokens > 0n) {
          items.push({
            gameId: gameIds[i],
            noTokens,
            averagePrice: BigInt(rawWagers[i].averagePrice),
          });
        }
      }

      setWagers(items);
    } catch (err) {
      console.error("useMarketMakerWagers error:", err);
    } finally {
      setLoading(false);
    }
  }, [vaultContract, address, isConnected]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { wagers, loading, refresh };
}
