import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x47fe84b56840a20BF579300207EBBaBc615AE1e9';
const HEDERA_TESTNET_RPC = 'https://testnet.hashio.io/api';

// Network information
const NETWORK_INFO = {
  name: 'Hedera Testnet',
  chainId: 296,
  nativeToken: {
    symbol: 'HBAR',
    name: 'Hedera Hashgraph',
    decimals: 18
  },
  explorer: 'https://hashscan.io/testnet'
};

// Common token addresses on Hedera Testnet (add more as needed)
const KNOWN_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  '0x0000000000000000000000000000000000000000': {
    symbol: 'HBAR',
    name: 'Hedera Hashgraph',
    decimals: 18
  }
  // Add more token addresses as they become available
};

// Function to resolve token information
function getTokenInfo(tokenAddress: string) {
  const normalizedAddress = tokenAddress.toLowerCase();
  const knownToken = KNOWN_TOKENS[normalizedAddress] || KNOWN_TOKENS['0x0000000000000000000000000000000000000000'];
  
  if (normalizedAddress === '0x0000000000000000000000000000000000000000') {
    return {
      address: tokenAddress,
      symbol: NETWORK_INFO.nativeToken.symbol,
      name: NETWORK_INFO.nativeToken.name,
      decimals: NETWORK_INFO.nativeToken.decimals,
      isNative: true
    };
  }
  
  return {
    address: tokenAddress,
    symbol: knownToken.symbol,
    name: knownToken.name,
    decimals: knownToken.decimals,
    isNative: false
  };
}

// Get private key from environment variable
const PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY;

// GigMarketplace ABI - focused on read functions and common operations
const GIG_MARKETPLACE_ABI = [
  // Read functions
  'function getGig(uint256 _gigId) external view returns (tuple(uint256 id, address provider, string title, string description, uint256 price, bool isActive, bool isCompleted, address token))',
  'function getOrder(uint256 _orderId) external view returns (tuple(uint256 id, uint256 gigId, address client, address provider, uint256 amount, bool isCompleted, bool isPaid, uint256 createdAt))',
  'function getProviderGigs(address _provider) external view returns (uint256[])',
  'function getClientOrders(address _client) external view returns (uint256[])',
  'function getAllActiveGigs() external view returns (tuple(uint256 id, address provider, string title, string description, uint256 price, bool isActive, bool isCompleted, address token)[])',
  'function nextGigId() external view returns (uint256)',
  'function nextOrderId() external view returns (uint256)',
  'function platformFeePercent() external view returns (uint256)',
  
  // Write functions (for data preparation)
  'function createGig(string memory _title, string memory _description, uint256 _price, address _token) external',
  'function updateGig(uint256 _gigId, string memory _title, string memory _description, uint256 _price, address _token) external',
  'function deactivateGig(uint256 _gigId) external',
  'function orderGig(uint256 _gigId) external payable',
  'function completeOrder(uint256 _orderId) external',
  'function releasePayment(uint256 _orderId) external',
];

