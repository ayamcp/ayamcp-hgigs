import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCalculatorTool } from './calculator.js';
import { registerEchoTool } from './echo.js';
import { registerWeatherTool } from './weather.js';
import { registerDpollsGetPollTool } from './dpolls-get-poll.js';
import { registerDpollsGetPollCountTool } from './dpolls-get-poll-count.js';
import { registerDpollsCreatePollDataTool } from './dpolls-create-poll-data.js';
import { registerDpollsVoteDataTool } from './dpolls-vote-data.js';
import { registerGigMarketplaceTool } from './gig-marketplace.js';

export function registerAllTools(server: McpServer) {
  // Basic tools
  registerCalculatorTool(server);
  registerEchoTool(server);
  registerWeatherTool(server);
  
  // DPolls tools
  registerDpollsGetPollTool(server);
  registerDpollsGetPollCountTool(server);
  registerDpollsCreatePollDataTool(server);
  registerDpollsVoteDataTool(server);
  
  // Gig Marketplace tools
  registerGigMarketplaceTool(server);
}

export const TOOL_NAMES = [
  'calculate',
  'echo', 
  'get-weather',
  'dpolls-get-poll',
  'dpolls-get-poll-count',
  'dpolls-create-poll-data',
  'dpolls-vote-data',
  'gig-marketplace-get-gig',
  'gig-marketplace-get-order',
  'gig-marketplace-get-provider-gigs',
  'gig-marketplace-get-client-orders',
  'gig-marketplace-get-stats',
  'gig-marketplace-create-gig-data',
  'gig-marketplace-update-gig-data',
  'gig-marketplace-order-gig-data',
  'gig-marketplace-complete-order-data',
  'gig-marketplace-release-payment-data'
];