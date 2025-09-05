# Simple MCP Server

A simple Model Context Protocol (MCP) server built with TypeScript and Express, designed for deployment on Render.

## Features

### Tools
- **Calculator**: Perform basic arithmetic operations (add, subtract, multiply, divide)
- **Echo**: Echo back any message
- **Weather**: Get simulated weather data for any city

### Resources
- **Server Config** (`config://server`): Server configuration and status
- **Component Status** (`status://{component}`): Dynamic status for server components

## Local Development

### Prerequisites
- Node.js 18+ 
- npm

### Setup
```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The server will start on `http://localhost:3000`

### Endpoints
- `POST /mcp` - MCP protocol endpoint
- `GET /mcp` - SSE notifications endpoint  
- `DELETE /mcp` - Session termination
- `GET /health` - Health check
- `GET /` - Server information

## Testing the MCP Server

You can test the server using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/mcp
```

Or test tools manually with curl:

```bash
# Initialize session
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# List tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call calculator tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"calculate","arguments":{"operation":"add","a":5,"b":3}}}'
```

## Deployment on Render

### Deploy from GitHub

1. Fork/clone this repository to your GitHub account

2. Go to [Render Dashboard](https://dashboard.render.com)

3. Click "New +" and select "Web Service"

4. Connect your GitHub repository

5. Configure the service:
   - **Name**: `ayamcp-simple-claude` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose your preferred region
   - **Branch**: `main`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

6. Set environment variables (optional):
   - `NODE_ENV`: `production`
   - `PORT`: (automatically set by Render)

7. Click "Create Web Service"

### Deploy with Render Blueprint (render.yaml)

You can also use the included `render.yaml` file for deployment:

```yaml
services:
  - type: web
    name: ayamcp-simple-claude
    env: node
    buildCommand: npm run build
    startCommand: npm start
    healthCheckPath: /health
```

### Manual Deployment

If you prefer to deploy manually:

1. Build the project locally:
   ```bash
   npm run build
   ```

2. Upload the built files to Render

3. Set the start command to `node dist/server.js`

## Usage with MCP Clients

Once deployed, your MCP server will be available at your Render URL (e.g., `https://your-app-name.onrender.com/mcp`).

You can connect to it from any MCP client that supports Streamable HTTP transport:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const client = new Client({
  name: 'my-client',
  version: '1.0.0'
});

const transport = new StreamableHTTPClientTransport(
  new URL('https://your-app-name.onrender.com/mcp')
);

await client.connect(transport);

// List available tools
const tools = await client.listTools();

// Call a tool
const result = await client.callTool({
  name: 'calculate',
  arguments: { operation: 'add', a: 10, b: 5 }
});
```

## Environment Variables

- `PORT`: Server port (automatically set by Render)
- `NODE_ENV`: Environment mode (development/production)

## License

MIT