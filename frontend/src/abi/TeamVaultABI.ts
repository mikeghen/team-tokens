// ABI for the TeamVault contract (ITeamVault interface + concrete contract)
export const TeamVaultABI = [
  // --- Admin ---
  {
    inputs: [{ internalType: "bytes32", name: "_gameId", type: "bytes32" }],
    name: "registerGame",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32[]", name: "_gameIds", type: "bytes32[]" },
    ],
    name: "registerGames",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- Trader ---
  {
    inputs: [
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "uint256", name: "_minShares", type: "uint256" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_shares", type: "uint256" },
      { internalType: "uint256", name: "_minAmount", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- Market Maker ---
  {
    inputs: [
      { internalType: "bytes32", name: "_gameId", type: "bytes32" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "bool", name: "_isYes", type: "bool" },
      { internalType: "uint256", name: "_minShares", type: "uint256" },
    ],
    name: "buy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "_gameId", type: "bytes32" },
      { internalType: "uint256", name: "_shares", type: "uint256" },
      { internalType: "uint256", name: "_minAmount", type: "uint256" },
    ],
    name: "redeem",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- View ---
  {
    inputs: [],
    name: "getSharePrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getRegisteredGameIds",
    outputs: [{ internalType: "bytes32[]", name: "", type: "bytes32[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "_gameId", type: "bytes32" }],
    name: "getGameMarketMakers",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_maker", type: "address" },
      { internalType: "bytes32[]", name: "_gameIds", type: "bytes32[]" },
    ],
    name: "getMarketMakerWagers",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "noTokens", type: "uint256" },
          { internalType: "uint256", name: "averagePrice", type: "uint256" },
        ],
        internalType: "struct ITeamVault.MarketMakerWager[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "_gameId", type: "bytes32" }],
    name: "getMarketMakerWagersForGame",
    outputs: [
      { internalType: "address[]", name: "makers", type: "address[]" },
      {
        components: [
          { internalType: "uint256", name: "noTokens", type: "uint256" },
          { internalType: "uint256", name: "averagePrice", type: "uint256" },
        ],
        internalType: "struct ITeamVault.MarketMakerWager[]",
        name: "wagers",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  // --- State variables ---
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "vaultWagers",
    outputs: [
      {
        internalType: "uint256",
        name: "usdcAmountForBet",
        type: "uint256",
      },
      { internalType: "uint256", name: "noTokensSold", type: "uint256" },
      { internalType: "uint256", name: "averageNoPrice", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "", type: "bytes32" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "marketMakerWagers",
    outputs: [
      { internalType: "uint256", name: "noTokens", type: "uint256" },
      { internalType: "uint256", name: "averagePrice", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "usdcSold",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "gameInfo",
    outputs: [
      { internalType: "uint128", name: "gameTime", type: "uint128" },
      { internalType: "bool", name: "isRegistered", type: "bool" },
      { internalType: "bool", name: "isHomeTeam", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TEAM_SYMBOL",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "BET_FRACTION",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "BUY_WINDOW",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
