import { createComput3Client } from './comput3-client.js';

export interface GigData {
  title: string;
  description: string;
  category?: string;
  price?: number;
  tags?: string[];
  requirements?: string[];
}

export interface EnhancedGigData extends GigData {
  enhancedDescription: string;
  suggestedTags: string[];
  marketingCopy: string;
  seoKeywords: string[];
}

export class AIGigEnhancer {
  private client;

  constructor() {
    this.client = createComput3Client();
  }

  async enhanceGig(gigData: GigData): Promise<EnhancedGigData> {
    const [
      enhancedDescription,
      suggestedTags,
      marketingCopy,
      seoKeywords
    ] = await Promise.all([
      this.enhanceDescription(gigData),
      this.generateTags(gigData),
      this.generateMarketingCopy(gigData),
      this.generateSEOKeywords(gigData)
    ]);

    return {
      ...gigData,
      enhancedDescription,
      suggestedTags,
      marketingCopy,
      seoKeywords
    };
  }

  private async enhanceDescription(gigData: GigData): Promise<string> {
    const prompt = `Enhance this gig description to make it more professional and appealing:

Title: ${gigData.title}
Current Description: ${gigData.description}
${gigData.category ? `Category: ${gigData.category}` : ''}
${gigData.price ? `Price: $${gigData.price}` : ''}

Please provide an enhanced version that:
- Is more engaging and professional
- Highlights key benefits and value propositions
- Uses persuasive language
- Is well-structured and easy to read
- Maintains the original intent
- Is optimized for conversions

Enhanced Description:`;

    const response = await this.client.createTextCompletion({
      prompt,
      max_tokens: 400,
      temperature: 0.7
    });

    return response.choices[0]?.text?.trim() || gigData.description;
  }

  private async generateTags(gigData: GigData): Promise<string[]> {
    const prompt = `Generate relevant tags for this gig that will help with discoverability:

Title: ${gigData.title}
Description: ${gigData.description}
${gigData.category ? `Category: ${gigData.category}` : ''}

Please provide 5-8 relevant tags as a comma-separated list:`;

    const response = await this.client.createTextCompletion({
      prompt,
      max_tokens: 100,
      temperature: 0.5
    });

    const tagsText = response.choices[0]?.text?.trim() || '';
    return tagsText.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  }

  private async generateMarketingCopy(gigData: GigData): Promise<string> {
    const prompt = `Create compelling marketing copy for this gig that would work well in ads or social media:

Title: ${gigData.title}
Description: ${gigData.description}
${gigData.price ? `Price: $${gigData.price}` : ''}

Please create a short, punchy marketing message (1-2 sentences) that highlights the value proposition:`;

    const response = await this.client.createTextCompletion({
      prompt,
      max_tokens: 150,
      temperature: 0.8
    });

    return response.choices[0]?.text?.trim() || '';
  }

  private async generateSEOKeywords(gigData: GigData): Promise<string[]> {
    const prompt = `Generate SEO keywords for this gig to improve search visibility:

Title: ${gigData.title}
Description: ${gigData.description}
${gigData.category ? `Category: ${gigData.category}` : ''}

Please provide 8-12 SEO keywords as a comma-separated list:`;

    const response = await this.client.createTextCompletion({
      prompt,
      max_tokens: 120,
      temperature: 0.3
    });

    const keywordsText = response.choices[0]?.text?.trim() || '';
    return keywordsText.split(',').map(keyword => keyword.trim()).filter(keyword => keyword.length > 0);
  }

  async generateGigImage(gigData: GigData, style: string = 'professional'): Promise<string | null> {
    try {
      const imagePrompt = `Create a ${style} promotional image for this service:
Title: ${gigData.title}
Description: ${gigData.description}
${gigData.category ? `Category: ${gigData.category}` : ''}

The image should be visually appealing, professional, and represent the service being offered. Include relevant visual elements that convey the service quality and professionalism.`;

      const response = await this.client.generateImage({
        prompt: imagePrompt,
        width: 1024,
        height: 768,
        steps: 20,
        guidance_scale: 7.5
      });

      if (response.status === 'completed' && response.images.length > 0) {
        return response.images[0].url;
      }

      return response.id;
    } catch (error) {
      console.error('Error generating gig image:', error);
      return null;
    }
  }

  async generateGigVideo(gigData: GigData): Promise<string | null> {
    try {
      const videoPrompt = `Create a promotional video for this service:
Title: ${gigData.title}
Description: ${gigData.description}

The video should showcase the service professionally and attractively.`;

      const response = await this.client.generateVideo({
        prompt: videoPrompt,
        duration: 5,
        fps: 24,
        width: 1280,
        height: 720
      });

      return response.id;
    } catch (error) {
      console.error('Error generating gig video:', error);
      return null;
    }
  }
}

export class AIContentOptimizer {
  private client;

  constructor() {
    this.client = createComput3Client();
  }

  async optimizeForPlatform(content: string, platform: 'marketplace' | 'social' | 'email' | 'ad'): Promise<string> {
    const platformGuidelines = {
      marketplace: 'professional, detailed, includes benefits and features',
      social: 'engaging, shareable, includes call-to-action',
      email: 'personal, conversational, value-focused',
      ad: 'short, punchy, conversion-focused'
    };

    const prompt = `Optimize this content for ${platform}:

Original Content: ${content}

Platform Guidelines: ${platformGuidelines[platform]}

Optimized Content:`;

    const response = await this.client.createTextCompletion({
      prompt,
      max_tokens: 300,
      temperature: 0.7
    });

    return response.choices[0]?.text?.trim() || content;
  }

  async generateVariations(content: string, count: number = 3): Promise<string[]> {
    const prompt = `Generate ${count} different variations of this content, each with a different tone or approach:

Original Content: ${content}

Variations:
1.`;

    const response = await this.client.createTextCompletion({
      prompt,
      max_tokens: 500,
      temperature: 0.8
    });

    const variations = response.choices[0]?.text?.trim() || '';
    return variations.split(/\d+\./).slice(1).map(v => v.trim()).filter(v => v.length > 0);
  }
}

export function createAIGigEnhancer(): AIGigEnhancer {
  return new AIGigEnhancer();
}

export function createAIContentOptimizer(): AIContentOptimizer {
  return new AIContentOptimizer();
}