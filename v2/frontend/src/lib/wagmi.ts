import { http, cookieStorage, createStorage } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// Contract addresses on Base Sepolia (V3 - with approveFor)
export const CONTRACTS = {
  ESCROW: "0x66cdf0431896c2c2ac38eaa716284e4d4159c05e", // ViberrEscrow V4 (atomic create+fund)
  USDC: "0x050981C543658C54F25Ffd881Be3290B31B79DD0",   // MockUSDC V3 with approveFor
} as const;

// Platform fee percentage
export const PLATFORM_FEE_PERCENT = 15;

// USDC has 6 decimals
export const USDC_DECIMALS = 6;

// ERC20 ABI for USDC operations (includes testnet mint)
export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  // Testnet mint function - anyone can call
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

// Faucet amount: 1000 USDC for testnet (1000 * 10^6)
export const FAUCET_AMOUNT = BigInt(1000) * BigInt(10) ** BigInt(6);

// ViberrEscrow ABI - matches the deployed contract
export const ESCROW_ABI = [
  {
    name: "createJob",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "specHash", type: "bytes32" },
    ],
    outputs: [{ name: "jobId", type: "uint256" }],
  },
  {
    name: "fundJob",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "releasePayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "tip",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "nextJobId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Wagmi config using RainbowKit's helper with SSR-safe storage
export const wagmiConfig = getDefaultConfig({
  appName: "Viberr",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || "YOUR_PROJECT_ID",
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
