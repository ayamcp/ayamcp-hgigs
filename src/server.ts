import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { registerAllTools, TOOL_NAMES } from './tools/index.js';

// Create Express app
const app = express();
app.use(express.json());

// Configure CORS for browser compatibility
app.use(cors({
  origin: '*', // In production, specify allowed origins
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id'],
}));

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Create MCP server instance
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'simple-mcp-server',
    version: '1.0.0'
  });

  // Register all tools from modular files
  registerAllTools(server);

  // Register a static config resource
  server.registerResource(
    'config',
    'config://server',
    {
      title: 'Server Configuration',
      description: 'Server configuration information',
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: JSON.stringify({
          name: 'simple-mcp-server',
          version: '1.0.0',
          capabilities: ['tools', 'resources'],
          uptime: process.uptime()
        }, null, 2)
      }]
    })
  );

  // Register a dynamic status resource
  server.registerResource(
    'status',
    new ResourceTemplate('status://{component}', { list: undefined }),
    {
      title: 'Component Status',
      description: 'Status information for server components'
    },
    async (uri, { component }) => {
      const status = {
        server: 'healthy',
        database: 'connected',
        api: 'operational',
        cache: 'active'
      };
      
      const componentStatus = status[component as keyof typeof status] || 'unknown';
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({
            component,
            status: componentStatus,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  );

  return server;
}

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  try {
    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          // Store the transport by session ID
          transports[sessionId] = transport;
        },
        // Enable DNS rebinding protection for security
        enableDnsRebindingProtection: true,
        allowedHosts: ['127.0.0.1', 'localhost', process.env.SERVER_HOST || 'ayamcp-hgigs.onrender.com']
      });

      console.log('allowedHosts', process.env.SERVER_HOST);
      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
        }
      };

      // Create and connect MCP server
      const server = createMcpServer();
      await server.connect(transport);
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    // Handle the request
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// Handle DELETE requests for session termination
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
  
  // Clean up the transport
  if (transport.sessionId) {
    delete transports[transport.sessionId];
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    sessions: Object.keys(transports).length
  });
});

// Root endpoint with basic info
app.get('/', (_req, res) => {
  res.json({
    name: 'Simple MCP Server',
    version: '1.0.0',
    description: 'A simple Model Context Protocol server with Streamable HTTP transport',
    endpoints: {
      mcp: '/mcp',
      health: '/health'
    },
    tools: TOOL_NAMES,
    resources: ['config://server', 'status://{component}']
  });
});

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.error(`🚀 MCP Server listening on port ${PORT}`);
  console.error(`📡 MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
  console.error(`❤️ Health check: http://0.0.0.0:${PORT}/health`);
});