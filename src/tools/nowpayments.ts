import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import crypto from 'crypto';

// NowPayments API configuration
const NOWPAYMENTS_API_BASE = 'https://api.nowpayments.io/v1';
const NOWPAYMENTS_SANDBOX_BASE = 'https://api-sandbox.nowpayments.io/v1';

// Get configuration from environment variables
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;
const USE_SANDBOX = process.env.NOWPAYMENTS_SANDBOX === 'true';

const API_BASE = USE_SANDBOX ? NOWPAYMENTS_SANDBOX_BASE : NOWPAYMENTS_API_BASE;

// Invoice creation interface
interface CreateInvoiceRequest {
  price_amount: number;
  price_currency: string;
  pay_currency?: string;
  ipn_callback_url?: string;
  order_id?: string;
  order_description?: string;
  success_url?: string;
  cancel_url?: string;
}

interface InvoiceResponse {
  id: string;
  order_id: string;
  order_description: string;
  price_amount: number;
  price_currency: string;
  pay_currency: string;
  ipn_callback_url?: string;
  invoice_url: string;
  success_url?: string;
  cancel_url?: string;
  created_at: string;
  updated_at: string;
  pay_address?: string;
  pay_amount?: number;
  qr_code?: string;
}

interface PaymentStatus {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  created_at: string;
  updated_at: string;
  outcome_amount?: number;
  outcome_currency?: string;
}

