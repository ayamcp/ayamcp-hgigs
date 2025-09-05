import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerWeatherTool(server: McpServer) {
  server.registerTool(
    'get-weather',
    {
      title: 'Get Weather',
      description: 'Get simulated weather data for a city',
      inputSchema: {
        city: z.string()
      }
    },
    async ({ city }) => {
      console.error('Calling get-weather tool with args:', { city });
      const temperatures = [15, 18, 22, 25, 28, 20, 16];
      const conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy'];
      const temp = temperatures[Math.floor(Math.random() * temperatures.length)];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      
      return {
        content: [{
          type: 'text',
          text: `Weather in ${city}: ${temp}°C, ${condition}`
        }]
      };
    }
  );
}