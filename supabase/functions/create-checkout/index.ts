import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const PRICE_MAP: Record<string, string | undefined> = {
  premium:      Deno.env.get('STRIPE_PRICE_INDIVIDUAL'),
  premium_plus: Deno.env.get('STRIPE_PRICE_INDIVIDUAL_PRO'),
  church_base:  Deno.env.get('STRIPE_PRICE_CHURCH_BASE'),
  church_pro:   Deno.env.get('STRIPE_PRICE_CHURCH_PRO'),
};

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
    const { price_plan, user_id, user_email, return_url } = await req.json();

    if (!price_plan || !user_id || !user_email || !return_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const priceId = PRICE_MAP[price_plan];
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Unknown price_plan: ${price_plan}` }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

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
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user_id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user_id,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${return_url}?stripe_success=1`,
      cancel_url:  `${return_url}?stripe_cancel=1`,
      subscription_data: {
        metadata: { supabase_user_id: user_id },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-checkout error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
