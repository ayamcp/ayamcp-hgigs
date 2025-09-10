import type {
  Comput3Config,
  TextCompletionRequest,
  TextCompletionResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoGenerationRequest,
  VideoGenerationResponse,
  JobStatusResponse
} from '../types/comput3.js';

export class Comput3Client {
  private config: Comput3Config;

  constructor(config: Comput3Config) {
    this.config = {
      baseUrl: process.env.COMPUT3_BASE_URL || 'https://api.comput3.ai/v1',
      ...config
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Comput3 API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async createTextCompletion(request: TextCompletionRequest): Promise<TextCompletionResponse> {
    return this.makeRequest<TextCompletionResponse>('/completions', {
      method: 'POST',
      body: JSON.stringify({
        prompt: request.prompt,
        max_tokens: request.max_tokens || 256,
        temperature: request.temperature || 0.7,
        model: request.model || 'kimi-k2'
      }),
    });
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    return this.makeRequest<ImageGenerationResponse>('/images/generations', {
      method: 'POST',
      body: JSON.stringify({
        prompt: request.prompt,
        width: request.width || 512,
        height: request.height || 512,
        steps: request.steps || 20,
        guidance_scale: request.guidance_scale || 7.5,
        model: request.model || 'kimi-k2'
      }),
    });
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    return this.makeRequest<VideoGenerationResponse>('/videos/generations', {
      method: 'POST',
      body: JSON.stringify({
        prompt: request.prompt,
        duration: request.duration || 3,
        fps: request.fps || 24,
        width: request.width || 512,
        height: request.height || 512,
        model: request.model || 'kimi-k2'
      }),
    });
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    return this.makeRequest<JobStatusResponse>(`/jobs/${jobId}`);
  }

  async waitForJob(jobId: string, maxWaitTime = 300000): Promise<JobStatusResponse> {
    const startTime = Date.now();
    const pollInterval = 2000;

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getJobStatus(jobId);
      
      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Job timed out');
  }
}

export function createComput3Client(): Comput3Client {
  const apiKey = process.env.COMPUT3_API_KEY;
  const baseUrl = process.env.COMPUT3_BASE_URL;
  
  if (!apiKey) {
    throw new Error('COMPUT3_API_KEY environment variable is required');
  }

  return new Comput3Client({ apiKey, baseUrl });
}