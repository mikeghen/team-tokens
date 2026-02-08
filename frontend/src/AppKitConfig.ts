import "@walletconnect/react-native-compat";

import { createAppKit, type Storage } from "@reown/appkit-react-native";
import { EthersAdapter } from "@reown/appkit-ethers-react-native";
import { mainnet } from "viem/chains";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { REOWN_PROJECT_ID } from "./config/constants";

const metadata = {
  name: "Unexpected Sports",
  description: "TeamVault share exposure and NO token market making",
  url: "https://unexpected-sports.app",
  icons: ["https://unexpected-sports.app/icon.png"],
  redirect: {
    native: "unexpected-sports://",
    universal: "https://unexpected-sports.app",
  },
};

const ethersAdapter = new EthersAdapter();

const storage: Storage = {
  async getKeys() {
    return AsyncStorage.getAllKeys();
  },
  async getEntries<T = any>() {
    const keys = await AsyncStorage.getAllKeys();
    const entries = await AsyncStorage.multiGet(keys);
    return entries.map(([key, value]) => [key, parseStorageValue<T>(value)]);
  },
  async getItem<T = any>(key: string) {
    const value = await AsyncStorage.getItem(key);
    return parseStorageValue<T>(value);
  },
  async setItem<T = any>(key: string, value: T) {
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, stringValue);
  },
  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
  },
};

function parseStorageValue<T = any>(value: string | null): T | undefined {
  if (value == null) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
}

export const appKit = createAppKit({
  projectId: REOWN_PROJECT_ID,
  metadata,
  networks: [mainnet],
  adapters: [ethersAdapter],
  storage,
});
