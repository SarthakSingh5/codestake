import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amountCents } = await req.json();

    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Pure USD Architecture: amountCents is ALWAYS in USD Cents.
    // Standard Razorpay (India) requires INR.
    // 1 USD = 84 INR (Approx). So 1 USD Cent = 84 INR Paise.
    const usdToInrRate = 84; 
    const baseInrPaise = amountCents * usdToInrRate;

    // Pass the fee to the user.
    // Razorpay India standard domestic fee is 2% + 18% GST on the fee = 2.36%.
    // To get exactly `baseInrPaise`, we charge `baseInrPaise / (1 - 0.0236)`.
    const multiplier = 1 / (1 - 0.0236);
    const finalAmountCents = Math.ceil(baseInrPaise * multiplier);

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Razorpay not configured on server' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: finalAmountCents, // Razorpay expects paise (cents)
      currency: "INR",
      receipt: `receipt_codestake_${Date.now()}`,
      notes: {
        userId: user.id,
        baseAmountCents: amountCents.toString(), // Webhook uses this to credit exact amount
      }
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // Required by frontend SDK
    });
  } catch (error: any) {
    console.error('Razorpay Order Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
  }
}
