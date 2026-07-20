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
  church_seats: Deno.env.get('STRIPE_PRICE_CHURCH_SEATS'), // quantity-based +100-member blocks
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
    const { price_plan, user_id, user_email, return_url, quantity } = await req.json();

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

    // ── Who is the customer? ────────────────────────────────────────────────
    // Church plans bill the CHURCH (its own Stripe customer, church name on the
    // invoice, billing email changeable to accounts-payable via the portal) so
    // the subscription survives pastor changes. Personal plans bill the person.
    const isChurchPlan = price_plan === 'church_base' || price_plan === 'church_pro' || price_plan === 'church_seats';
    let customerId: string | undefined;
    let churchId: string | null = null;

    if (isChurchPlan) {
      const { data: role } = await supabase
        .from('church_roles')
        .select('church_id')
        .eq('user_id', user_id)
        .eq('is_owner', true)
        .maybeSingle();
      churchId = role?.church_id ?? null;
      if (!churchId) {
        return new Response(JSON.stringify({ error: 'Only a church owner can start a church plan' }), {
          status: 403,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
      const found = await stripe.customers.search({ query: `metadata['church_id']:'${churchId}'`, limit: 1 });
      if (found.data[0]) {
        customerId = found.data[0].id;
      } else {
        const { data: church } = await supabase.from('churches').select('name').eq('id', churchId).maybeSingle();
        const customer = await stripe.customers.create({
          email: user_email, // initial billing contact; church can change it in the billing portal
          name: church?.name ?? 'Church',
          metadata: { church_id: churchId, created_by_user: user_id },
        });
        customerId = customer.id;
        // Persist on the church row if the column exists (migration may lag).
        await supabase.from('churches').update({ stripe_customer_id: customerId }).eq('id', churchId)
          .then(() => {}, () => {});
      }
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user_id)
        .maybeSingle();
      customerId = profile?.stripe_customer_id ?? undefined;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user_email,
          metadata: { supabase_user_id: user_id },
        });
        customerId = customer.id;
        await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user_id);
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user_id,
      mode: 'subscription',
      // Seat blocks are quantity-based (each = +100 members); everything else is qty 1.
      line_items: [{
        price: priceId,
        quantity: price_plan === 'church_seats' ? Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 20) : 1,
      }],
      allow_promotion_codes: true,   // show a "Add promotion code" field at checkout
      success_url: `${return_url}?stripe_success=1`,
      cancel_url:  `${return_url}?stripe_cancel=1`,
      subscription_data: {
        metadata: { supabase_user_id: user_id, ...(churchId ? { church_id: churchId } : {}) },
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
