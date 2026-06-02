import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/admin-client';

export async function POST(req: Request) {
  try {
    const textBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Missing signature or secrets' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia' as any,
    });

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        textBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error(`Stripe Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId;
      const baseAmountCentsStr = session.metadata?.baseAmountCents;

      if (!userId || !baseAmountCentsStr) {
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      const baseAmountCents = parseInt(baseAmountCentsStr, 10);
      const adminClient = createSupabaseAdminClient();

      // Ensure idempotency
      const { data: existingTx } = await adminClient
        .from('transactions')
        .select('id')
        .eq('reference_id', session.id)
        .single();

      if (existingTx) {
        return NextResponse.json({ received: true }); // Already processed
      }

      // Add balance via atomic SQL RPC
      const { data: addSuccess, error: rpcError } = await adminClient.rpc('add_wallet_balance', {
        p_user_id: userId,
        p_amount: baseAmountCents
      });

      if (rpcError || !addSuccess) {
        console.error("Critical: Failed to add wallet balance from Stripe webhook", rpcError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      await adminClient.from("transactions").insert({
        user_id: userId,
        amount_cents: baseAmountCents,
        type: "deposit",
        reference_id: session.id
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Stripe Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
