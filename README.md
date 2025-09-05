# GigMarketplace MCP Server

## Project Information

**Primary Contact:** [Your Name]  
**Telegram Handle:** [@your_telegram_handle]  
**Team:** Solo  
**Project Title:** GigMarketplace MCP Server  

**One-Sentence Elevator Pitch:** A Model Context Protocol server that enables AI agents to interact with the GigMarketplace smart contract on Hedera blockchain for decentralized gig economy operations.

## Detailed Project Description

This MCP server provides comprehensive tools for interacting with the GigMarketplace smart contract deployed on Hedera Testnet. The server enables AI agents to:

- **Read blockchain data**: Query gig details, order information, provider/client data, and marketplace statistics
- **Generate transaction data**: Create properly encoded transaction data for all contract functions
- **Submit transactions**: Execute blockchain transactions directly (with proper private key configuration)

The GigMarketplace contract implements a decentralized freelance marketplace where:
- **Providers** can create gigs with titles, descriptions, and prices
- **Clients** can order and pay for gigs with escrow-style payment holding  
- **Orders** go through a completion and payment release cycle
- **Platform fees** are automatically deducted and sent to contract owner

**Key Features:**
- Full CRUD operations for gigs and orders
- Escrow payment system with provider completion confirmation
- Client-controlled payment release mechanism
- Comprehensive error handling and gas estimation
- Support for both transaction data generation and direct submission
- Built-in Hedera blockchain integration with testnet support

## Install Steps

### Prerequisites
- Node.js 18+ 
- npm

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd ayamcp-hgigs

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

For development with hot reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Environment Variables

### Required for Transaction Submission
- `HEDERA_PRIVATE_KEY`: Your Hedera account private key (64-character hex string without 0x prefix)

### Optional
- `PORT`: Server port (default: 3000, automatically set by deployment platforms)
- `NODE_ENV`: Environment mode (development/production)

### Claude Desktop Configuration
Add to your Claude Desktop MCP settings:
```json
{
  "mcpServers": {
    "gig-marketplace": {
      "command": "node",
      "args": ["path/to/ayamcp-hgigs/dist/server.js"],
      "env": {
        "HEDERA_PRIVATE_KEY": "your_private_key_here"
      }
    }
  }
}
```

## Usage Examples

### Reading Blockchain Data
```bash
# Get marketplace statistics
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"gig-marketplace-get-stats","arguments":{}}}'

# Get specific gig details
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"gig-marketplace-get-gig","arguments":{"gigId":"1"}}}'

# Get provider's gigs
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"gig-marketplace-get-provider-gigs","arguments":{"provider":"0x1234..."}}}'
```

### Transaction Data Generation
```bash
# Generate create gig transaction data
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"gig-marketplace-create-gig-data","arguments":{"title":"Web Development","description":"Build a responsive website","price":"1000000000000000000"}}}'
```

### Direct Transaction Submission (requires HEDERA_PRIVATE_KEY)
```bash
# Create a new gig
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"gig-marketplace-create-gig","arguments":{"title":"Logo Design","description":"Create a professional logo","price":"500000000000000000"}}}'
```

## Available Tools

### Read Operations
- `gig-marketplace-get-gig`: Get details of a specific gig
- `gig-marketplace-get-order`: Get details of a specific order  
- `gig-marketplace-get-provider-gigs`: Get all gig IDs for a provider
- `gig-marketplace-get-client-orders`: Get all order IDs for a client
- `gig-marketplace-get-stats`: Get marketplace statistics

### Transaction Data Generation
- `gig-marketplace-create-gig-data`: Generate create gig transaction data
- `gig-marketplace-update-gig-data`: Generate update gig transaction data
- `gig-marketplace-order-gig-data`: Generate order gig transaction data
- `gig-marketplace-complete-order-data`: Generate complete order transaction data
- `gig-marketplace-release-payment-data`: Generate release payment transaction data

### Direct Transaction Submission (requires private key)
- `gig-marketplace-create-gig`: Submit create gig transaction
- `gig-marketplace-order-gig`: Submit order gig transaction
- `gig-marketplace-complete-order`: Submit complete order transaction
- `gig-marketplace-release-payment`: Submit release payment transaction

## Known Issues

1. **Private Key Security**: Direct transaction submission requires private key in environment variables. For shared deployments, use transaction data generation tools instead.

2. **Gas Estimation**: Gas estimates include 20% buffer, but complex transactions might still fail. Monitor gas usage and adjust if needed.

3. **Network Delays**: Hedera testnet can experience occasional delays. Transactions include proper timeout handling but may take longer during network congestion.

4. **Price Units**: All prices must be specified in wei (smallest unit). Use tools like `ethers.parseEther()` to convert from HBAR to wei.

5. **Contract Validation**: The tools perform minimal input validation. Ensure gig IDs, order IDs, and addresses are valid before submission.

6. **Session Management**: MCP session IDs are required for all tool calls. Ensure proper session initialization before calling tools.

## Contract Details

- **Contract Address**: `0x47fe84b56840a20BF579300207EBBaBc615AE1e9`
- **Network**: Hedera Testnet
- **Explorer**: https://hashscan.io/testnet
- **RPC Endpoint**: https://testnet.hashio.io/api

## License

MIT