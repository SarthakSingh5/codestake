const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const userId = users.users[0]?.id;

  if (!userId) {
    console.log("No users found");
    return;
  }

  const { data: sessions, error } = await supabase
    .from("stake_sessions")
    .select('*')
    .eq("user_id", userId);

  console.log("All Sessions for User:", sessions);
}

test();
