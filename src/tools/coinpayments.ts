import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import crypto from 'crypto';

// CoinPayments API configuration
const COINPAYMENTS_API_BASE = 'https://www.coinpayments.net/api.php';

// Get configuration from environment variables
const COINPAYMENTS_PUBLIC_KEY = process.env.COINPAYMENTS_PUBLIC_KEY;
const COINPAYMENTS_PRIVATE_KEY = process.env.COINPAYMENTS_PRIVATE_KEY;
const COINPAYMENTS_IPN_SECRET = process.env.COINPAYMENTS_IPN_SECRET;
const COINPAYMENTS_MERCHANT_ID = process.env.COINPAYMENTS_MERCHANT_ID;

// Transaction interfaces
interface CreateTransactionRequest {
  version: string;
  cmd: string;
  key: string;
  amount: number;
  currency1: string;
  currency2: string;
  buyer_email?: string;
  buyer_name?: string;
  item_name?: string;
  item_number?: string;
  invoice?: string;
  custom?: string;
  success_url?: string;
  cancel_url?: string;
  ipn_url?: string;
  format: string;
}

interface TransactionResponse {
  error?: string;
  result?: {
    amount: string;
    address: string;
    txn_id: string;
    confirms_needed: string;
    timeout: number;
    status_url: string;
    qrcode_url: string;
  };
}

interface TransactionInfoResponse {
  error?: string;
  result?: {
    time_created: number;
    time_expires: number;
    status: number;
    status_text: string;
    type: string;
    coin: string;
    amount: number;
    amountf: string;
    received: number;
    receivedf: string;
    recv_confirms: number;
    payment_address: string;
  };
}

interface RatesResponse {
  error?: string;
  result?: {
    [key: string]: {
      is_fiat: number;
      rate_btc: string;
      last_update: string;
      tx_fee: string;
      status: string;
      name: string;
      confirms: string;
      can_convert: number;
    };
  };
}

// Helper function to generate HMAC signature
function generateHmacSignature(postData: string): string {
  if (!COINPAYMENTS_PRIVATE_KEY) {
    throw new Error('COINPAYMENTS_PRIVATE_KEY not configured');
  }
  
  return crypto
    .createHmac('sha512', COINPAYMENTS_PRIVATE_KEY)
    .update(postData)
    .digest('hex');
}

