import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import crypto from 'crypto';

// Coinbase Commerce API configuration
const COINBASE_COMMERCE_API_BASE = 'https://api.commerce.coinbase.com';

// Get configuration from environment variables
const COINBASE_COMMERCE_API_KEY = process.env.COINBASE_COMMERCE_API_KEY;
const COINBASE_COMMERCE_WEBHOOK_SECRET = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;

// Charge interfaces
interface CreateChargeRequest {
  name: string;
  description: string;
  pricing_type: 'fixed_price' | 'no_price';
  local_price?: {
    amount: string;
    currency: string;
  };
  metadata?: Record<string, any>;
  redirect_url?: string;
  cancel_url?: string;
}

interface ChargeResponse {
  id: string;
  resource: string;
  code: string;
  name: string;
  description: string;
  logo_url?: string;
  hosted_url: string;
  created_at: string;
  expires_at: string;
  confirmed_at?: string;
  checkout?: {
    id: string;
  };
  timeline: Array<{
    time: string;
    status: string;
    context?: string;
  }>;
  metadata: Record<string, any>;
  pricing_type: string;
  pricing: {
    local: {
      amount: string;
      currency: string;
    };
    bitcoin?: {
      amount: string;
      currency: string;
    };
    ethereum?: {
      amount: string;
      currency: string;
    };
    litecoin?: {
      amount: string;
      currency: string;
    };
    bitcoincash?: {
      amount: string;
      currency: string;
    };
    usdc?: {
      amount: string;
      currency: string;
    };
  };
  payments: Array<{
    network: string;
    transaction_id: string;
    status: string;
    value: {
      local: {
        amount: string;
        currency: string;
      };
      crypto: {
        amount: string;
        currency: string;
      };
    };
    block?: {
      height: number;
      hash: string;
      confirmations_accumulated: number;
      confirmations_required: number;
    };
  }>;
  addresses: {
    bitcoin?: string;
    ethereum?: string;
    litecoin?: string;
    bitcoincash?: string;
    usdc?: string;
  };
}

interface WebhookEvent {
  id: string;
  resource: string;
  type: string;
  api_version: string;
  created_at: string;
  data: ChargeResponse;
}

