# Unexpected Sports — React Native Frontend

A React Native (Expo) mobile application for interacting with the Unexpected Sports TeamVault and Oracle smart contracts on Ethereum Mainnet. Uses the **Reown SDK** for WalletConnect-based wallet authentication.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| **Node.js** | ≥ 18 | `brew install node` |
| **Xcode** | ≥ 15 | App Store → Xcode (includes iOS Simulator) |
| **Xcode CLI Tools** | — | `xcode-select --install` |
| **CocoaPods** | ≥ 1.14 | `sudo gem install cocoapods` |
| **Watchman** | latest | `brew install watchman` |

> Make sure you accept the Xcode license: `sudo xcodebuild -license accept`

## Quick Start (Mac → iOS Simulator)

```bash
# 1. Clone and navigate to the frontend
cd frontend

# 2. Install JS dependencies
npm install

# 3. Generate the native iOS project (Expo prebuild)
npx expo prebuild --platform ios

# 4. Install CocoaPods dependencies
cd ios && pod install && cd ..

# 5. Start the app on the iOS Simulator
npx expo run:ios
```

This will:
1. Build the native iOS project
2. Launch the iOS Simulator (iPhone 16 by default)
3. Install and open the app

### Alternative: Expo Go (faster iteration, limited native modules)

If you don't need full native builds, you can use Expo Go for quick previewing:

```bash
npm install
npx expo start
```

Then press **i** to open in the iOS Simulator (requires Expo Go installed on the simulator), or scan the QR code with Expo Go on a physical device.

> **Note:** Some native modules (like the Reown SDK native bindings) may not work in Expo Go. Use `npx expo run:ios` for full functionality.

## Configuration

Store secrets and credentials outside source code. Recommended approach (local development + Expo):

1. Create a `.env` in the `frontend/` folder and add your secret (this project already ignores `.env`):

```
REOWN_PROJECT_ID=your_reown_project_id_here
```

2. Add the variable to `app.config.js` so Expo makes it available at runtime (see `app.config.js` in the repo). This file reads `process.env.REOWN_PROJECT_ID` and puts it in `expoConfig.extra`.

3. `src/config/constants.ts` has been updated to read the value from `expoConfig.extra` or `process.env` at runtime. It no longer contains the project ID in source control.

4. Do NOT commit your `.env`. Use `.env.example` (included) to document required variables.

### Production / CI

- For EAS builds: use EAS secrets:

```bash
eas secret:create --name REOWN_PROJECT_ID --value <your_project_id>
```

- For GitHub Actions or other CI, use repository secrets and set `REOWN_PROJECT_ID` in the build environment.

### Getting a Reown Project ID