// Helper function to make CoinPayments API requests
async function makeCoinPaymentsRequest(params: Record<string, any>): Promise<any> {
  if (!COINPAYMENTS_PUBLIC_KEY || !COINPAYMENTS_PRIVATE_KEY) {
    throw new Error('CoinPayments API keys not configured');
  }

  // Add required parameters
  params.version = '1';
  params.key = COINPAYMENTS_PUBLIC_KEY;
  params.format = 'json';

  // Create POST data string
  const postData = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // Generate HMAC signature
  const hmacSignature = generateHmacSignature(postData);

  // Make API request
  const response = await fetch(COINPAYMENTS_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'HMAC': hmacSignature,
    },
    body: postData,
  });

  if (!response.ok) {
    throw new Error(`CoinPayments API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.error && result.error !== 'ok') {
    throw new Error(`CoinPayments API error: ${result.error}`);
  }

  return result;
}

// Helper function to verify IPN signature
function verifyIpnSignature(postData: string, receivedHmac: string): boolean {
  if (!COINPAYMENTS_IPN_SECRET) {
    return false;
  }

  const computedHmac = crypto
    .createHmac('sha512', COINPAYMENTS_IPN_SECRET)
    .update(postData)
    .digest('hex');

  return computedHmac === receivedHmac;
}

export function registerCoinPaymentsTool(server: McpServer) {
  // Get exchange rates
  server.registerTool(
    'coinpayments-get-rates',
    {
      title: 'Get Exchange Rates',
      description: 'Get current exchange rates for all supported cryptocurrencies',
      inputSchema: {
        short: z.number().optional().describe('Set to 1 to get short list of currencies, 0 for all (default: 0)')
      }
    },
    async ({ short = 0 }) => {
      try {
        const result: RatesResponse = await makeCoinPaymentsRequest({
          cmd: 'rates',
          short
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              rates: result.result,
              currencies_count: Object.keys(result.result || {}).length,
              provider: 'CoinPayments'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting rates: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Create transaction
  server.registerTool(
    'coinpayments-create-transaction',
    {
      title: 'Create Crypto Payment Transaction',
      description: 'Create a cryptocurrency payment transaction with QR code and payment address',
      inputSchema: {
        amount: z.number().describe('Payment amount'),
        currency1: z.string().describe('Source currency (e.g., "USD", "EUR", or crypto)'),
        currency2: z.string().describe('Cryptocurrency to receive (e.g., "BTC", "ETH", "LTC")'),
        buyer_email: z.string().optional().describe('Buyer email address'),
        buyer_name: z.string().optional().describe('Buyer name'),
        item_name: z.string().describe('Item/gig name'),
        item_number: z.string().optional().describe('Item/gig ID'),
        invoice: z.string().optional().describe('Invoice ID'),
        custom: z.string().optional().describe('Custom data (gig details)'),
        success_url: z.string().optional().describe('Success redirect URL'),
        cancel_url: z.string().optional().describe('Cancel redirect URL'),
        ipn_url: z.string().optional().describe('IPN callback URL')
      }
    },
    async ({ amount, currency1, currency2, buyer_email, buyer_name, item_name, item_number, invoice, custom, success_url, cancel_url, ipn_url }) => {
      try {
        const params: any = {
          cmd: 'create_transaction',
          amount,
          currency1,
          currency2,
          item_name,
        };

        // Add optional parameters
        if (buyer_email) params.buyer_email = buyer_email;
        if (buyer_name) params.buyer_name = buyer_name;
        if (item_number) params.item_number = item_number;
        if (invoice) params.invoice = invoice;
        if (custom) params.custom = custom;
        if (success_url) params.success_url = success_url;
        if (cancel_url) params.cancel_url = cancel_url;
        if (ipn_url) params.ipn_url = ipn_url;

        const result: TransactionResponse = await makeCoinPaymentsRequest(params);

        if (result.result) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                transaction_id: result.result.txn_id,
                payment_address: result.result.address,
                amount_to_pay: result.result.amount,
                confirms_needed: result.result.confirms_needed,
                timeout_minutes: Math.floor(result.result.timeout / 60),
                status_url: result.result.status_url,
                qr_code_url: result.result.qrcode_url,
                currency: currency2,
                item_name,
                provider: 'CoinPayments',
                payment_instructions: {
                  scan_qr: "User can scan the QR code with their crypto wallet",
                  manual_transfer: "User can manually copy the payment_address and send the exact amount",
                  status_check: "Use status_url or transaction_id to check payment status"
                }
              }, null, 2)
            }]
          };
        } else {
          throw new Error('No transaction result received');
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error creating transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Get transaction info
  server.registerTool(
    'coinpayments-get-transaction-info',
    {
      title: 'Get Transaction Information',
      description: 'Get detailed information about a transaction by transaction ID',
      inputSchema: {
        txid: z.string().describe('Transaction ID from CoinPayments')
      }
    },
    async ({ txid }) => {
      try {
        const result: TransactionInfoResponse = await makeCoinPaymentsRequest({
          cmd: 'get_tx_info',
          txid
        });

        if (result.result) {
          const info = result.result;
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                transaction_id: txid,
                time_created: new Date(info.time_created * 1000).toISOString(),
                time_expires: new Date(info.time_expires * 1000).toISOString(),
                status: info.status,
                status_text: info.status_text,
                type: info.type,
                coin: info.coin,
                amount_expected: info.amountf,
                amount_received: info.receivedf,
                confirmations_received: info.recv_confirms,
                payment_address: info.payment_address,
                provider: 'CoinPayments',
                status_meanings: {
                  '-1': 'Cancelled/Timed Out',
                  '0': 'Waiting for buyer funds',
                  '1': 'We have confirmed coin reception from the buyer',
                  '2': 'Queued for nightly payout (if auto-payout enabled)',
                  '3': 'PayPal/withdrawal sent successfully',
                  '100': 'Payment Complete'
                }
              }, null, 2)
            }]
          };
        } else {
          throw new Error('No transaction information received');
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting transaction info: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Verify IPN signature
  server.registerTool(
    'coinpayments-verify-ipn',
    {
      title: 'Verify IPN Signature',
      description: 'Verify the authenticity of a CoinPayments IPN using HMAC-SHA512 signature',
      inputSchema: {
        ipn_data: z.string().describe('Raw POST data from IPN'),
        hmac_signature: z.string().describe('HMAC signature from HTTP header')
      }
    },
    async ({ ipn_data, hmac_signature }) => {
      try {
        if (!COINPAYMENTS_IPN_SECRET) {
          return {
            content: [{
              type: 'text',
              text: 'Error: COINPAYMENTS_IPN_SECRET environment variable not set'
            }],
            isError: true
          };
        }

        const isValid = verifyIpnSignature(ipn_data, hmac_signature);
        
        // Parse IPN data for display
        const parsedData: any = {};
        const pairs = ipn_data.split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          parsedData[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              signature_valid: isValid,
              ipn_data: parsedData,
              verification_method: "HMAC-SHA512",
              provider: 'CoinPayments'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error verifying IPN: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Get supported coins
  server.registerTool(
    'coinpayments-get-supported-coins',
    {
      title: 'Get Supported Coins',
      description: 'Get list of supported cryptocurrencies for payments',
      inputSchema: {}
    },
    async () => {
      try {
        const result = await makeCoinPaymentsRequest({
          cmd: 'get_supported_coins'
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              supported_coins: result.result,
              total_coins: Object.keys(result.result || {}).length,
              provider: 'CoinPayments'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting supported coins: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Convert coins
  server.registerTool(
    'coinpayments-convert',
    {
      title: 'Convert Between Currencies',
      description: 'Convert amount from one currency to another using current exchange rates',
      inputSchema: {
        amount: z.number().describe('Amount to convert'),
        from: z.string().describe('Source currency symbol'),
        to: z.string().describe('Target currency symbol')
      }
    },
    async ({ amount, from, to }) => {
      try {
        const result = await makeCoinPaymentsRequest({
          cmd: 'convert',
          amount,
          from,
          to
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              original_amount: amount,
              from_currency: from,
              to_currency: to,
              converted_amount: result.result,
              provider: 'CoinPayments'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error converting currencies: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );
}