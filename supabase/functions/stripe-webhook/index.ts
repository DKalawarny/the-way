import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get('STRIPE_PRICE_PREMIUM')      ?? '__none1__']: 'premium',
  [Deno.env.get('STRIPE_PRICE_PREMIUM_PLUS') ?? '__none2__']: 'premium_plus',
};

const TOPUP_MESSAGES = 100; // must match useAiUsage.js TOPUP_MESSAGES

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  const sig = req.headers.get('stripe-signature') ?? '';
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (!userId) throw new Error('No client_reference_id on checkout session');

      if (session.mode === 'payment' && session.metadata?.topup === 'true') {
        // ── One-time top-up purchase ─────────────────────────────────────────
        const period = session.metadata?.period;
        if (!period) throw new Error('No period in top-up session metadata');

        await supabase.rpc('grant_ai_topup', {
          p_user_id: userId,
          p_period:  period,
          p_amount:  TOPUP_MESSAGES,
        });

        console.log(`Top-up granted: ${TOPUP_MESSAGES} messages for user ${userId} period ${period}`);

      } else if (session.mode === 'subscription') {
        // ── New subscription ─────────────────────────────────────────────────
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id ?? '';
          const plan = PRICE_TO_PLAN[priceId] ?? 'premium';

          await supabase
            .from('profiles')
            .update({ plan, stripe_subscription_id: subscriptionId })
            .eq('id', userId);
        }
      }

    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

      const priceId = subscription.items.data[0]?.price.id ?? '';
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      const plan = isActive ? (PRICE_TO_PLAN[priceId] ?? 'premium') : 'free';

      await supabase
        .from('profiles')
        .update({
          plan,
          stripe_subscription_id: isActive ? subscription.id : null,
        })
        .eq('stripe_customer_id', customerId);

    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

      await supabase
        .from('profiles')
        .update({ plan: 'free', stripe_subscription_id: null })
        .eq('stripe_customer_id', customerId);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('stripe-webhook handler error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
