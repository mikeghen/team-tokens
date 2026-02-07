import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../providers/Web3Provider";
import type { GameData, GameDataObservation } from "../types";

/**
 * Hook to fetch full game data from the Oracle, including price observations.
 */
export function useGameData(gameId: string) {
  const { oracleContract, vaultContract } = useWeb3();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [vaultWager, setVaultWager] = useState<{
    usdcAmountForBet: bigint;
    noTokensSold: bigint;
    averageNoPrice: bigint;
  } | null>(null);
  const [gameInfo, setGameInfo] = useState<{
    gameTime: number;
    isRegistered: boolean;
    isHomeTeam: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!oracleContract || !vaultContract || !gameId) return;
    try {
      setLoading(true);

      const data = await oracleContract.getGameData(gameId);
      const observations: GameDataObservation[] = data.observations.map(
        (obs: any) => ({
          timestamp: Number(obs.timestamp),
          yesPrice: BigInt(obs.yesPrice),
          noPrice: BigInt(obs.noPrice),
        })
      );

      setGameData({
        polymarket_slug: data.polymarket_slug,
        homeTeam: data.homeTeam,
        awayTeam: data.awayTeam,
        gameTime: Number(data.gameTime),
        homeWin: data.homeWin,
        observations,
      });

      const [usdcAmountForBet, noTokensSold, averageNoPrice] =
        await vaultContract.vaultWagers(gameId);
      setVaultWager({
        usdcAmountForBet: BigInt(usdcAmountForBet),
        noTokensSold: BigInt(noTokensSold),
        averageNoPrice: BigInt(averageNoPrice),
      });

      const [gameTime, isRegistered, isHomeTeam] =
        await vaultContract.gameInfo(gameId);
      setGameInfo({
        gameTime: Number(gameTime),
        isRegistered,
        isHomeTeam,
      });
    } catch (err) {
      console.error("useGameData error:", err);
    } finally {
      setLoading(false);
    }
  }, [oracleContract, vaultContract, gameId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { gameData, vaultWager, gameInfo, loading, refresh };
}