// Helper function to make Coinbase Commerce API requests
async function makeCoinbaseCommerceRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<any> {
  if (!COINBASE_COMMERCE_API_KEY) {
    throw new Error('COINBASE_COMMERCE_API_KEY environment variable not set');
  }

  const url = `${COINBASE_COMMERCE_API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'X-CC-Api-Key': COINBASE_COMMERCE_API_KEY,
    'Content-Type': 'application/json',
    'X-CC-Version': '2018-03-22',
  };

  const requestOptions: RequestInit = {
    method,
    headers,
  };

  if (body && method === 'POST') {
    requestOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, requestOptions);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Coinbase Commerce API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// Helper function to verify webhook signature
function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!COINBASE_COMMERCE_WEBHOOK_SECRET) {
    return false;
  }

  const computedSignature = crypto
    .createHmac('sha256', COINBASE_COMMERCE_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return computedSignature === signature;
}

export function registerCoinbaseCommerceTool(server: McpServer) {
  // Create charge
  server.registerTool(
    'coinbase-commerce-create-charge',
    {
      title: 'Create Coinbase Commerce Charge',
      description: 'Create a cryptocurrency payment charge with hosted checkout page',
      inputSchema: {
        name: z.string().describe('Name of the item/service'),
        description: z.string().describe('Description of the item/service'),
        amount: z.string().describe('Payment amount (e.g., "10.00")'),
        currency: z.string().describe('Fiat currency (e.g., "USD", "EUR")'),
        gig_id: z.string().optional().describe('Gig ID from marketplace'),
        buyer_email: z.string().optional().describe('Buyer email address'),
        buyer_name: z.string().optional().describe('Buyer name'),
        redirect_url: z.string().optional().describe('Success redirect URL'),
        cancel_url: z.string().optional().describe('Cancel redirect URL'),
        custom_data: z.string().optional().describe('Custom data (JSON string)')
      }
    },
    async ({ name, description, amount, currency, gig_id, buyer_email, buyer_name, redirect_url, cancel_url, custom_data }) => {
      try {
        const metadata: Record<string, any> = {};
        if (gig_id) metadata.gig_id = gig_id;
        if (buyer_email) metadata.buyer_email = buyer_email;
        if (buyer_name) metadata.buyer_name = buyer_name;
        if (custom_data) {
          try {
            const parsedCustomData = JSON.parse(custom_data);
            Object.assign(metadata, parsedCustomData);
          } catch (e) {
            metadata.custom_data = custom_data;
          }
        }

        const chargeRequest: CreateChargeRequest = {
          name,
          description,
          pricing_type: 'fixed_price',
          local_price: {
            amount,
            currency
          },
          metadata,
          redirect_url,
          cancel_url
        };

        const result = await makeCoinbaseCommerceRequest('/charges', 'POST', chargeRequest);
        
        const charge: ChargeResponse = result.data;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              charge_id: charge.id,
              charge_code: charge.code,
              hosted_url: charge.hosted_url,
              name: charge.name,
              description: charge.description,
              amount: charge.pricing?.local?.amount,
              currency: charge.pricing?.local?.currency,
              expires_at: charge.expires_at,
              created_at: charge.created_at,
              addresses: charge.addresses,
              supported_currencies: Object.keys(charge.addresses || {}),
              metadata: charge.metadata,
              provider: 'Coinbase Commerce',
              payment_instructions: {
                hosted_checkout: "Direct users to hosted_url for a complete checkout experience",
                crypto_addresses: "Users can send crypto directly to the provided addresses",
                qr_codes: "QR codes are available on the hosted checkout page",
                status_check: "Use charge_id to check payment status"
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error creating charge: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Get charge
  server.registerTool(
    'coinbase-commerce-get-charge',
    {
      title: 'Get Coinbase Commerce Charge',
      description: 'Get detailed information about a charge by charge ID',
      inputSchema: {
        charge_id: z.string().describe('Charge ID from Coinbase Commerce')
      }
    },
    async ({ charge_id }) => {
      try {
        const result = await makeCoinbaseCommerceRequest(`/charges/${charge_id}`);
        
        const charge: ChargeResponse = result.data;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              charge_id: charge.id,
              charge_code: charge.code,
              name: charge.name,
              description: charge.description,
              hosted_url: charge.hosted_url,
              created_at: charge.created_at,
              expires_at: charge.expires_at,
              confirmed_at: charge.confirmed_at,
              pricing: charge.pricing,
              addresses: charge.addresses,
              payments: charge.payments,
              timeline: charge.timeline,
              metadata: charge.metadata,
              status: charge.timeline?.[charge.timeline.length - 1]?.status || 'unknown',
              provider: 'Coinbase Commerce',
              status_meanings: {
                NEW: "Charge created, waiting for payment",
                PENDING: "Payment detected, waiting for confirmations",
                COMPLETED: "Payment confirmed and completed",
                EXPIRED: "Charge expired without payment",
                UNRESOLVED: "Payment received but needs manual review",
                RESOLVED: "Previously unresolved payment has been resolved"
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting charge: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // List charges
  server.registerTool(
    'coinbase-commerce-list-charges',
    {
      title: 'List Coinbase Commerce Charges',
      description: 'List charges with optional pagination',
      inputSchema: {
        limit: z.number().optional().describe('Number of charges to return (default: 25, max: 100)'),
        starting_after: z.string().optional().describe('Charge ID to start after for pagination')
      }
    },
    async ({ limit, starting_after }) => {
      try {
        let endpoint = '/charges';
        const params = new URLSearchParams();
        
        if (limit) params.append('limit', limit.toString());
        if (starting_after) params.append('starting_after', starting_after);
        
        if (params.toString()) {
          endpoint += `?${params.toString()}`;
        }

        const result = await makeCoinbaseCommerceRequest(endpoint);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              charges: result.data.map((charge: ChargeResponse) => ({
                charge_id: charge.id,
                charge_code: charge.code,
                name: charge.name,
                description: charge.description,
                amount: charge.pricing?.local?.amount,
                currency: charge.pricing?.local?.currency,
                status: charge.timeline?.[charge.timeline.length - 1]?.status || 'unknown',
                created_at: charge.created_at,
                expires_at: charge.expires_at,
                confirmed_at: charge.confirmed_at,
                hosted_url: charge.hosted_url
              })),
              pagination: result.pagination,
              total_count: result.data.length,
              provider: 'Coinbase Commerce'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error listing charges: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Verify webhook signature
  server.registerTool(
    'coinbase-commerce-verify-webhook',
    {
      title: 'Verify Coinbase Commerce Webhook',
      description: 'Verify the authenticity of a Coinbase Commerce webhook using HMAC-SHA256 signature',
      inputSchema: {
        raw_body: z.string().describe('Raw request body from webhook'),
        signature: z.string().describe('Signature from X-CC-Webhook-Signature header')
      }
    },
    async ({ raw_body, signature }) => {
      try {
        if (!COINBASE_COMMERCE_WEBHOOK_SECRET) {
          return {
            content: [{
              type: 'text',
              text: 'Error: COINBASE_COMMERCE_WEBHOOK_SECRET environment variable not set'
            }],
            isError: true
          };
        }

        const isValid = verifyWebhookSignature(raw_body, signature);
        
        // Parse webhook data for display
        let webhookData;
        try {
          webhookData = JSON.parse(raw_body);
        } catch (e) {
          webhookData = { error: 'Invalid JSON in raw body' };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              signature_valid: isValid,
              webhook_data: webhookData,
              verification_method: "HMAC-SHA256",
              provider: 'Coinbase Commerce'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error verifying webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Cancel charge
  server.registerTool(
    'coinbase-commerce-cancel-charge',
    {
      title: 'Cancel Coinbase Commerce Charge',
      description: 'Cancel a charge that has not been completed',
      inputSchema: {
        charge_id: z.string().describe('Charge ID to cancel')
      }
    },
    async ({ charge_id }) => {
      try {
        const result = await makeCoinbaseCommerceRequest(`/charges/${charge_id}/cancel`, 'POST');
        
        const charge: ChargeResponse = result.data;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              charge_id: charge.id,
              charge_code: charge.code,
              name: charge.name,
              status: charge.timeline?.[charge.timeline.length - 1]?.status || 'unknown',
              cancelled_at: new Date().toISOString(),
              provider: 'Coinbase Commerce'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error cancelling charge: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Resolve charge
  server.registerTool(
    'coinbase-commerce-resolve-charge',
    {
      title: 'Resolve Coinbase Commerce Charge',
      description: 'Resolve an unresolved charge by marking it as completed or cancelled',
      inputSchema: {
        charge_id: z.string().describe('Charge ID to resolve'),
        resolution: z.enum(['completed', 'cancelled']).describe('Resolution type')
      }
    },
    async ({ charge_id, resolution }) => {
      try {
        const result = await makeCoinbaseCommerceRequest(`/charges/${charge_id}/resolve`, 'POST', {
          resolution
        });
        
        const charge: ChargeResponse = result.data;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              charge_id: charge.id,
              charge_code: charge.code,
              name: charge.name,
              resolution: resolution,
              status: charge.timeline?.[charge.timeline.length - 1]?.status || 'unknown',
              resolved_at: new Date().toISOString(),
              provider: 'Coinbase Commerce'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error resolving charge: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );
}