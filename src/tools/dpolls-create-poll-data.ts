import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ethers } from 'ethers';
import { NERO_CHAIN, DPOLLS_CONTRACT_ADDRESS, DPOLLS_ABI, provider } from '../config/nero-chain.js';

export function registerDpollsCreatePollDataTool(server: McpServer) {
  server.registerTool(
    'dpolls-create-poll-data',
    {
      title: 'Generate Poll Creation Data',
      description: 'Generate transaction data for creating a new poll on the DPolls contract',
      inputSchema: {
        question: z.string().min(1).describe('The poll question'),
        options: z.array(z.string().min(1)).min(2).describe('Array of poll options (minimum 2)'),
        durationHours: z.number().min(1).describe('Duration of the poll in hours')
      }
    },
    async ({ question, options, durationHours }) => {
      try {
        console.error('Calling dpolls-create-poll-data with:', { question, options, durationHours });
        
        const contract = new ethers.Contract(DPOLLS_CONTRACT_ADDRESS, DPOLLS_ABI, provider);
        const durationSeconds = durationHours * 60 * 60; // Convert hours to seconds
        
        // Generate the transaction data
        const txData = contract.interface.encodeFunctionData('createPoll', [
          question,
          options,
          durationSeconds
        ]);
        
        return {
          content: [{
            type: 'text',
            text: `Poll Creation Transaction Data:

Contract Address: ${DPOLLS_CONTRACT_ADDRESS}
Network: ${NERO_CHAIN.name} (Chain ID: ${NERO_CHAIN.chainId})
RPC URL: ${NERO_CHAIN.rpc}

Transaction Data:
To: ${DPOLLS_CONTRACT_ADDRESS}
Data: ${txData}

Poll Details:
Question: ${question}
Options: ${options.map((opt, i) => `${i + 1}. ${opt}`).join(', ')}
Duration: ${durationHours} hours (${durationSeconds} seconds)

You can use this data to create a transaction in your wallet or web3 application.
Gas limit recommendation: 200,000 - 300,000 NERO`
          }]
        };
      } catch (error: any) {
        console.error('Error generating poll creation data:', error);
        return {
          content: [{ type: 'text', text: `Error generating poll creation data: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}