import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin-client';

export async function POST(req: Request) {
  try {
    const textBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid signature or missing secret' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(textBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(textBody);
    
    // We only care about successful payments
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const userId = payment.notes?.userId;
      const baseAmountCentsStr = payment.notes?.baseAmountCents;

      if (!userId || !baseAmountCentsStr) {
        return NextResponse.json({ error: 'Missing metadata notes' }, { status: 400 });
      }

      const baseAmountCents = parseInt(baseAmountCentsStr, 10);

      const adminClient = createSupabaseAdminClient();

      // Ensure we haven't processed this payment already (idempotency)
      const { data: existingTx } = await adminClient
        .from('transactions')
        .select('id')
        .eq('reference_id', payment.id)
        .single();

      if (existingTx) {
        return NextResponse.json({ received: true }); // Already processed
      }

      // Add balance via the secure Atomic SQL RPC
      const { data: addSuccess, error: rpcError } = await adminClient.rpc('add_wallet_balance', {
        p_user_id: userId,
        p_amount: baseAmountCents
      });

      if (rpcError || !addSuccess) {
        console.error("Critical: Failed to add wallet balance from Razorpay webhook", rpcError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      // Log the transaction so it can't be processed again
      await adminClient.from("transactions").insert({
        user_id: userId,
        amount_cents: baseAmountCents,
        type: "deposit",
        reference_id: payment.id
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Razorpay Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
