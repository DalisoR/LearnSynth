import axios from 'axios';
import { TTSService, TTSRequest, TTSResponse } from './types';

export class ElevenLabsService implements TTSService {
  private apiKey: string;
  private provider = 'elevenlabs';
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const voiceId = request.voice || 'default';

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text: request.text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          responseType: 'arraybuffer',
        }
      );

      // In production, you would upload this to Supabase Storage
      // For now, return a placeholder
      const audioUrl = `/api/audio/elevenlabs-${Date.now()}.mp3`;

      return {
        audioUrl,
        format: 'mp3',
        provider: this.provider,
      };
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      throw new Error('Failed to synthesize speech with ElevenLabs');
    }
  }

  async getVoices(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      return response.data.voices.map((v: any) => v.name);
    } catch (error) {
      console.error('Failed to fetch ElevenLabs voices:', error);
      return ['default'];
    }
  }
}
