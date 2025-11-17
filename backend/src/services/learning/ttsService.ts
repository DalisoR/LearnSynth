import { createTTSService } from '../tts/factory';
import { TTSRequest } from '../tts/types';

export interface TTSResult {
  audioUrl: string;
  duration: number;
}

export class TTSService {
  private service = createTTSService();

  async generateAudio(text: string): Promise<TTSResult> {
    const request: TTSRequest = {
      text,
      voice: 'narrator',
      speed: 1.0,
      format: 'mp3',
    };

    const response = await this.service.synthesize(request);

    return {
      audioUrl: response.audioUrl,
      duration: response.duration || 0,
    };
  }

  async getAvailableVoices(): Promise<string[]> {
    if (this.service.getVoices) {
      return await this.service.getVoices();
    }
    return ['default'];
  }
}
