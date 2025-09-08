import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import crypto from 'crypto';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { registerAllTools, TOOL_NAMES } from './tools/index.js';

// Create Express app
const app = express();
app.use(express.json());

// Configure CORS for browser compatibility
app.use(cors({
  origin: '*', // In production, specify allowed origins
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id'],
}));

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Create MCP server instance
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'simple-mcp-server',
    version: '1.0.0'
  });

  // Register all tools from modular files
  registerAllTools(server);

  // Register a static config resource
  server.registerResource(
    'config',
    'config://server',
    {
      title: 'Server Configuration',
      description: 'Server configuration information',
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: JSON.stringify({
          name: 'simple-mcp-server',
          version: '1.0.0',
          capabilities: ['tools', 'resources'],
          uptime: process.uptime()
        }, null, 2)
      }]
    })
  );

  // Register a dynamic status resource
  server.registerResource(
    'status',
    new ResourceTemplate('status://{component}', { list: undefined }),
    {
      title: 'Component Status',
      description: 'Status information for server components'
    },
    async (uri, { component }) => {
      const status = {
        server: 'healthy',
        database: 'connected',
        api: 'operational',
        cache: 'active'
      };
      
      const componentStatus = status[component as keyof typeof status] || 'unknown';
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({
            component,
            status: componentStatus,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  );

  return server;
}

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  try {
    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          // Store the transport by session ID
          transports[sessionId] = transport;
        },
        // Enable DNS rebinding protection for security
        enableDnsRebindingProtection: true,
        allowedHosts: ['127.0.0.1', 'localhost', process.env.SERVER_HOST || 'ayamcp-hgigs.onrender.com']
      });

      console.log('allowedHosts', process.env.SERVER_HOST);
      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
        }
      };

      // Create and connect MCP server
      const server = createMcpServer();
      await server.connect(transport);
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    // Handle the request
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// Handle DELETE requests for session termination
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
  
  // Clean up the transport
  if (transport.sessionId) {
    delete transports[transport.sessionId];
  }
});

