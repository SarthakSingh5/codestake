import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amountCents,
    } = body;

    let targetUserId = body.userId;

    // Fall back to server session if userId was not directly supplied in body
    if (!targetUserId) {
      try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          targetUserId = user.id;
        }
      } catch {}
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400, headers: corsHeaders });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment verification parameters' }, { status: 400, headers: corsHeaders });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Razorpay secret not configured' }, { status: 500, headers: corsHeaders });
    }

    // Cryptographic signature check: SHA256(order_id + "|" + payment_id, secret)
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400, headers: corsHeaders });
    }

    const adminClient = createSupabaseAdminClient();

    // Idempotency: Check if this payment was already recorded (e.g. by webhook)
    const { data: existingTx } = await adminClient
      .from('transactions')
      .select('id')
      .eq('reference_id', razorpay_payment_id)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({ success: true, message: 'Already processed' }, { headers: corsHeaders });
    }

    const creditAmount = parseInt(amountCents?.toString() || '0', 10);
    if (creditAmount > 0) {
      const { error: rpcError } = await adminClient.rpc('add_wallet_balance', {
        p_user_id: targetUserId,
        p_amount: creditAmount,
      });

      if (rpcError) {
        console.error("Critical: Failed to credit wallet balance after Razorpay verification", rpcError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500, headers: corsHeaders });
      }

      await adminClient.from('transactions').insert({
        user_id: targetUserId,
        amount_cents: creditAmount,
        type: 'deposit',
        reference_id: razorpay_payment_id,
      });
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Razorpay verification error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500, headers: corsHeaders });
  }
}

