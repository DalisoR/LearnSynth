import { createClient } from '@supabase/supabase-js';
import config from '../config/config';
import { Database } from '../types/database';

export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      persistSession: false,
    },
  }
);

export default supabase;
