import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing env vars!");
    return;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Fetching a wallet...");
  const userId = "b6d68ba0-3976-4f8b-803a-e4c61f3bfa67";
  console.log("Found user ID:", userId);

  console.log("Injecting $1000.00 (100000 cents)...");

  const { data: addSuccess, error: rpcError } = await adminClient.rpc('add_wallet_balance', {
    p_user_id: userId,
    p_amount: 100000
  });

  if (rpcError) {
    console.error("RPC Error:", rpcError);
  }

  const { data: balance } = await adminClient.from("wallets").select("balance_cents").eq("user_id", userId).single();
  console.log("New Wallet Balance in Cents:", balance?.balance_cents);
}

run();
