require('dotenv').config({ path: './.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function unban() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const userId = "b6d68ba0-3976-4f8b-803a-e4c61f3bfa67";

  console.log("Unbanning user at Auth level...");
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: 'none'
  });

  if (error) console.error("Auth Unban Error:", error);
  else console.log("Auth Unban Success!");

  console.log("Resetting is_banned flag in wallets table...");
  const { error: dbError } = await supabase
    .from('wallets')
    .update({ is_banned: false })
    .eq('user_id', userId);

  if (dbError) console.error("DB Unban Error:", dbError);
  else console.log("DB Unban Success!");
}

unban();