// Helper function to make API requests
async function makeNowPaymentsRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<any> {
  if (!NOWPAYMENTS_API_KEY) {
    throw new Error('NOWPAYMENTS_API_KEY environment variable not set');
  }

  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'x-api-key': NOWPAYMENTS_API_KEY,
    'Content-Type': 'application/json',
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
    throw new Error(`NowPayments API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// Helper function to verify webhook signature
function verifyWebhookSignature(body: any, signature: string): boolean {
  if (!NOWPAYMENTS_IPN_SECRET) {
    return false;
  }

  // Sort parameters alphabetically
  const sortedParams = Object.keys(body)
    .sort()
    .reduce((result: any, key) => {
      result[key] = body[key];
      return result;
    }, {});

  // Create JSON string with sorted keys
  const sortedJson = JSON.stringify(sortedParams);

  // Create HMAC-SHA512 hash
  const computedSignature = crypto
    .createHmac('sha512', NOWPAYMENTS_IPN_SECRET)
    .update(sortedJson)
    .digest('hex');

  return computedSignature === signature;
}

export function registerNowPaymentsTool(server: McpServer) {
  // Get available currencies
  server.registerTool(
    'nowpayments-get-currencies',
    {
      title: 'Get Available Currencies',
      description: 'Get list of available cryptocurrencies supported by NowPayments',
      inputSchema: {}
    },
    async () => {
      try {
        const currencies = await makeNowPaymentsRequest('/currencies');
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              currencies: currencies.currencies,
              environment: USE_SANDBOX ? 'sandbox' : 'production',
              total_currencies: currencies.currencies.length
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting currencies: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Get estimated price
  server.registerTool(
    'nowpayments-get-estimate',
    {
      title: 'Get Price Estimate',
      description: 'Get estimated price for crypto payment based on current exchange rates',
      inputSchema: {
        amount: z.number().describe('Amount in the source currency'),
        currency_from: z.string().describe('Source currency (e.g., "usd", "eur")'),
        currency_to: z.string().describe('Target cryptocurrency (e.g., "btc", "eth")')
      }
    },
    async ({ amount, currency_from, currency_to }) => {
      try {
        const estimate = await makeNowPaymentsRequest(
          `/estimate?amount=${amount}&currency_from=${currency_from}&currency_to=${currency_to}`
        );
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              estimated_amount: estimate.estimated_amount,
              currency_from: estimate.currency_from,
              currency_to: estimate.currency_to,
              amount_from: estimate.amount_from,
              environment: USE_SANDBOX ? 'sandbox' : 'production'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting estimate: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Create invoice
  server.registerTool(
    'nowpayments-create-invoice',
    {
      title: 'Create Crypto Payment Invoice',
      description: 'Create a crypto payment invoice with QR code and payment URL for gig marketplace',
      inputSchema: {
        price_amount: z.number().describe('Payment amount in fiat currency'),
        price_currency: z.string().describe('Fiat currency (e.g., "usd", "eur")'),
        pay_currency: z.string().optional().describe('Preferred cryptocurrency (optional)'),
        gig_id: z.string().describe('Gig ID from marketplace'),
        order_description: z.string().describe('Description of the order/gig'),
        ipn_callback_url: z.string().optional().describe('Webhook URL for payment notifications'),
        success_url: z.string().optional().describe('Redirect URL after successful payment'),
        cancel_url: z.string().optional().describe('Redirect URL if payment is cancelled')
      }
    },
    async ({ price_amount, price_currency, pay_currency, gig_id, order_description, ipn_callback_url, success_url, cancel_url }) => {
      try {
        const invoiceRequest: CreateInvoiceRequest = {
          price_amount,
          price_currency,
          pay_currency,
          order_id: gig_id,
          order_description,
          ipn_callback_url,
          success_url,
          cancel_url
        };

        const invoice: InvoiceResponse = await makeNowPaymentsRequest('/invoice', 'POST', invoiceRequest);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              invoice_id: invoice.id,
              invoice_url: invoice.invoice_url,
              qr_code: invoice.qr_code,
              pay_address: invoice.pay_address,
              pay_amount: invoice.pay_amount,
              pay_currency: invoice.pay_currency,
              price_amount: invoice.price_amount,
              price_currency: invoice.price_currency,
              order_id: invoice.order_id,
              order_description: invoice.order_description,
              created_at: invoice.created_at,
              success_url: invoice.success_url,
              cancel_url: invoice.cancel_url,
              environment: USE_SANDBOX ? 'sandbox' : 'production',
              payment_instructions: {
                scan_qr: "User can scan the QR code with their crypto wallet",
                manual_transfer: "User can manually copy the pay_address and send the exact pay_amount",
                web_checkout: "User can visit the invoice_url for a hosted checkout experience"
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error creating invoice: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Get payment status
  server.registerTool(
    'nowpayments-get-payment-status',
    {
      title: 'Get Payment Status',
      description: 'Check the status of a payment by payment ID',
      inputSchema: {
        payment_id: z.string().describe('Payment ID from NowPayments')
      }
    },
    async ({ payment_id }) => {
      try {
        const status: PaymentStatus = await makeNowPaymentsRequest(`/payment/${payment_id}`);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              payment_id: status.payment_id,
              payment_status: status.payment_status,
              pay_address: status.pay_address,
              price_amount: status.price_amount,
              price_currency: status.price_currency,
              pay_amount: status.pay_amount,
              actually_paid: status.actually_paid,
              pay_currency: status.pay_currency,
              order_id: status.order_id,
              order_description: status.order_description,
              purchase_id: status.purchase_id,
              created_at: status.created_at,
              updated_at: status.updated_at,
              outcome_amount: status.outcome_amount,
              outcome_currency: status.outcome_currency,
              environment: USE_SANDBOX ? 'sandbox' : 'production',
              status_meaning: {
                waiting: "Payment is waiting to be received",
                confirming: "Payment received, waiting for blockchain confirmations",
                confirmed: "Payment confirmed on blockchain", 
                sending: "Payment is being processed and sent to your wallet",
                partially_paid: "Partial payment received",
                finished: "Payment completed successfully",
                failed: "Payment failed",
                refunded: "Payment was refunded",
                expired: "Payment expired"
              }[status.payment_status] || "Unknown status"
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting payment status: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Verify webhook signature
  server.registerTool(
    'nowpayments-verify-webhook',
    {
      title: 'Verify Webhook Signature',
      description: 'Verify the authenticity of a NowPayments webhook using HMAC-SHA512 signature',
      inputSchema: {
        webhook_body: z.string().describe('JSON string of the webhook body'),
        signature: z.string().describe('Signature from x-nowpayments-sig header')
      }
    },
    async ({ webhook_body, signature }) => {
      try {
        if (!NOWPAYMENTS_IPN_SECRET) {
          return {
            content: [{
              type: 'text',
              text: 'Error: NOWPAYMENTS_IPN_SECRET environment variable not set'
            }],
            isError: true
          };
        }

        const parsedBody = JSON.parse(webhook_body);
        const isValid = verifyWebhookSignature(parsedBody, signature);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              signature_valid: isValid,
              webhook_data: parsedBody,
              verification_method: "HMAC-SHA512 with sorted JSON keys",
              environment: USE_SANDBOX ? 'sandbox' : 'production'
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
}