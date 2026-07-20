import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createSupabaseAdminClient } from '@/lib/supabase/admin-client';

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
    const { userId, amountCents } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400, headers: corsHeaders });
    }

    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400, headers: corsHeaders });
    }

    // Pure USD Architecture: amountCents is ALWAYS in USD Cents.
    // 1 USD = 84 INR (Approx). So 1 USD Cent = 84 INR Paise.
    const usdToInrRate = 84; 
    const baseInrPaise = amountCents * usdToInrRate;

    // Razorpay India standard domestic fee is 2% + 18% GST on the fee = 2.36%.
    const multiplier = 1 / (1 - 0.0236);
    const finalAmountCents = Math.ceil(baseInrPaise * multiplier);

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Razorpay not configured on server' }, { status: 500, headers: corsHeaders });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: finalAmountCents, // Razorpay expects paise (cents)
      currency: "INR",
      receipt: `receipt_cs_ext_${Date.now()}`,
      notes: {
        userId: userId,
        baseAmountCents: amountCents.toString(), // Webhook uses this to credit exact amount
      }
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, 
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Extension Razorpay Order Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500, headers: corsHeaders });
  }
}
