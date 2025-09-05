import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x47fe84b56840a20BF579300207EBBaBc615AE1e9';
const HEDERA_TESTNET_RPC = 'https://testnet.hashio.io/api';

// Get private key from environment variable
const PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY;

// GigMarketplace ABI - focused on read functions and common operations
const GIG_MARKETPLACE_ABI = [
  // Read functions
  'function getGig(uint256 _gigId) external view returns (tuple(uint256 id, address provider, string title, string description, uint256 price, bool isActive, bool isCompleted))',
  'function getOrder(uint256 _orderId) external view returns (tuple(uint256 id, uint256 gigId, address client, address provider, uint256 amount, bool isCompleted, bool isPaid, uint256 createdAt))',
  'function getProviderGigs(address _provider) external view returns (uint256[])',
  'function getClientOrders(address _client) external view returns (uint256[])',
  'function getAllActiveGigs() external view returns (tuple(uint256 id, address provider, string title, string description, uint256 price, bool isActive, bool isCompleted)[])',
  'function nextGigId() external view returns (uint256)',
  'function nextOrderId() external view returns (uint256)',
  'function platformFeePercent() external view returns (uint256)',
  
  // Write functions (for data preparation)
  'function createGig(string memory _title, string memory _description, uint256 _price) external',
  'function updateGig(uint256 _gigId, string memory _title, string memory _description, uint256 _price) external',
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
              isCompleted: gig[6]
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

  // Get order details
  server.registerTool(
    'gig-marketplace-get-order',
    {
      title: 'Get Order Details', 
      description: 'Get details of a specific order from the GigMarketplace contract on Hedera',
      inputSchema: {
        orderId: z.string().describe('The order ID to retrieve')
      }
    },
    async ({ orderId }) => {
      try {
        const provider = new ethers.JsonRpcProvider(HEDERA_TESTNET_RPC);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GIG_MARKETPLACE_ABI, provider);
        
        const order = await contract.getOrder(orderId);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              id: order[0].toString(),
              gigId: order[1].toString(),
              client: order[2],
              provider: order[3],
              amount: order[4].toString(),
              isCompleted: order[5],
              isPaid: order[6],
              createdAt: order[7].toString()
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting order: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // Get provider gigs
  server.registerTool(
    'gig-marketplace-get-provider-gigs',
    {
      title: 'Get Provider Gigs',
      description: 'Get all gig IDs for a provider from the GigMarketplace contract on Hedera',
      inputSchema: {
        provider: z.string().describe('The provider address')
      }
    },
    async ({ provider }) => {
      try {
        const rpcProvider = new ethers.JsonRpcProvider(HEDERA_TESTNET_RPC);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GIG_MARKETPLACE_ABI, rpcProvider);
        
        const gigIds = await contract.getProviderGigs(provider);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              provider: provider,
              gigIds: gigIds.map((id: any) => id.toString())
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting provider gigs: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // Get client orders
  server.registerTool(
    'gig-marketplace-get-client-orders',
    {
      title: 'Get Client Orders',
      description: 'Get all order IDs for a client from the GigMarketplace contract on Hedera',
      inputSchema: {
        client: z.string().describe('The client address')
      }
    },
    async ({ client }) => {
      try {
        const provider = new ethers.JsonRpcProvider(HEDERA_TESTNET_RPC);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GIG_MARKETPLACE_ABI, provider);
        
        const orderIds = await contract.getClientOrders(client);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              client: client,
              orderIds: orderIds.map((id: any) => id.toString())
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting client orders: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // Get marketplace stats
  server.registerTool(
    'gig-marketplace-get-stats',
    {
      title: 'Get Marketplace Stats',
      description: 'Get marketplace statistics from the GigMarketplace contract on Hedera',
      inputSchema: {}
    },
    async () => {
      try {
        const provider = new ethers.JsonRpcProvider(HEDERA_TESTNET_RPC);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GIG_MARKETPLACE_ABI, provider);
        
        const [nextGigId, nextOrderId, platformFeePercent] = await Promise.all([
          contract.nextGigId(),
          contract.nextOrderId(),
          contract.platformFeePercent()
        ]);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              totalGigs: (nextGigId - 1n).toString(),
              totalOrders: (nextOrderId - 1n).toString(),
              platformFeePercent: platformFeePercent.toString(),
              contractAddress: CONTRACT_ADDRESS,
              network: 'Hedera Testnet'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting marketplace stats: ${error instanceof Error ? error.message : 'Unknown error'}` 
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
        
        const formattedGigs = activeGigs.map((gig: any) => ({
          id: gig[0].toString(),
          provider: gig[1],
          title: gig[2],
          description: gig[3],
          price: gig[4].toString(),
          isActive: gig[5],
          isCompleted: gig[6]
        }));
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              totalActiveGigs: formattedGigs.length,
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
        price: z.string().describe('The gig price in wei')
      }
    },
    async ({ title, description, price }) => {
      try {
        const iface = new ethers.Interface(GIG_MARKETPLACE_ABI);
        const data = iface.encodeFunctionData('createGig', [title, description, price]);
        
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

  // Update gig transaction data
  server.registerTool(
    'gig-marketplace-update-gig-data',
    {
      title: 'Generate Update Gig Transaction Data',
      description: 'Generate transaction data for updating a gig on the GigMarketplace contract',
      inputSchema: {
        gigId: z.string().describe('The gig ID to update'),
        title: z.string().describe('The new gig title'),
        description: z.string().describe('The new gig description'),
        price: z.string().describe('The new gig price in wei')
      }
    },
    async ({ gigId, title, description, price }) => {
      try {
        const iface = new ethers.Interface(GIG_MARKETPLACE_ABI);
        const data = iface.encodeFunctionData('updateGig', [gigId, title, description, price]);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              to: CONTRACT_ADDRESS,
              data: data,
              value: '0',
              description: `Update gig ${gigId}: ${title}`,
              network: 'Hedera Testnet'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error generating update gig data: ${error instanceof Error ? error.message : 'Unknown error'}` 
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

  // Complete order transaction data
  server.registerTool(
    'gig-marketplace-complete-order-data',
    {
      title: 'Generate Complete Order Transaction Data',
      description: 'Generate transaction data for completing an order on the GigMarketplace contract',
      inputSchema: {
        orderId: z.string().describe('The order ID to complete')
      }
    },
    async ({ orderId }) => {
      try {
        const iface = new ethers.Interface(GIG_MARKETPLACE_ABI);
        const data = iface.encodeFunctionData('completeOrder', [orderId]);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              to: CONTRACT_ADDRESS,
              data: data,
              value: '0',
              description: `Complete order ${orderId}`,
              network: 'Hedera Testnet'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error generating complete order data: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );

  // Release payment transaction data
  server.registerTool(
    'gig-marketplace-release-payment-data',
    {
      title: 'Generate Release Payment Transaction Data',
      description: 'Generate transaction data for releasing payment on the GigMarketplace contract',
      inputSchema: {
        orderId: z.string().describe('The order ID to release payment for')
      }
    },
    async ({ orderId }) => {
      try {
        const iface = new ethers.Interface(GIG_MARKETPLACE_ABI);
        const data = iface.encodeFunctionData('releasePayment', [orderId]);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              to: CONTRACT_ADDRESS,
              data: data,
              value: '0',
              description: `Release payment for order ${orderId}`,
              network: 'Hedera Testnet'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error generating release payment data: ${error instanceof Error ? error.message : 'Unknown error'}` 
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
        price: z.string().describe('The gig price in wei')
      }
    },
    async ({ title, description, price }) => {
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
        const gasEstimate = await contract.createGig.estimateGas(title, description, price);
        
        // Submit transaction
        const tx = await contract.createGig(title, description, price, {
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
}