export function registerGigMarketplaceTool(server: McpServer) {
  // Get gig details
  server.registerTool(
    'gig-marketplace-get-gig',
    {
      title: 'Get Gig Details',
      description: 'Get details of a specific gig from the GigMarketplace contract on Hedera',
      inputSchema: {
        gigId: z.string().describe('The gig ID to retrieve')
      }
    },
    async ({ gigId }) => {
      try {
        const provider = new ethers.JsonRpcProvider(HEDERA_TESTNET_RPC);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GIG_MARKETPLACE_ABI, provider);
        
        const gig = await contract.getGig(gigId);
        const tokenInfo = getTokenInfo(gig[7]);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              id: gig[0].toString(),
              provider: gig[1],
              title: gig[2],
              description: gig[3],
              price: gig[4].toString(),
              isActive: gig[5],
              isCompleted: gig[6],
              token: {
                address: gig[7],
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                decimals: tokenInfo.decimals,
                isNative: tokenInfo.isNative
              },
              network: {
                name: NETWORK_INFO.name,
                chainId: NETWORK_INFO.chainId,
                explorer: NETWORK_INFO.explorer
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting gig: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );





  // Get all active gigs
  server.registerTool(
    'gig-marketplace-get-active-gigs',
    {
      title: 'Get All Active Gigs',
      description: 'Get all active gigs from the GigMarketplace contract on Hedera',
      inputSchema: {}
    },
    async () => {
      try {
        const provider = new ethers.JsonRpcProvider(HEDERA_TESTNET_RPC);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GIG_MARKETPLACE_ABI, provider);
        
        const activeGigs = await contract.getAllActiveGigs();
        
        const formattedGigs = activeGigs.map((gig: any) => {
          const tokenInfo = getTokenInfo(gig[7]);
          return {
            id: gig[0].toString(),
            provider: gig[1],
            title: gig[2],
            description: gig[3],
            price: gig[4].toString(),
            isActive: gig[5],
            isCompleted: gig[6],
            token: {
              address: gig[7],
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
              decimals: tokenInfo.decimals,
              isNative: tokenInfo.isNative
            }
          };
        });
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              totalActiveGigs: formattedGigs.length,
              network: {
                name: NETWORK_INFO.name,
                chainId: NETWORK_INFO.chainId,
                explorer: NETWORK_INFO.explorer
              },
              activeGigs: formattedGigs
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting active gigs: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // Create gig transaction data
  server.registerTool(
    'gig-marketplace-create-gig-data',
    {
      title: 'Generate Create Gig Transaction Data',
      description: 'Generate transaction data for creating a gig on the GigMarketplace contract',
      inputSchema: {
        title: z.string().describe('The gig title'),
        description: z.string().describe('The gig description'),
        price: z.string().describe('The gig price in wei'),
        token: z.string().describe('The token address (use 0x0000000000000000000000000000000000000000 for native currency)')
      }
    },
    async ({ title, description, price, token }) => {
      try {
        const iface = new ethers.Interface(GIG_MARKETPLACE_ABI);
        const data = iface.encodeFunctionData('createGig', [title, description, price, token]);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              to: CONTRACT_ADDRESS,
              data: data,
              value: '0',
              description: `Create gig: ${title}`,
              network: 'Hedera Testnet'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error generating create gig data: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );


  // Order gig transaction data
  server.registerTool(
    'gig-marketplace-order-gig-data',
    {
      title: 'Generate Order Gig Transaction Data',
      description: 'Generate transaction data for ordering a gig on the GigMarketplace contract',
      inputSchema: {
        gigId: z.string().describe('The gig ID to order'),
        paymentAmount: z.string().describe('The payment amount in wei')
      }
    },
    async ({ gigId, paymentAmount }) => {
      try {
        const iface = new ethers.Interface(GIG_MARKETPLACE_ABI);
        const data = iface.encodeFunctionData('orderGig', [gigId]);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              to: CONTRACT_ADDRESS,
              data: data,
              value: paymentAmount,
              description: `Order gig ${gigId}`,
              network: 'Hedera Testnet'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error generating order gig data: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );



  // Submit create gig transaction
  server.registerTool(
    'gig-marketplace-create-gig',
    {
      title: 'Create Gig Transaction',
      description: 'Submit a transaction to create a gig on the GigMarketplace contract',
      inputSchema: {
        title: z.string().describe('The gig title'),
        description: z.string().describe('The gig description'),
        price: z.string().describe('The gig price in wei'),
        token: z.string().describe('The token address (use 0x0000000000000000000000000000000000000000 for native currency)')
      }
    },
    async ({ title, description, price, token }) => {
      try {
        if (!PRIVATE_KEY) {
          return {
            content: [{ 
              type: 'text', 
              text: 'Error: HEDERA_PRIVATE_KEY environment variable not set. Please configure your private key in Claude Desktop MCP settings.' 
            }],
            isError: true
          };
        }

        const provider = new ethers.JsonRpcProvider(HEDERA_TESTNET_RPC);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GIG_MARKETPLACE_ABI, wallet);

        // Estimate gas first
        const gasEstimate = await contract.createGig.estimateGas(title, description, price, token);
        
        // Submit transaction
        const tx = await contract.createGig(title, description, price, token, {
          gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
        });

        // Wait for confirmation
        const receipt = await tx.wait();

        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              success: true,
              transactionHash: tx.hash,
              blockNumber: receipt?.blockNumber,
              gasUsed: receipt?.gasUsed?.toString(),
              status: receipt?.status === 1 ? 'Success' : 'Failed',
              gigTitle: title,
              gigPrice: price,
              gigToken: token,
              network: 'Hedera Testnet',
              explorerUrl: `https://hashscan.io/testnet/transaction/${tx.hash}`
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error creating gig: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // Submit order gig transaction
  server.registerTool(
    'gig-marketplace-order-gig',
    {
      title: 'Order Gig Transaction',
      description: 'Submit a transaction to order a gig on the GigMarketplace contract',
      inputSchema: {
        gigId: z.string().describe('The gig ID to order')
      }
    },
    async ({ gigId }) => {
      try {
        if (!PRIVATE_KEY) {
          return {
            content: [{ 
              type: 'text', 
              text: 'Error: HEDERA_PRIVATE_KEY environment variable not set. Please configure your private key in Claude Desktop MCP settings.' 
            }],
            isError: true
          };
        }

        const provider = new ethers.JsonRpcProvider(HEDERA_TESTNET_RPC);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GIG_MARKETPLACE_ABI, wallet);

        // First get the gig details to know the price
        const gig = await contract.getGig(gigId);
        const gigPrice = gig[4]; // price is at index 4

        // Estimate gas
        const gasEstimate = await contract.orderGig.estimateGas(gigId, { value: gigPrice });
        
        // Submit transaction
        const tx = await contract.orderGig(gigId, {
          value: gigPrice,
          gasLimit: gasEstimate * 120n / 100n
        });

        // Wait for confirmation
        const receipt = await tx.wait();

        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              success: true,
              transactionHash: tx.hash,
              blockNumber: receipt?.blockNumber,
              gasUsed: receipt?.gasUsed?.toString(),
              status: receipt?.status === 1 ? 'Success' : 'Failed',
              gigId: gigId,
              paidAmount: gigPrice.toString(),
              network: 'Hedera Testnet',
              explorerUrl: `https://hashscan.io/testnet/transaction/${tx.hash}`
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error ordering gig: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // Submit complete order transaction
  server.registerTool(
    'gig-marketplace-complete-order',
    {
      title: 'Complete Order Transaction',
      description: 'Submit a transaction to complete an order on the GigMarketplace contract',
      inputSchema: {
        orderId: z.string().describe('The order ID to complete')
      }
    },
    async ({ orderId }) => {
      try {
        if (!PRIVATE_KEY) {
          return {
            content: [{ 
              type: 'text', 
              text: 'Error: HEDERA_PRIVATE_KEY environment variable not set. Please configure your private key in Claude Desktop MCP settings.' 
            }],
            isError: true
          };
        }

        const provider = new ethers.JsonRpcProvider(HEDERA_TESTNET_RPC);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GIG_MARKETPLACE_ABI, wallet);

        // Estimate gas
        const gasEstimate = await contract.completeOrder.estimateGas(orderId);
        
        // Submit transaction
        const tx = await contract.completeOrder(orderId, {
          gasLimit: gasEstimate * 120n / 100n
        });

        // Wait for confirmation
        const receipt = await tx.wait();

        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              success: true,
              transactionHash: tx.hash,
              blockNumber: receipt?.blockNumber,
              gasUsed: receipt?.gasUsed?.toString(),
              status: receipt?.status === 1 ? 'Success' : 'Failed',
              orderId: orderId,
              network: 'Hedera Testnet',
              explorerUrl: `https://hashscan.io/testnet/transaction/${tx.hash}`
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error completing order: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // Submit release payment transaction
  server.registerTool(
    'gig-marketplace-release-payment',
    {
      title: 'Release Payment Transaction',
      description: 'Submit a transaction to release payment for an order on the GigMarketplace contract',
      inputSchema: {
        orderId: z.string().describe('The order ID to release payment for')
      }
    },
    async ({ orderId }) => {
      try {
        if (!PRIVATE_KEY) {
          return {
            content: [{ 
              type: 'text', 
              text: 'Error: HEDERA_PRIVATE_KEY environment variable not set. Please configure your private key in Claude Desktop MCP settings.' 
            }],
            isError: true
          };
        }

        const provider = new ethers.JsonRpcProvider(HEDERA_TESTNET_RPC);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GIG_MARKETPLACE_ABI, wallet);

        // Estimate gas
        const gasEstimate = await contract.releasePayment.estimateGas(orderId);
        
        // Submit transaction
        const tx = await contract.releasePayment(orderId, {
          gasLimit: gasEstimate * 120n / 100n
        });

        // Wait for confirmation
        const receipt = await tx.wait();

        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              success: true,
              transactionHash: tx.hash,
              blockNumber: receipt?.blockNumber,
              gasUsed: receipt?.gasUsed?.toString(),
              status: receipt?.status === 1 ? 'Success' : 'Failed',
              orderId: orderId,
              network: 'Hedera Testnet',
              explorerUrl: `https://hashscan.io/testnet/transaction/${tx.hash}`
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error releasing payment: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // Generate payment page URL for gig
  server.registerTool(
    'gig-marketplace-get-payment-page',
    {
      title: 'Get Payment Page URL for Gig',
      description: 'Generate a frontend payment page URL for paying for a specific gig',
      inputSchema: {
        gigId: z.string().describe('The gig ID to generate payment page URL for')
      }
    },
    async ({ gigId }) => {
      try {
        const provider = new ethers.JsonRpcProvider(HEDERA_TESTNET_RPC);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GIG_MARKETPLACE_ABI, provider);
        
        // Get gig details
        const gig = await contract.getGig(gigId);
        const tokenInfo = getTokenInfo(gig[7]);
        
        if (!gig[5]) { // isActive
          return {
            content: [{ 
              type: 'text', 
              text: 'Error: This gig is not active and cannot be paid for.' 
            }],
            isError: true
          };
        }

        // Convert price from wei to HBAR (assuming 18 decimals)
        const priceInHbar = ethers.formatEther(gig[4]);
        
        // Generate frontend payment page URL
        const paymentPageUrl = `https://hgigs.vercel.app/payment/${gigId}`;

        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              success: true,
              gigDetails: {
                id: gig[0].toString(),
                title: gig[2],
                description: gig[3],
                provider: gig[1],
                price: priceInHbar,
                token: {
                  symbol: tokenInfo.symbol,
                  name: tokenInfo.name,
                  isNative: tokenInfo.isNative
                }
              },
              paymentInfo: {
                paymentPageUrl: paymentPageUrl,
                amount: priceInHbar,
                recipient: gig[1],
                network: NETWORK_INFO.name,
                instructions: "Visit this payment page to pay for the gig with your wallet"
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error generating payment page URL: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
}