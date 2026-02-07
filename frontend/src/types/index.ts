export interface VaultWager {
  gameId: string;
  usdcAmountForBet: bigint;
  noTokensSold: bigint;
  averageNoPrice: bigint;
}

export interface MarketMakerWager {
  gameId: string;
  noTokens: bigint;
  averagePrice: bigint;
}

export interface GameData {
  polymarket_slug: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: number;
  homeWin: boolean;
  observations: GameDataObservation[];
}

export interface GameDataObservation {
  timestamp: number;
  yesPrice: bigint;
  noPrice: bigint;
}

export interface GameInfo {
  gameTime: number;
  isRegistered: boolean;
  isHomeTeam: boolean;
}

export interface GameListItem {
  gameId: string;
  slug: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: number;
  isHomeTeam: boolean;
  vaultWager: VaultWager;
  latestYesPrice: bigint;
  latestNoPrice: bigint;
  marketMakerCount: number;
}

export interface SharePricePoint {
  timestamp: number;
  price: number;
}
