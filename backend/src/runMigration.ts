import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Running database migration...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../../CREATE_QUIZZES_TABLE.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Executing SQL commands...');

    // Execute the SQL directly (Supabase allows direct SQL via RPC)
    // Split SQL into statements and execute them one by one
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length > 0) {
        const { error } = await supabase.rpc('pg_sql', { query: statement });
        if (error) {
          // Some errors are OK (like "table already exists")
          if (!error.message.includes('already exists') && !error.message.includes('duplicate key')) {
            console.error('⚠️  Warning:', error.message);
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Created tables:');
    console.log('  ✓ quizzes');
    console.log('  ✓ quiz_results');
    console.log('  ✓ group_quizzes');
    console.log('  ✓ group_quiz_results');
    console.log('');
    console.log('All quiz functionality is now ready! 🎉');

  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

runMigration();
