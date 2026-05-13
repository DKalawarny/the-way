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
    const { user_id, return_url } = await req.json();

    if (!user_id || !return_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Look up the user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user_id)
      .maybeSingle();

    const customerId = profile?.stripe_customer_id;

    if (!customerId) {
      return new Response(JSON.stringify({ error: 'No Stripe customer found for this user' }), {
        status: 404,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Create a Stripe Customer Portal session
    // This lets the user update payment method, view invoices, and cancel subscription
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-portal-session error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
