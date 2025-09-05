import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ethers } from 'ethers';
import { NERO_CHAIN, DPOLLS_CONTRACT_ADDRESS, DPOLLS_ABI, provider } from '../config/nero-chain.js';

export function registerDpollsGetPollTool(server: McpServer) {
  server.registerTool(
    'dpolls-get-poll',
    {
      title: 'Get DPoll Information',
      description: 'Get details about a specific poll from the DPolls contract on NERO mainnet',
      inputSchema: {
        pollId: z.number().min(0).describe('The ID of the poll to retrieve')
      }
    },
    async ({ pollId }) => {
      try {
        console.error('Calling dpolls-get-poll with pollId:', pollId);
        
        const contract = new ethers.Contract(DPOLLS_CONTRACT_ADDRESS, DPOLLS_ABI, provider);
        const pollData = await contract.getPoll(pollId);
        
        const [question, options, votes, creator, endTime, isActive] = pollData;
        
        // Format the poll data
        const pollInfo = {
          id: pollId,
          question: question,
          options: options,
          votes: votes.map((v: any) => v.toString()),
          creator: creator,
          endTime: new Date(Number(endTime) * 1000).toISOString(),
          isActive: isActive,
          totalVotes: votes.reduce((sum: any, vote: any) => sum + vote, 0n).toString()
        };
        
        return {
          content: [{
            type: 'text',
            text: `Poll #${pollId}:
Question: ${question}
Options: ${options.map((option: any, i: number) => `${i}: ${option} (${votes[i]} votes)`).join(', ')}
Creator: ${creator}
End Time: ${pollInfo.endTime}
Active: ${isActive}
Total Votes: ${pollInfo.totalVotes}
Explorer: ${NERO_CHAIN.explorer}/tx/${DPOLLS_CONTRACT_ADDRESS}`
          }]
        };
      } catch (error: any) {
        console.error('Error getting poll:', error);
        return {
          content: [{ type: 'text', text: `Error retrieving poll ${pollId}: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}