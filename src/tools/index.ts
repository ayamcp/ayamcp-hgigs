import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGigMarketplaceTool } from './gig-marketplace.js';
import { registerNowPaymentsTool } from './nowpayments.js';
import { registerCoinPaymentsTool } from './coinpayments.js';
import { registerCoinbaseCommerceTool } from './coinbase-commerce.js';

export function registerAllTools(server: McpServer) {
  // Gig Marketplace tools
  registerGigMarketplaceTool(server);
  
  // NowPayments tools
  registerNowPaymentsTool(server);
  
  // Coinbase Commerce tools
  registerCoinbaseCommerceTool(server);
}

export const TOOL_NAMES = [
  'gig-marketplace-get-gig',
  'gig-marketplace-get-order',
  'gig-marketplace-get-provider-gigs',
  'gig-marketplace-get-client-orders',
  'gig-marketplace-get-stats',
  'gig-marketplace-get-active-gigs',
  'gig-marketplace-generate-payment-qr',
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
  'coinbase-commerce-create-charge',
  'coinbase-commerce-get-charge',
  'coinbase-commerce-list-charges',
  'coinbase-commerce-verify-webhook',
  'coinbase-commerce-cancel-charge',
  'coinbase-commerce-resolve-charge'
];