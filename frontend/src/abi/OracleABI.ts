// ABI for the Oracle contract (IOracle interface)
export const OracleABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "string", name: "polymarket_slug", type: "string" },
          { internalType: "string", name: "homeTeam", type: "string" },
          { internalType: "string", name: "awayTeam", type: "string" },
          { internalType: "uint128", name: "gameTime", type: "uint128" },
          { internalType: "bool", name: "homeWin", type: "bool" },
          {
            components: [
              { internalType: "uint128", name: "timestamp", type: "uint128" },
              { internalType: "uint256", name: "yesPrice", type: "uint256" },
              { internalType: "uint256", name: "noPrice", type: "uint256" },
            ],
            internalType: "struct Oracle.GameDataObservation[]",
            name: "observations",
            type: "tuple[]",
          },
        ],
        internalType: "struct Oracle.GameData",
        name: "_gameData",
        type: "tuple",
      },
    ],
    name: "registerGame",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "_gameId", type: "bytes32" },
      {
        components: [
          { internalType: "uint128", name: "timestamp", type: "uint128" },
          { internalType: "uint256", name: "yesPrice", type: "uint256" },
          { internalType: "uint256", name: "noPrice", type: "uint256" },
        ],
        internalType: "struct Oracle.GameDataObservation",
        name: "_observation",
        type: "tuple",
      },
    ],
    name: "recordGameData",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "_gameId", type: "bytes32" }],
    name: "getGameData",
    outputs: [
      {
        components: [
          { internalType: "string", name: "polymarket_slug", type: "string" },
          { internalType: "string", name: "homeTeam", type: "string" },
          { internalType: "string", name: "awayTeam", type: "string" },
          { internalType: "uint128", name: "gameTime", type: "uint128" },
          { internalType: "bool", name: "homeWin", type: "bool" },
          {
            components: [
              { internalType: "uint128", name: "timestamp", type: "uint128" },
              { internalType: "uint256", name: "yesPrice", type: "uint256" },
              { internalType: "uint256", name: "noPrice", type: "uint256" },
            ],
            internalType: "struct Oracle.GameDataObservation[]",
            name: "observations",
            type: "tuple[]",
          },
        ],
        internalType: "struct Oracle.GameData",
        name: "_gameData",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "_gameId", type: "bytes32" }],
    name: "getLatestPrice",
    outputs: [
      { internalType: "uint256", name: "yesPrice", type: "uint256" },
      { internalType: "uint256", name: "noPrice", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "_gameId", type: "bytes32" },
      { internalType: "uint128", name: "_startTime", type: "uint128" },
      { internalType: "uint128", name: "_endTime", type: "uint128" },
    ],
    name: "getTwapPrice",
    outputs: [
      { internalType: "uint256", name: "yesPrice", type: "uint256" },
      { internalType: "uint256", name: "noPrice", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
