import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerCalculatorTool(server: McpServer) {
  server.registerTool(
    'calculate',
    {
      title: 'Calculator',
      description: 'Perform basic arithmetic operations',
      inputSchema: {
        operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
        a: z.number(),
        b: z.number()
      }
    },
    async ({ operation, a, b }) => {
      console.error('Calling calculate tool with args:', { operation, a, b });
      let result: number;
      
      switch (operation) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          if (b === 0) {
            return {
              content: [{ type: 'text', text: 'Error: Division by zero' }],
              isError: true
            };
          }
          result = a / b;
          break;
      }
      
      return {
        content: [{
          type: 'text',
          text: `${a} ${operation} ${b} = ${result}`
        }]
      };
    }
  );
}