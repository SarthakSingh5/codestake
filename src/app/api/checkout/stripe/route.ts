import { NextResponse } from 'next/server';
import Stripe from 'stripe';
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

    // Pass the fee to the user.
    // Stripe USA standard fee is 2.9% + 30 cents.
    // To get exactly `amountCents`, we charge `(amountCents + 30) / (1 - 0.029)`.
    const multiplier = 1 / (1 - 0.029);
    const finalAmountCents = Math.ceil((amountCents + 30) * multiplier);

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    // Note: use the latest stable API version or the one installed.
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia' as any, // fallback for newest types
    });

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'CodeStake Credits',
              description: `${amountCents} CodeStake Credits`,
            },
            unit_amount: finalAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/wallet?deposit=success`,
      cancel_url: `${origin}/wallet?deposit=cancelled`,
      metadata: {
        userId: user.id,
        baseAmountCents: amountCents.toString(), // Used by webhook to credit base amount
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe Session Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create Stripe session' }, { status: 500 });
  }
}
