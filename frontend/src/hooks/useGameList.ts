import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../providers/Web3Provider";
import type { GameListItem } from "../types";

/**
 * Hook to fetch all registered games and their vault wagers.
 */
export function useGameList() {
  const { vaultContract, oracleContract } = useWeb3();
  const [games, setGames] = useState<GameListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!vaultContract || !oracleContract) return;
    try {
      setLoading(true);
      const gameIds: string[] = await vaultContract.getRegisteredGameIds();

      const items: GameListItem[] = [];

      for (const gameId of gameIds) {
        try {
          // Fetch game data from oracle
          const gameData = await oracleContract.getGameData(gameId);

          // Fetch vault wager
          const [usdcAmountForBet, noTokensSold, averageNoPrice] =
            await vaultContract.vaultWagers(gameId);

          // Fetch game info from vault
          const [gameTime, , isHomeTeam] =
            await vaultContract.gameInfo(gameId);

          // Get latest price
          let latestYesPrice = 0n;
          let latestNoPrice = 0n;
          try {
            [latestYesPrice, latestNoPrice] =
              await oracleContract.getLatestPrice(gameId);
          } catch {
            // No price observations yet
          }

          // Count market makers
          let marketMakerCount = 0;
          try {
            const makers: string[] =
              await vaultContract.getGameMarketMakers(gameId);
            marketMakerCount = makers.length;
          } catch {
            // No makers yet
          }

          items.push({
            gameId,
            slug: gameData.polymarket_slug,
            homeTeam: gameData.homeTeam,
            awayTeam: gameData.awayTeam,
            gameTime: Number(gameTime),
            isHomeTeam,
            vaultWager: {
              gameId,
              usdcAmountForBet: BigInt(usdcAmountForBet),
              noTokensSold: BigInt(noTokensSold),
              averageNoPrice: BigInt(averageNoPrice),
            },
            latestYesPrice: BigInt(latestYesPrice),
            latestNoPrice: BigInt(latestNoPrice),
            marketMakerCount,
          });
        } catch (err) {
          console.error(`Error fetching game ${gameId}:`, err);
        }
      }

      setGames(items);
    } catch (err) {
      console.error("useGameList error:", err);
    } finally {
      setLoading(false);
    }
  }, [vaultContract, oracleContract]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { games, loading, refresh };
}
