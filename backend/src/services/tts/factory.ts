import config from '../../config/config';
import { TTSService } from './types';
import { StubTTSService } from './stub';
import { ElevenLabsService } from './elevenlabs';

export function createTTSService(): TTSService {
  switch (config.tts.provider) {
    case 'elevenlabs':
      if (!config.tts.apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }
      return new ElevenLabsService(config.tts.apiKey);

    case 'stub':
    default:
      return new StubTTSService();
  }
}
