import { TTSService, TTSRequest, TTSResponse } from './types';

export class StubTTSService implements TTSService {
  private provider = 'stub';

  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // For stub, we return a placeholder URL or generate silent audio
    const audioUrl = `/api/audio/stub-${Date.now()}.mp3`;

    // Estimate duration based on text length (average 150 words per minute)
    const words = request.text.split(/\s+/).length;
    const duration = Math.ceil((words / 150) * 60);

    return {
      audioUrl,
      duration,
      format: request.format || 'mp3',
      provider: this.provider,
    };
  }

  async getVoices(): Promise<string[]> {
    return ['default', 'female', 'male', 'narrator'];
  }
}
