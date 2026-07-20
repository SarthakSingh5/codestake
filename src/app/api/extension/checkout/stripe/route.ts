import { NextResponse } from 'next/server';
import Stripe from 'stripe';
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

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured on server' }, { status: 500, headers: corsHeaders });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'CodeStake Honor Restoration',
              description: 'Clear your negative balance to return to the arena.',
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // We pass the userId in the metadata so the webhook knows who to credit
      metadata: {
        userId: userId,
        baseAmountCents: amountCents.toString(),
      },
      // Since they are in the extension, we can redirect them to a generic success page on our domain
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/payment-success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/wallet?canceled=true`,
    });

    return NextResponse.json({ url: session.url }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Extension Stripe Order Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500, headers: corsHeaders });
  }
}
