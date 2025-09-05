import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCalculatorTool } from './calculator.js';
import { registerEchoTool } from './echo.js';
import { registerWeatherTool } from './weather.js';
import { registerDpollsGetPollTool } from './dpolls-get-poll.js';
import { registerDpollsGetPollCountTool } from './dpolls-get-poll-count.js';
import { registerDpollsCreatePollDataTool } from './dpolls-create-poll-data.js';
import { registerDpollsVoteDataTool } from './dpolls-vote-data.js';

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
}

export const TOOL_NAMES = [
  'calculate',
  'echo', 
  'get-weather',
  'dpolls-get-poll',
  'dpolls-get-poll-count',
  'dpolls-create-poll-data',
  'dpolls-vote-data'
];