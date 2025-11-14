export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  format?: 'mp3' | 'wav' | 'ogg';
}

export interface TTSResponse {
  audioUrl: string;
  duration?: number;
  format: string;
  provider: string;
}

export interface TTSService {
  synthesize(request: TTSRequest): Promise<TTSResponse>;
  getVoices?(): Promise<string[]>;
}
