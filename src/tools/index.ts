import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGigMarketplaceTool } from './gig-marketplace.js';
import { registerComput3Tool } from './comput3.js';

export function registerAllTools(server: McpServer) {
  // Gig Marketplace tools
  registerGigMarketplaceTool(server);
  
  // Comput3 AI tools
  registerComput3Tool(server);
}

export const TOOL_NAMES = [
  // Core Flow: Discover Gig
  'gig-marketplace-get-gig',
  'gig-marketplace-get-active-gigs',
  
  // Core Flow: Create Invoice
  'gig-marketplace-create-gig-data',
  'gig-marketplace-create-gig',
  
  // Core Flow: Pay on Hedera
  'gig-marketplace-order-gig-data',
  'gig-marketplace-order-gig',
  'gig-marketplace-get-payment-page',
  
  // Core Flow: Fulfill + Comput3 Deliverables
  'gig-marketplace-complete-order',
  'gig-marketplace-release-payment',
  'comput3-text-completion',
  'comput3-image-generation',
  'comput3-video-generation',
  'comput3-job-status',
  'comput3-enhance-gig-description',
  'comput3-generate-gig-image'
];