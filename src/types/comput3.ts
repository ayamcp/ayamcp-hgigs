export interface Comput3Config {
  apiKey: string;
  baseUrl?: string;
}

export interface TextCompletionRequest {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  model?: string;
}

export interface TextCompletionResponse {
  id: string;
  choices: Array<{
    text: string;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ImageGenerationRequest {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
  model?: string;
}

export interface ImageGenerationResponse {
  id: string;
  status: string;
  images: Array<{
    url: string;
    width: number;
    height: number;
  }>;
}

export interface VideoGenerationRequest {
  prompt: string;
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
  model?: string;
}

export interface VideoGenerationResponse {
  id: string;
  status: string;
  video_url?: string;
  progress?: number;
}

export interface JobStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  progress?: number;
}