// Coinbase Commerce webhook endpoint
app.post('/webhook/coinbase-commerce', (req, res) => {
  try {
    const signature = req.headers['x-cc-webhook-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    console.log('Received Coinbase Commerce webhook:', {
      signature,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const computedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (computedSignature !== signature) {
        console.error('Invalid Coinbase Commerce webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Process webhook data
    const {
      id,
      type,
      api_version,
      created_at,
      data
    } = req.body;

    const charge = data;
    const {
      id: charge_id,
      code: charge_code,
      name,
      description,
      pricing,
      payments,
      timeline,
      metadata,
      addresses
    } = charge;

    console.log(`Coinbase Commerce event ${type} for charge ${charge_id} (${charge_code})`, {
      name,
      description,
      local_amount: pricing?.local?.amount,
      local_currency: pricing?.local?.currency,
      payments_count: payments?.length || 0,
      current_status: timeline?.[timeline?.length - 1]?.status,
      metadata,
      addresses
    });

    // Process different event types
    switch (type) {
      case 'charge:created':
        console.log(`Charge ${charge_id} created: ${name}`);
        break;
      case 'charge:confirmed':
        console.log(`Charge ${charge_id} confirmed - payment received and confirmed`);
        // Process successful payment - e.g., call gig marketplace contract
        break;
      case 'charge:failed':
        console.log(`Charge ${charge_id} failed`);
        break;
      case 'charge:delayed':
        console.log(`Charge ${charge_id} delayed - payment detected but not confirmed yet`);
        break;
      case 'charge:pending':
        console.log(`Charge ${charge_id} pending - payment received, waiting for confirmations`);
        break;
      case 'charge:resolved':
        console.log(`Charge ${charge_id} resolved - previously unresolved charge has been resolved`);
        break;
      default:
        console.log(`Unknown Coinbase Commerce event type: ${type}`);
    }

    // Here you would typically:
    // 1. Update your database with the charge status
    // 2. Process the order based on event type
    // 3. Send notifications to users
    // 4. Update gig marketplace contract if needed

    // Always respond with 200 OK to acknowledge receipt
    res.status(200).json({ 
      status: 'received',
      event_id: id,
      event_type: type,
      charge_id: charge_id,
      processed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing Coinbase Commerce webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CoinPayments webhook endpoint (IPN)
app.post('/webhook/coinpayments', (req, res) => {
  try {
    const hmacSignature = req.headers['hmac'] as string;
    
    // Get raw POST data
    const postData = Object.keys(req.body)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(req.body[key])}`)
      .join('&');

    console.log('Received CoinPayments IPN:', {
      hmac: hmacSignature,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    // Verify IPN signature if secret is configured
    const ipnSecret = process.env.COINPAYMENTS_IPN_SECRET;
    if (ipnSecret && hmacSignature) {
      const computedHmac = crypto
        .createHmac('sha512', ipnSecret)
        .update(postData)
        .digest('hex');

      if (computedHmac !== hmacSignature) {
        console.error('Invalid CoinPayments IPN signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Process IPN data
    const {
      txn_id,
      status,
      status_text,
      currency1,
      currency2,
      amount1,
      amount2,
      fee,
      buyer_name,
      email,
      item_name,
      item_number,
      invoice,
      custom,
      ipn_version,
      ipn_type,
      merchant,
      received_amount,
      received_confirms
    } = req.body;

    console.log(`CoinPayments transaction ${txn_id} status: ${status} (${status_text})`, {
      currency1,
      currency2,
      amount1,
      amount2,
      fee,
      buyer_name,
      email,
      item_name,
      item_number,
      invoice,
      custom,
      received_amount,
      received_confirms
    });

    // Process different payment statuses
    switch (parseInt(status)) {
      case -1:
        console.log(`Payment ${txn_id} cancelled/timed out`);
        break;
      case 0:
        console.log(`Payment ${txn_id} waiting for buyer funds`);
        break;
      case 1:
        console.log(`Payment ${txn_id} confirmed - coin reception confirmed`);
        break;
      case 2:
        console.log(`Payment ${txn_id} queued for payout`);
        break;
      case 3:
        console.log(`Payment ${txn_id} payout sent successfully`);
        break;
      case 100:
        console.log(`Payment ${txn_id} completed successfully`);
        // Process successful payment - e.g., call gig marketplace contract
        break;
      default:
        console.log(`Unknown payment status: ${status} for transaction ${txn_id}`);
    }

    // Here you would typically:
    // 1. Update your database with the payment status
    // 2. Process the order based on status
    // 3. Send notifications to users
    // 4. Update gig marketplace contract if needed

    // Always respond with 200 OK to acknowledge receipt
    res.status(200).send('IPN received');

  } catch (error) {
    console.error('Error processing CoinPayments IPN:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NowPayments webhook endpoint
app.post('/webhook/nowpayments', (req, res) => {
  try {
    const signature = req.headers['x-nowpayments-sig'] as string;
    const webhookBody = req.body;

    console.log('Received NowPayments webhook:', {
      signature,
      body: webhookBody,
      timestamp: new Date().toISOString()
    });

    // Verify webhook signature if IPN secret is configured
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (ipnSecret && signature) {
      // Sort parameters alphabetically
      const sortedParams = Object.keys(webhookBody)
        .sort()
        .reduce((result: any, key) => {
          result[key] = webhookBody[key];
          return result;
        }, {});

      // Create JSON string with sorted keys
      const sortedJson = JSON.stringify(sortedParams);

      // Create HMAC-SHA512 hash
      const computedSignature = crypto
        .createHmac('sha512', ipnSecret)
        .update(sortedJson)
        .digest('hex');

      if (computedSignature !== signature) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Process webhook data
    const {
      payment_id,
      payment_status,
      order_id,
      pay_amount,
      pay_currency,
      price_amount,
      price_currency,
      actually_paid,
      purchase_id,
      created_at,
      updated_at
    } = webhookBody;

    console.log(`Payment ${payment_id} for order ${order_id} status: ${payment_status}`, {
      pay_amount,
      pay_currency,
      price_amount,
      price_currency,
      actually_paid,
      purchase_id,
      created_at,
      updated_at
    });

    // Here you would typically:
    // 1. Update your database with the payment status
    // 2. Process the order based on payment_status
    // 3. Send notifications to users
    // 4. Update gig marketplace contract if needed

    switch (payment_status) {
      case 'waiting':
        console.log(`Payment ${payment_id} is waiting for payment`);
        break;
      case 'confirming':
        console.log(`Payment ${payment_id} received, waiting for confirmations`);
        break;
      case 'confirmed':
        console.log(`Payment ${payment_id} confirmed on blockchain`);
        break;
      case 'finished':
        console.log(`Payment ${payment_id} completed successfully for order ${order_id}`);
        // Process successful payment - e.g., call gig marketplace contract
        break;
      case 'partially_paid':
        console.log(`Payment ${payment_id} partially paid: ${actually_paid}/${pay_amount} ${pay_currency}`);
        break;
      case 'failed':
      case 'expired':
        console.log(`Payment ${payment_id} ${payment_status} for order ${order_id}`);
        break;
      default:
        console.log(`Unknown payment status: ${payment_status}`);
    }

    // Always respond with 200 OK to acknowledge receipt
    res.status(200).json({ 
      status: 'received',
      payment_id,
      payment_status,
      processed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing NowPayments webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Direct crypto payment webhook endpoint
app.post('/webhook/direct-crypto', (req, res) => {
  try {
    const signature = req.headers['x-crypto-signature'] as string;
    const webhookBody = req.body;

    console.log('Received direct crypto payment webhook:', {
      signature,
      body: webhookBody,
      timestamp: new Date().toISOString()
    });

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.DIRECT_CRYPTO_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const computedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(webhookBody))
        .digest('hex');

      const expectedSignature = `sha256=${computedSignature}`;
      
      if (expectedSignature !== signature) {
        console.error('Invalid direct crypto payment webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Process webhook data
    const {
      transaction_hash,
      contract_address,
      from_address,
      to_address,
      amount,
      currency,
      block_number,
      block_timestamp,
      gas_used,
      gas_price,
      order_id,
      gig_id,
      client_address,
      provider_address,
      payment_type, // 'gig_payment', 'escrow_release', 'refund'
      network, // 'mainnet', 'testnet', 'polygon', etc.
      confirmations
    } = webhookBody;

    console.log(`Direct crypto payment detected: ${transaction_hash}`, {
      contract_address,
      from_address,
      to_address,
      amount,
      currency,
      block_number,
      block_timestamp,
      gas_used,
      gas_price,
      order_id,
      gig_id,
      client_address,
      provider_address,
      payment_type,
      network,
      confirmations
    });

    // Process different payment types
    switch (payment_type) {
      case 'gig_payment':
        console.log(`Gig payment received for gig ${gig_id}, order ${order_id}: ${amount} ${currency}`);
        // Process gig payment - update order status, notify provider
        break;
      case 'escrow_release':
        console.log(`Escrow released for order ${order_id}: ${amount} ${currency} to provider ${provider_address}`);
        // Process escrow release - update order completion, notify provider
        break;
      case 'refund':
        console.log(`Refund processed for order ${order_id}: ${amount} ${currency} to client ${client_address}`);
        // Process refund - update order status, notify client
        break;
      case 'tip':
        console.log(`Tip received for gig ${gig_id}: ${amount} ${currency} to provider ${provider_address}`);
        // Process tip - notify provider, update stats
        break;
      default:
        console.log(`Unknown payment type: ${payment_type} for transaction ${transaction_hash}`);
    }

    // Validation checks
    if (!transaction_hash || !contract_address || !amount || !currency) {
      console.error('Missing required fields in webhook payload');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check confirmation threshold
    const minConfirmations = parseInt(process.env.MIN_CONFIRMATIONS || '6');
    if (confirmations && confirmations < minConfirmations) {
      console.log(`Transaction ${transaction_hash} has only ${confirmations} confirmations, waiting for ${minConfirmations}`);
      // You might want to store this and process later when enough confirmations
    }

    // Here you would typically:
    // 1. Store the transaction in your database
    // 2. Update gig/order status based on payment_type
    // 3. Send notifications to relevant parties
    // 4. Update smart contract state if needed
    // 5. Process business logic (release escrow, complete order, etc.)

    // Example response with processing details
    const processingResult = {
      status: 'received',
      transaction_hash,
      payment_type,
      amount,
      currency,
      network,
      confirmations,
      processing_status: confirmations >= minConfirmations ? 'processed' : 'pending_confirmations',
      processed_at: new Date().toISOString(),
      order_id,
      gig_id
    };

    console.log('Direct crypto payment processing result:', processingResult);

    // Always respond with 200 OK to acknowledge receipt
    res.status(200).json(processingResult);

  } catch (error) {
    console.error('Error processing direct crypto payment webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    sessions: Object.keys(transports).length
  });
});

// Root endpoint with basic info
app.get('/', (_req, res) => {
  res.json({
    name: 'Simple MCP Server',
    version: '1.0.0',
    description: 'A simple Model Context Protocol server with Streamable HTTP transport',
    endpoints: {
      mcp: '/mcp',
      health: '/health',
      webhook_nowpayments: '/webhook/nowpayments',
      webhook_coinpayments: '/webhook/coinpayments',
      webhook_coinbase_commerce: '/webhook/coinbase-commerce',
      webhook_direct_crypto: '/webhook/direct-crypto'
    },
    tools: TOOL_NAMES,
    resources: ['config://server', 'status://{component}']
  });
});

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.error(`🚀 MCP Server listening on port ${PORT}`);
  console.error(`📡 MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
  console.error(`❤️ Health check: http://0.0.0.0:${PORT}/health`);
});