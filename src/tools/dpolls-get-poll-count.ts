import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ethers } from 'ethers';
import { NERO_CHAIN, DPOLLS_CONTRACT_ADDRESS, DPOLLS_ABI, provider } from '../config/nero-chain.js';

export function registerDpollsGetPollCountTool(server: McpServer) {
  server.registerTool(
    'dpolls-get-poll-count',
    {
      title: 'Get Total Poll Count',
      description: 'Get the total number of polls created in the DPolls contract on NERO mainnet',
      inputSchema: {}
    },
    async () => {
      try {
        console.error('Calling dpolls-get-poll-count');
        
        const contract = new ethers.Contract(DPOLLS_CONTRACT_ADDRESS, DPOLLS_ABI, provider);
        const count = await contract.getPollCount();
        
        return {
          content: [{
            type: 'text',
            text: `Total polls created: ${count.toString()}
Contract Address: ${DPOLLS_CONTRACT_ADDRESS}
Network: ${NERO_CHAIN.name}
Explorer: ${NERO_CHAIN.explorer}/address/${DPOLLS_CONTRACT_ADDRESS}`
          }]
        };
      } catch (error: any) {
        console.error('Error getting poll count:', error);
        return {
          content: [{ type: 'text', text: `Error retrieving poll count: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}