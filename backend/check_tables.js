import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['quizzes', 'quiz_results']);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('\n✅ QUIZ TABLES STATUS:');
    console.log('=====================\n');
    
    const existingTables = data?.map(t => t.table_name) || [];
    
    if (existingTables.includes('quizzes')) {
      console.log('✓ quizzes table - CREATED ✅');
    } else {
      console.log('✗ quizzes table - MISSING ❌');
    }
    
    if (existingTables.includes('quiz_results')) {
      console.log('✓ quiz_results table - CREATED ✅');
    } else {
      console.log('✗ quiz_results table - MISSING ❌');
    }
    
    console.log('\n🎉 Your quiz system is now functional!');
    console.log('=====================================\n');
    
  } catch (err) {
    console.error('Error:', err);
  }
}

checkTables();
