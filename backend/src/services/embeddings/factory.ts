import config from '../../config/config';
import { EmbeddingsService } from './types';
import { StubEmbeddingsService } from './stub';
import { SupabaseEmbeddingsService } from './supabase';

export function createEmbeddingsService(): EmbeddingsService {
  switch (config.vectorDb.mode) {
    case 'supabase':
      return new SupabaseEmbeddingsService();

    case 'stub':
    default:
      return new StubEmbeddingsService();
  }
}
