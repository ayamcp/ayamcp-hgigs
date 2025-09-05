import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerEchoTool(server: McpServer) {
  server.registerTool(
    'echo',
    {
      title: 'Echo',
      description: 'Echo back the provided message',
      inputSchema: {
        message: z.string()
      }
    },
    async ({ message }) => ({
      content: [{
        type: 'text',
        text: `Echo: ${message}`
      }]
    })
  );
}