import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../providers/Web3Provider";
import { priceToNumber } from "../utils/format";

/**
 * Hook to read the current share price of the TeamVault.
 */
export function useSharePrice() {
  const { vaultContract } = useWeb3();
  const [price, setPrice] = useState<bigint>(BigInt(1e18));
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!vaultContract) return;
    try {
      setLoading(true);
      const sharePrice: bigint = await vaultContract.getSharePrice();
      setPrice(sharePrice);
    } catch (err) {
      console.error("useSharePrice error:", err);
    } finally {
      setLoading(false);
    }
  }, [vaultContract]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { price, priceNumber: priceToNumber(price), loading, refresh };
}