1. Go to [cloud.reown.com](https://cloud.reown.com)
2. Create a new project
3. Copy the Project ID
4. Add it to your local `.env` or to your build/CI secrets

### AppKit Setup

The AppKit instance is defined in [src/AppKitConfig.ts](src/AppKitConfig.ts). It configures:

- `@reown/appkit-react-native` core
- `@reown/appkit-ethers-react-native` adapter
- Mainnet network selection

If you need to customize AppKit metadata (icons, redirect URLs), edit the `metadata` object in that file.

## Project Structure

```
frontend/
├── app/                        # Expo Router pages (file-based routing)
│   ├── _layout.tsx             # Root layout with tab navigation + Web3Provider
│   ├── index.tsx               # Home page — share price chart, vault stats
│   ├── games/
│   │   ├── _layout.tsx         # Stack navigator for games
│   │   ├── index.tsx           # Game List — all registered games with wager info
│   │   └── [gameId].tsx        # Game View — price chart, buy NO tokens
│   └── wagers/
│       ├── _layout.tsx         # Stack navigator for wagers
│       ├── index.tsx           # Wager List — market maker's open positions
│       └── [gameId].tsx        # Wager View — position details, redeem button
├── src/
│   ├── abi/                    # Contract ABIs
│   │   ├── OracleABI.ts
│   │   ├── TeamVaultABI.ts
│   │   └── ERC20ABI.ts
│   ├── components/             # Shared UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Header.tsx
│   │   ├── LoadingScreen.tsx
│   │   ├── PriceChart.tsx
│   │   └── StatBox.tsx
│   ├── config/
│   │   └── constants.ts        # Contract addresses, chain config, team setup
│   ├── hooks/                  # Contract interaction hooks
│   │   ├── useSharePrice.ts
│   │   ├── useGameList.ts
│   │   ├── useGameData.ts
│   │   └── useMarketMakerWagers.ts
│   ├── providers/
│   │   └── Web3Provider.tsx    # Ethers.js + Reown WalletConnect context
│   ├── theme/
│   │   └── index.ts            # Colors, spacing, typography
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces for contracts
│   └── utils/
│       └── format.ts           # Formatting helpers (USD, prices, addresses)
├── app.json                    # Expo configuration
├── babel.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Pages

### 1. Home (Share Price)
The landing page displays the TeamVault share price over time for the PHI (Philadelphia 76ers) vault. Shows:
- Current share price (from `getSharePrice()`)
- Total supply of vault shares
- Number of registered games
- Connected wallet position and estimated value

### 2. Game List
Shows all registered games (`getRegisteredGameIds()`) with aggregate data:
- USDC amount allocated for the bet
- NO tokens sold to market makers
- Latest NO token price (from Oracle)
- PnL for the vault's position
- Count of participating market makers

### 3. Game View
Drill-down for a specific game showing:
- YES and NO price history charts (from Oracle observations)
- Vault wager details (USDC allocated, NO tokens sold, average price)
- **Buy NO tokens** form — sends USDC to purchase NO tokens from the vault
  - Approves USDC spending, then calls `vault.buy(gameId, amount, false, 0)`

### 4. Market Maker Wager List
Shows all open positions for the connected wallet across all games:
- NO token count and average entry price
- Current NO price and unrealized PnL

### 5. Market Maker Wager View
Detailed view of a specific wager with:
- Cost basis, current value, unrealized PnL
- NO price history chart
- **Redeem** button — calls `vault.redeem(gameId, shares, 0)` to claim USDC when the team loses

## Smart Contract Integration

The app interacts with two contracts:

| Contract | Purpose |
|---|---|
| **Oracle** | Game registry, price observations, TWAP calculations |
| **TeamVault** | Vault shares, deposits/withdrawals, NO token sales/redemptions |

Key contract calls:
- `vault.getSharePrice()` — current price per share
- `vault.getRegisteredGameIds()` — list of all game IDs
- `vault.vaultWagers(gameId)` — USDC bet, NO sold, avg price
- `vault.marketMakerWagers(gameId, address)` — maker's position
- `vault.buy(gameId, amount, false, minShares)` — buy NO tokens
- `vault.redeem(gameId, shares, minAmount)` — redeem after loss
- `oracle.getGameData(gameId)` — game metadata + observations
- `oracle.getLatestPrice(gameId)` — current YES/NO prices

## Tech Stack

- **React Native** via Expo SDK 52
- **Expo Router** for file-based navigation
- **ethers.js v6** for contract interaction
- **Reown AppKit** (`@reown/appkit-react-native` + `@reown/appkit-ethers-react-native`) for WalletConnect auth
- **react-native-svg** for price charts
- **TypeScript** throughout

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
cd ios && pod deintegrate && pod install && cd ..
npx expo run:ios --clean
```

### Simulator not found

```bash
# List available simulators
xcrun simctl list devices
# Boot a specific simulator
xcrun simctl boot "iPhone 16"
```

### Metro bundler issues

```bash
npx expo start --clear
```

## Target Network

**Ethereum Mainnet** (Chain ID: 1)

The USDC token address defaults to the Mainnet USDC contract. Update contract addresses in `src/config/constants.ts` if deploying to a testnet.
