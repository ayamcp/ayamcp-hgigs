import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCalculatorTool } from './calculator.js';
import { registerEchoTool } from './echo.js';
import { registerWeatherTool } from './weather.js';
import { registerDpollsGetPollTool } from './dpolls-get-poll.js';
import { registerDpollsGetPollCountTool } from './dpolls-get-poll-count.js';
import { registerDpollsCreatePollDataTool } from './dpolls-create-poll-data.js';
import { registerDpollsVoteDataTool } from './dpolls-vote-data.js';
import { registerGigMarketplaceTool } from './gig-marketplace.js';
import { registerNowPaymentsTool } from './nowpayments.js';
import { registerCoinPaymentsTool } from './coinpayments.js';
import { registerCoinbaseCommerceTool } from './coinbase-commerce.js';

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
  
  // NowPayments tools
  registerNowPaymentsTool(server);
  
  // CoinPayments tools
  registerCoinPaymentsTool(server);
  
  // Coinbase Commerce tools
  registerCoinbaseCommerceTool(server);
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
  'gig-marketplace-release-payment-data',
  'gig-marketplace-create-gig',
  'gig-marketplace-order-gig',
  'gig-marketplace-complete-order',
  'gig-marketplace-release-payment',
  'nowpayments-get-currencies',
  'nowpayments-get-estimate',
  'nowpayments-create-invoice',
  'nowpayments-get-payment-status',
  'nowpayments-verify-webhook',
  'coinpayments-get-rates',
  'coinpayments-create-transaction',
  'coinpayments-get-transaction-info',
  'coinpayments-verify-ipn',
  'coinpayments-get-supported-coins',
  'coinpayments-convert',
  'coinbase-commerce-create-charge',
  'coinbase-commerce-get-charge',
  'coinbase-commerce-list-charges',
  'coinbase-commerce-verify-webhook',
  'coinbase-commerce-cancel-charge',
  'coinbase-commerce-resolve-charge'
];