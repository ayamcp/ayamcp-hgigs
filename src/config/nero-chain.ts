import { ethers } from 'ethers';

// NERO Mainnet configuration
export const NERO_CHAIN = {
  name: 'NERO Mainnet',
  networkType: 'mainnet' as const,
  rpc: 'https://rpc.nerochain.io',
  chainId: 1689,
  explorer: 'https://neroscan.io',
  explorerAPI: 'https://api.neroscan.io',
  nativeToken: {
    decimals: 18,
    name: 'NERO',
    symbol: 'NERO',
  },
};

export const DPOLLS_CONTRACT_ADDRESS = '0x9B0a758AbE7f3a4508615290a35Da3bEE3b48e38';

// Basic DPolls contract ABI for common poll operations
export const DPOLLS_ABI = [
  // Create poll function
  {
    "inputs": [
      {"name": "question", "type": "string"},
      {"name": "options", "type": "string[]"},
      {"name": "duration", "type": "uint256"}
    ],
    "name": "createPoll",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Vote function
  {
    "inputs": [
      {"name": "pollId", "type": "uint256"},
      {"name": "optionIndex", "type": "uint256"}
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Get poll function
  {
    "inputs": [{"name": "pollId", "type": "uint256"}],
    "name": "getPoll",
    "outputs": [
      {"name": "question", "type": "string"},
      {"name": "options", "type": "string[]"},
      {"name": "votes", "type": "uint256[]"},
      {"name": "creator", "type": "address"},
      {"name": "endTime", "type": "uint256"},
      {"name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Get poll count
  {
    "inputs": [],
    "name": "getPollCount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "pollId", "type": "uint256"},
      {"indexed": true, "name": "creator", "type": "address"},
      {"indexed": false, "name": "question", "type": "string"}
    ],
    "name": "PollCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "pollId", "type": "uint256"},
      {"indexed": true, "name": "voter", "type": "address"},
      {"indexed": false, "name": "optionIndex", "type": "uint256"}
    ],
    "name": "VoteCast",
    "type": "event"
  }
];

// Create provider for NERO mainnet
export const provider = new ethers.JsonRpcProvider(NERO_CHAIN.rpc);