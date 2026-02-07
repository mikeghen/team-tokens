import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react";
import { ethers } from "ethers";
import { useAccount, useAppKit, useProvider } from "@reown/appkit-react-native";
import { CONTRACTS } from "../config/constants";
import { TeamVaultABI } from "../abi/TeamVaultABI";
import { OracleABI } from "../abi/OracleABI";
import { ERC20ABI } from "../abi/ERC20ABI";

// ------------------------------------------------------------------
//  Types
// ------------------------------------------------------------------

interface Web3ContextType {
  // Connection state
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;

  // Connections
  connect: () => Promise<void>;
  disconnect: () => void;

  // Contract instances (read-only, backed by a public provider)
  oracleContract: ethers.Contract | null;
  vaultContract: ethers.Contract | null;
  usdcContract: ethers.Contract | null;

  // Signed contract instances (backed by the connected wallet signer)
  signedVaultContract: ethers.Contract | null;
  signedUsdcContract: ethers.Contract | null;
}

const Web3Context = createContext<Web3ContextType>({
  isConnected: false,
  address: null,
  chainId: null,
  provider: null,
  signer: null,
  connect: async () => {},
  disconnect: () => {},
  oracleContract: null,
  vaultContract: null,
  usdcContract: null,
  signedVaultContract: null,
  signedUsdcContract: null,
});

export const useWeb3 = () => useContext(Web3Context);

// ------------------------------------------------------------------
//  Read-only provider (always available, even without wallet)
// ------------------------------------------------------------------

function getReadOnlyProvider(): ethers.JsonRpcProvider {
  // Default to a public Ethereum RPC. Replace with your own for production.
  return new ethers.JsonRpcProvider("https://eth.llamarpc.com");
}

// ------------------------------------------------------------------
//  Provider component
// ------------------------------------------------------------------

interface Props {
  children: ReactNode;
}

export function Web3Provider({ children }: Props) {
  const { isConnected, address, chainId } = useAccount();
  const { open, disconnect } = useAppKit();
  const appKitProvider = useProvider();
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  // Read-only contracts (always available)
  const readProvider = useMemo(() => getReadOnlyProvider(), []);
  const oracleContract = useMemo(
    () => new ethers.Contract(CONTRACTS.ORACLE, OracleABI, readProvider),
    [readProvider]
  );
  const vaultContract = useMemo(
    () => new ethers.Contract(CONTRACTS.TEAM_VAULT, TeamVaultABI, readProvider),
    [readProvider]
  );
  const usdcContract = useMemo(
    () => new ethers.Contract(CONTRACTS.USDC, ERC20ABI, readProvider),
    [readProvider]
  );

  // Signed contracts (available when wallet is connected)
  const [signedVaultContract, setSignedVaultContract] = useState<ethers.Contract | null>(null);
  const [signedUsdcContract, setSignedUsdcContract] = useState<ethers.Contract | null>(null);

  const connect = useCallback(async () => {
    try {
      await open();
    } catch (err) {
      console.error("AppKit open failed:", err);
    }
  }, [open]);

  useEffect(() => {
    async function updateSigner() {
      if (!appKitProvider || !isConnected) {
        setProvider(null);
        setSigner(null);
        setSignedVaultContract(null);
        setSignedUsdcContract(null);
        return;
      }

      try {
        const browserProvider = new ethers.BrowserProvider(appKitProvider as any);
        const walletSigner = await browserProvider.getSigner();
        setProvider(browserProvider);
        setSigner(walletSigner);

        setSignedVaultContract(
          new ethers.Contract(CONTRACTS.TEAM_VAULT, TeamVaultABI, walletSigner)
        );
        setSignedUsdcContract(
          new ethers.Contract(CONTRACTS.USDC, ERC20ABI, walletSigner)
        );
      } catch (err) {
        console.error("Signer update failed:", err);
      }
    }

    updateSigner();
  }, [appKitProvider, isConnected]);

  return (
    <Web3Context.Provider
      value={{
        isConnected,
        address: address ?? null,
        chainId: chainId ?? null,
        provider,
        signer,
        connect,
        disconnect,
        oracleContract,
        vaultContract,
        usdcContract,
        signedVaultContract,
        signedUsdcContract,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}
