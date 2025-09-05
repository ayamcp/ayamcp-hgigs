#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

const SERVER_URL = process.env.SERVER_URL || 'https://ayamcp-hgigs.onrender.com/mcp';

async function main() {
  let client;
  let httpTransport;

  // Function to ensure we have a connected client
  async function ensureConnected() {
    if (!client || !httpTransport) {
      console.error('Creating new client connection...');
      client = new Client({
        name: 'claude-desktop-proxy',
        version: '1.0.0'
      });

      httpTransport = new StreamableHTTPClientTransport(new URL(SERVER_URL));
      await client.connect(httpTransport);
    }
  }

  try {
    // Initial connection
    await ensureConnected();

    // Get server capabilities from the remote server
    const serverCapabilities = client.getServerCapabilities();

    // Create stdio server to communicate with Claude Desktop
    const server = new Server({
      name: 'proxy-server',
      version: '1.0.0'
    }, {
      capabilities: serverCapabilities
    });

    // Set up request handlers based on remote server capabilities
    if (serverCapabilities.tools) {
      server.setRequestHandler(ListToolsRequestSchema, async (request) => {
        console.error('Proxying tools/list request');
        await ensureConnected();
        return await client.listTools();
      });

      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        console.error('Proxying tools/call request:', request.params.name);
        try {
          await ensureConnected();
          return await client.callTool(request.params);
        } catch (error) {
          console.error('Tool call failed, creating new connection:', error.message);
          // Force reconnection
          client = null;
          httpTransport = null;
          await ensureConnected();
          return await client.callTool(request.params);
        }
      });
    }

    if (serverCapabilities.resources) {
      server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
        console.error('Proxying resources/list request');
        await ensureConnected();
        return await client.listResources();
      });

      server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        console.error('Proxying resources/read request:', request.params.uri);
        try {
          await ensureConnected();
          return await client.readResource(request.params);
        } catch (error) {
          console.error('Resource read failed, creating new connection:', error.message);
          // Force reconnection
          client = null;
          httpTransport = null;
          await ensureConnected();
          return await client.readResource(request.params);
        }
      });
    }

    if (serverCapabilities.prompts) {
      server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
        console.error('Proxying prompts/list request');
        await ensureConnected();
        return await client.listPrompts();
      });

      server.setRequestHandler(GetPromptRequestSchema, async (request) => {
        console.error('Proxying prompts/get request:', request.params.name);
        try {
          await ensureConnected();
          return await client.getPrompt(request.params);
        } catch (error) {
          console.error('Prompt get failed, creating new connection:', error.message);
          // Force reconnection
          client = null;
          httpTransport = null;
          await ensureConnected();
          return await client.getPrompt(request.params);
        }
      });
    }

    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);

    console.error('✅ Proxy connected successfully to', SERVER_URL);
  } catch (error) {
    console.error('❌ Proxy failed to start:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});