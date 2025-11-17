import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQuizTable() {
  try {
    // Try to query the quizzes table
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('\n❌ QUIZ ERROR:', error.message);
      console.log('Code:', error.code);
    } else {
      console.log('\n✅ SUCCESS! Quizzes table is accessible!');
      console.log('Query result:', data);
    }
  } catch (err) {
    console.log('\n❌ Exception:', err.message);
  }
}

testQuizTable();
