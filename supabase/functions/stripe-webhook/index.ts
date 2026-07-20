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
  [Deno.env.get('STRIPE_PRICE_INDIVIDUAL')     ?? '__none1__']: 'premium',
  [Deno.env.get('STRIPE_PRICE_INDIVIDUAL_PRO') ?? '__none2__']: 'premium_plus',
  [Deno.env.get('STRIPE_PRICE_CHURCH_BASE')    ?? '__none3__']: 'church_base',
  [Deno.env.get('STRIPE_PRICE_CHURCH_PRO')     ?? '__none4__']: 'church_pro',
};

// Gift price → { plan, months }
const GIFT_PRICE_MAP: Record<string, { plan: string; months: number }> = {
  [Deno.env.get('STRIPE_PRICE_GIFT_INDIVIDUAL_3MO')  ?? '__g1__']: { plan: 'premium',      months: 3  },
  [Deno.env.get('STRIPE_PRICE_GIFT_INDIVIDUAL_6MO')  ?? '__g2__']: { plan: 'premium',      months: 6  },
  [Deno.env.get('STRIPE_PRICE_GIFT_INDIVIDUAL_12MO') ?? '__g3__']: { plan: 'premium',      months: 12 },
  [Deno.env.get('STRIPE_PRICE_GIFT_PRO_3MO')         ?? '__g4__']: { plan: 'premium_plus', months: 3  },
  [Deno.env.get('STRIPE_PRICE_GIFT_PRO_6MO')         ?? '__g5__']: { plan: 'premium_plus', months: 6  },
  [Deno.env.get('STRIPE_PRICE_GIFT_PRO_12MO')        ?? '__g6__']: { plan: 'premium_plus', months: 12 },
};

const TOPUP_MESSAGES = 150;

const CHURCH_PLANS = new Set(['church_base', 'church_pro']);

// Seat-block subscription (quantity-based, each = +100 members). These events
// must NEVER touch profiles.plan — they only sync churches.seat_blocks.
const SEAT_PRICE = Deno.env.get('STRIPE_PRICE_CHURCH_SEATS') ?? '__seats__';

async function syncSeatBlocks(userIdOrCustomer: { userId?: string; customerId?: string }, blocks: number) {
  let userId = userIdOrCustomer.userId;
  if (!userId && userIdOrCustomer.customerId) {
    const { data: prof } = await supabase.from('profiles')
      .select('id').eq('stripe_customer_id', userIdOrCustomer.customerId).maybeSingle();
    userId = prof?.id;
  }
  if (!userId) return;
  const { data: role } = await supabase.from('church_roles')
    .select('church_id').eq('user_id', userId).eq('is_owner', true).maybeSingle();
  if (!role?.church_id) return;
  await supabase.from('churches').update({ seat_blocks: blocks }).eq('id', role.church_id);
}


// Church-anchored subscriptions carry metadata.church_id (set at checkout, on
// the CHURCH's own Stripe customer). Resolve by church directly so billing
// survives pastor changes; keep writing the current owner's profiles.plan so
// entitlements behave exactly as before.
async function syncChurchAnchored(churchId: string, plan: string, isActive: boolean, subscriptionId: string | null) {
  await supabase
    .from('churches')
    .update({
      verification_status: isActive ? 'verified' : 'pending',
      plan: isActive ? plan : 'free',
    })
    .eq('id', churchId);
  // Optional columns (migration may lag) — best-effort, never fatal.
  await supabase.from('churches')
    .update({ stripe_subscription_id: isActive ? subscriptionId : null })
    .eq('id', churchId)
    .then(() => {}, () => {});
  const { data: role } = await supabase.from('church_roles')
    .select('user_id').eq('church_id', churchId).eq('is_owner', true).maybeSingle();
  if (role?.user_id) {
    await supabase.from('profiles')
      .update({ plan: isActive ? plan : 'free' })
      .eq('id', role.user_id);
  }
}

async function syncSeatBlocksByChurch(churchId: string, blocks: number) {
  await supabase.from('churches').update({ seat_blocks: blocks }).eq('id', churchId);
}

async function syncChurchVerification(userId: string, plan: string, isActive: boolean) {
  if (!CHURCH_PLANS.has(plan)) return;
  const { data: role } = await supabase
    .from('church_roles')
    .select('church_id')
    .eq('user_id', userId)
    .eq('is_owner', true)
    .maybeSingle();
  if (!role?.church_id) return;
  await supabase
    .from('churches')
    .update({
      verification_status: isActive ? 'verified' : 'pending',
      // Mirror the paid plan onto the church row so usePlan(churchId) — which
      // reads churches.plan — grants access. Without this every church (even
      // paying ones) reverts to the trial wall at day 35. Downgrade to 'free'
      // when the subscription ends.
      plan: isActive ? plan : 'free',
    })
    .eq('id', role.church_id);
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

function generateGiftCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `KNWV-${seg()}-${seg()}`;
}

