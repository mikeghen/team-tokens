import "@walletconnect/react-native-compat";

import { createAppKit } from "@reown/appkit-react-native";
import { EthersAdapter } from "@reown/appkit-ethers-react-native";
import { mainnet } from "viem/chains";
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

export const appKit = createAppKit({
  projectId: REOWN_PROJECT_ID,
  metadata,
  networks: [mainnet],
  adapters: [ethersAdapter],
});
