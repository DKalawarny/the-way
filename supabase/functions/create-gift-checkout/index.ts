import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Maps gift_type + months → Stripe price ID env var
const GIFT_PRICE_MAP: Record<string, string | undefined> = {
  'premium:3':      Deno.env.get('STRIPE_PRICE_GIFT_INDIVIDUAL_3MO'),
  'premium:6':      Deno.env.get('STRIPE_PRICE_GIFT_INDIVIDUAL_6MO'),
  'premium:12':     Deno.env.get('STRIPE_PRICE_GIFT_INDIVIDUAL_12MO'),
  'premium_plus:3':  Deno.env.get('STRIPE_PRICE_GIFT_PRO_3MO'),
  'premium_plus:6':  Deno.env.get('STRIPE_PRICE_GIFT_PRO_6MO'),
  'premium_plus:12': Deno.env.get('STRIPE_PRICE_GIFT_PRO_12MO'),
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
    const { plan, months, user_id, user_email, return_url } = await req.json();

    if (!plan || !months || !user_email || !return_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const priceId = GIFT_PRICE_MAP[`${plan}:${months}`];
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Unknown gift: ${plan} × ${months}mo` }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Look up or create Stripe customer
    let customerId: string | undefined;
    if (user_id) {
      const { data: profile } = await supabase
        .from('profiles').select('stripe_customer_id').eq('id', user_id).maybeSingle();
      customerId = profile?.stripe_customer_id ?? undefined;
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user_email,
        metadata: user_id ? { supabase_user_id: user_id } : {},
      });
      customerId = customer.id;
      if (user_id) {
        await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user_id);
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user_id ?? null,
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${return_url}?gift_success=1`,
      cancel_url:  `${return_url}?gift_cancel=1`,
      metadata: {
        gift:          'true',
        gift_price_id: priceId,
        plan,
        months:        String(months),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-gift-checkout error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