async function sendGiftEmail(to: string, code: string, plan: string, months: number) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return;
  const planLabel = plan === 'premium_plus' ? 'Individual Pro' : 'Individual';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'kinwove <onboarding@resend.dev>',
      to,
      subject: `Your kinwove gift is ready to share`,
      html: `
        <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1510">
          <div style="font-size:22px;font-weight:600;margin-bottom:8px">Your gift is ready ✦</div>
          <p style="font-size:15px;line-height:1.6;color:#4a3f35">
            You've gifted <strong>${months} months of kinwove ${planLabel}</strong>.
            Share this code with whoever you had in mind:
          </p>
          <div style="background:#faf6ef;border:1px solid #d4a96a;border-radius:12px;padding:20px 24px;text-align:center;margin:24px 0">
            <div style="font-size:28px;font-weight:700;letter-spacing:0.08em;color:#1a1510">${code}</div>
            <div style="font-size:13px;color:#6b5a4a;margin-top:6px">Enter this at kinwove.com → Profile → Redeem a gift</div>
          </div>
          <p style="font-size:13px;color:#9a8a7a;line-height:1.6">
            The code is valid for one year from purchase. Questions? hello@kinwove.com
          </p>
        </div>
      `,
    }),
  });
}

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

      if (session.mode === 'payment' && session.metadata?.topup === 'true') {
        // ── Top-up ───────────────────────────────────────────────────────────
        if (!userId) throw new Error('No client_reference_id on top-up session');
        const period = session.metadata?.period;
        if (!period) throw new Error('No period in top-up metadata');
        await supabase.rpc('grant_ai_topup', { p_user_id: userId, p_period: period, p_amount: TOPUP_MESSAGES });

      } else if (session.mode === 'payment' && session.metadata?.gift === 'true') {
        // ── Gift purchase — generate code + email buyer ───────────────────────
        const priceId = session.metadata?.gift_price_id ?? '';
        const giftMeta = GIFT_PRICE_MAP[priceId];
        if (!giftMeta) throw new Error(`Unknown gift price: ${priceId}`);

        let code = generateGiftCode();
        // Retry once on collision (astronomically unlikely but safe)
        const { data: existing } = await supabase.from('gift_codes').select('id').eq('code', code).maybeSingle();
        if (existing) code = generateGiftCode();

        const redeemBy = new Date();
        redeemBy.setFullYear(redeemBy.getFullYear() + 1);

        await supabase.from('gift_codes').insert({
          code,
          plan:             giftMeta.plan,
          months:           giftMeta.months,
          stripe_session_id: session.id,
          purchased_by:     userId ?? null,
          purchaser_email:  session.customer_details?.email ?? null,
          redeem_by:        redeemBy.toISOString(),
        });

        const buyerEmail = session.customer_details?.email;
        if (buyerEmail) await sendGiftEmail(buyerEmail, code, giftMeta.plan, giftMeta.months);

      } else if (session.mode === 'subscription') {
        // ── New subscription ─────────────────────────────────────────────────
        if (!userId) throw new Error('No client_reference_id on subscription session');
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription : session.subscription?.id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const item = subscription.items.data[0];
          const priceId = item?.price.id ?? '';
          const metaChurchId = (subscription.metadata?.church_id as string | undefined) ?? undefined;
          if (priceId === SEAT_PRICE) {
            if (metaChurchId) await syncSeatBlocksByChurch(metaChurchId, item?.quantity ?? 1);
            else await syncSeatBlocks({ userId }, item?.quantity ?? 1);
          } else if (metaChurchId) {
            const plan = PRICE_TO_PLAN[priceId] ?? 'church_base';
            await syncChurchAnchored(metaChurchId, plan, true, subscriptionId);
          } else {
            const plan = PRICE_TO_PLAN[priceId] ?? 'premium';
            await supabase.from('profiles')
              .update({ plan, stripe_subscription_id: subscriptionId })
              .eq('id', userId);
            await syncChurchVerification(userId, plan, true);
          }
        }
      }

    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer : subscription.customer.id;
      const item = subscription.items.data[0];
      const priceId = item?.price.id ?? '';
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      const metaChurchId = (subscription.metadata?.church_id as string | undefined) ?? undefined;
      if (priceId === SEAT_PRICE) {
        if (metaChurchId) await syncSeatBlocksByChurch(metaChurchId, isActive ? (item?.quantity ?? 1) : 0);
        else await syncSeatBlocks({ customerId }, isActive ? (item?.quantity ?? 1) : 0);
      } else if (metaChurchId) {
        const plan = isActive ? (PRICE_TO_PLAN[priceId] ?? 'church_base') : 'free';
        await syncChurchAnchored(metaChurchId, isActive ? plan : (PRICE_TO_PLAN[priceId] ?? 'church_base'), isActive, subscription.id);
      } else {
        const plan = isActive ? (PRICE_TO_PLAN[priceId] ?? 'premium') : 'free';
        const { data: profile } = await supabase.from('profiles')
          .update({ plan, stripe_subscription_id: isActive ? subscription.id : null })
          .eq('stripe_customer_id', customerId)
          .select('id')
          .maybeSingle();
        if (profile?.id) await syncChurchVerification(profile.id, plan, isActive);
      }

    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer : subscription.customer.id;
      const priceId = subscription.items.data[0]?.price.id ?? '';
      const metaChurchId = (subscription.metadata?.church_id as string | undefined) ?? undefined;
      if (priceId === SEAT_PRICE) {
        if (metaChurchId) await syncSeatBlocksByChurch(metaChurchId, 0);
        else await syncSeatBlocks({ customerId }, 0);
      } else if (metaChurchId) {
        await syncChurchAnchored(metaChurchId, PRICE_TO_PLAN[priceId] ?? 'church_base', false, null);
      } else {
        const plan = PRICE_TO_PLAN[priceId] ?? 'free';
        const { data: profile } = await supabase.from('profiles')
          .update({ plan: 'free', stripe_subscription_id: null })
          .eq('stripe_customer_id', customerId)
          .select('id')
          .maybeSingle();
        if (profile?.id) await syncChurchVerification(profile.id, plan, false);
      }
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
