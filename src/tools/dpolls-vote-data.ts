import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ethers } from 'ethers';
import { NERO_CHAIN, DPOLLS_CONTRACT_ADDRESS, DPOLLS_ABI, provider } from '../config/nero-chain.js';

export function registerDpollsVoteDataTool(server: McpServer) {
  server.registerTool(
    'dpolls-vote-data',
    {
      title: 'Generate Vote Transaction Data',
      description: 'Generate transaction data for voting on a poll in the DPolls contract',
      inputSchema: {
        pollId: z.number().min(0).describe('The ID of the poll to vote on'),
        optionIndex: z.number().min(0).describe('The index of the option to vote for (0-based)')
      }
    },
    async ({ pollId, optionIndex }) => {
      try {
        console.error('Calling dpolls-vote-data with:', { pollId, optionIndex });
        
        const contract = new ethers.Contract(DPOLLS_CONTRACT_ADDRESS, DPOLLS_ABI, provider);
        
        // Generate the transaction data
        const txData = contract.interface.encodeFunctionData('vote', [
          pollId,
          optionIndex
        ]);
        
        return {
          content: [{
            type: 'text',
            text: `Vote Transaction Data:

Contract Address: ${DPOLLS_CONTRACT_ADDRESS}
Network: ${NERO_CHAIN.name} (Chain ID: ${NERO_CHAIN.chainId})
RPC URL: ${NERO_CHAIN.rpc}

Transaction Data:
To: ${DPOLLS_CONTRACT_ADDRESS}
Data: ${txData}

Vote Details:
Poll ID: ${pollId}
Option Index: ${optionIndex}

You can use this data to create a transaction in your wallet or web3 application.
Gas limit recommendation: 50,000 - 100,000 NERO`
          }]
        };
      } catch (error: any) {
        console.error('Error generating vote data:', error);
        return {
          content: [{ type: 'text', text: `Error generating vote data: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}