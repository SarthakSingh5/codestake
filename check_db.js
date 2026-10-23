import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('stake_sessions').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("RECENT SESSIONS:", data);
  if (error) console.error("ERROR:", error);
}

check();
