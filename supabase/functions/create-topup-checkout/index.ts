import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { user_id, user_email, period, return_url } = await req.json();

    if (!user_id || !user_email || !period || !return_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const priceId = Deno.env.get('STRIPE_PRICE_TOPUP');
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'STRIPE_PRICE_TOPUP not configured' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Look up or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user_id)
      .maybeSingle();

    let customerId: string | undefined = profile?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user_email,
        metadata: { supabase_user_id: user_id },
      });
      customerId = customer.id;
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user_id);
    }

    // One-time payment session — NOT a subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user_id,
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${return_url}?topup_success=1`,
      cancel_url:  `${return_url}?topup_cancel=1`,
      // Store the period in metadata so the webhook knows which month to credit
      metadata: {
        topup: 'true',
        period,
        user_id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-topup-checkout error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
