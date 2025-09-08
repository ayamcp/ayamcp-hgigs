import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createComput3Client } from '../lib/comput3-client.js';

export function registerComput3Tool(server: McpServer) {
  // Text completion tool
  server.registerTool(
    'comput3-text-completion',
    {
      title: 'AI Text Completion',
      description: 'Generate text completions using Comput3 AI',
      inputSchema: {
        prompt: z.string().describe('The text prompt for completion'),
        max_tokens: z.number().optional().describe('Maximum number of tokens to generate'),
        temperature: z.number().min(0).max(2).optional().describe('Sampling temperature (0-2)'),
        model: z.string().optional().describe('Model to use for completion')
      }
    },
    async ({ prompt, max_tokens, temperature, model }) => {
      try {
        const client = createComput3Client();
        const response = await client.createTextCompletion({
          prompt,
          max_tokens,
          temperature,
          model
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              completion: response.choices[0]?.text || '',
              usage: response.usage
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Image generation tool
  server.registerTool(
    'comput3-image-generation',
    {
      title: 'AI Image Generation',
      description: 'Generate images using Comput3 AI',
      inputSchema: {
        prompt: z.string().describe('The text prompt for image generation'),
        width: z.number().optional().describe('Image width in pixels'),
        height: z.number().optional().describe('Image height in pixels'),
        steps: z.number().optional().describe('Number of diffusion steps'),
        guidance_scale: z.number().optional().describe('Guidance scale for generation'),
        model: z.string().optional().describe('Model to use for image generation')
      }
    },
    async ({ prompt, width, height, steps, guidance_scale, model }) => {
      try {
        const client = createComput3Client();
        const response = await client.generateImage({
          prompt,
          width,
          height,
          steps,
          guidance_scale,
          model
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              job_id: response.id,
              status: response.status,
              images: response.images
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Video generation tool
  server.registerTool(
    'comput3-video-generation',
    {
      title: 'AI Video Generation',
      description: 'Generate videos using Comput3 AI',
      inputSchema: {
        prompt: z.string().describe('The text prompt for video generation'),
        duration: z.number().optional().describe('Video duration in seconds'),
        fps: z.number().optional().describe('Frames per second'),
        width: z.number().optional().describe('Video width in pixels'),
        height: z.number().optional().describe('Video height in pixels'),
        model: z.string().optional().describe('Model to use for video generation')
      }
    },
    async ({ prompt, duration, fps, width, height, model }) => {
      try {
        const client = createComput3Client();
        const response = await client.generateVideo({
          prompt,
          duration,
          fps,
          width,
          height,
          model
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              job_id: response.id,
              status: response.status,
              video_url: response.video_url,
              progress: response.progress
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Job status checking tool
  server.registerTool(
    'comput3-job-status',
    {
      title: 'Check Job Status',
      description: 'Check the status of a Comput3 AI job',
      inputSchema: {
        job_id: z.string().describe('The job ID to check status for')
      }
    },
    async ({ job_id }) => {
      try {
        const client = createComput3Client();
        const response = await client.getJobStatus(job_id);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              job_id,
              status: response.status,
              result: response.result,
              progress: response.progress,
              error: response.error
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Enhanced gig description tool
  server.registerTool(
    'comput3-enhance-gig-description',
    {
      title: 'Enhance Gig Description',
      description: 'Enhance gig descriptions using AI to make them more appealing and professional',
      inputSchema: {
        title: z.string().describe('The gig title'),
        description: z.string().describe('The current gig description'),
        category: z.string().optional().describe('The gig category'),
        price: z.number().optional().describe('The gig price')
      }
    },
    async ({ title, description, category, price }) => {
      try {
        const client = createComput3Client();
        
        const enhancementPrompt = `Please enhance this gig description to make it more professional, appealing, and detailed:

Title: ${title}
Current Description: ${description}
${category ? `Category: ${category}` : ''}
${price ? `Price: $${price}` : ''}

Please provide an enhanced version that:
- Is more engaging and professional
- Highlights key benefits and value propositions
- Uses persuasive language
- Is well-structured and easy to read
- Maintains the original intent

Enhanced Description:`;

        const response = await client.createTextCompletion({
          prompt: enhancementPrompt,
          max_tokens: 500,
          temperature: 0.7
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              original_description: description,
              enhanced_description: response.choices[0]?.text?.trim() || '',
              usage: response.usage
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Generate gig promotional image tool
  server.registerTool(
    'comput3-generate-gig-image',
    {
      title: 'Generate Gig Image',
      description: 'Generate promotional images for gigs using AI',
      inputSchema: {
        title: z.string().describe('The gig title'),
        description: z.string().describe('The gig description'),
        style: z.string().optional().describe('Image style preference (e.g., professional, creative, modern)')
      }
    },
    async ({ title, description, style = 'professional' }) => {
      try {
        const client = createComput3Client();
        
        const imagePrompt = `Create a ${style} promotional image for this service:
Title: ${title}
Description: ${description}

The image should be visually appealing, professional, and represent the service being offered. Include relevant visual elements that convey the service quality and professionalism.`;

        const response = await client.generateImage({
          prompt: imagePrompt,
          width: 1024,
          height: 768,
          steps: 20,
          guidance_scale: 7.5
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              job_id: response.id,
              status: response.status,
              images: response.images,
              gig_title: title,
              style_used: style
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );
}