import { createClient } from 'npm:@supabase/supabase-js@2';

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { code, user_id } = await req.json();
    if (!code || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing code or user_id' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const normalised = String(code).trim().toUpperCase();

    // Check the user hasn't already redeemed a promo code.
    const { data: profile } = await supabase
      .from('profiles')
      .select('promo_redeemed_at, plan, gift_expires_at, stripe_subscription_id')
      .eq('id', user_id)
      .maybeSingle();

    // Having redeemed before is no longer a lifetime bar — grants expire now, and
    // during the beta someone whose grant has run out should be able to enter the
    // code again rather than dropping to five questions a week while the code is
    // still being handed out. What we block is redeeming on top of a grant that
    // is still running, which would just burn a use for nothing.
    const activeGrant =
      profile?.gift_expires_at && new Date(profile.gift_expires_at).getTime() > Date.now();
    if (activeGrant) {
      return new Response(JSON.stringify({ error: 'Your current plan is still active — no need for a code yet.' }), {
        status: 409, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    // Retiring the code is what ends this: `active = false` stops new and repeat
    // redemptions alike, and everyone lapses to free as their grant runs out.

    // Look up the promo code.
    const { data: promo, error: fetchErr } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', normalised)
      .eq('active', true)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!promo) {
      return new Response(JSON.stringify({ error: 'Invalid or expired promo code.' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (promo.uses >= promo.max_uses) {
      return new Response(JSON.stringify({ error: 'This promo code has reached its limit.' }), {
        status: 410, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + promo.months);

    // Atomically increment uses.
    await supabase
      .from('promo_codes')
      .update({ uses: promo.uses + 1 })
      .eq('id', promo.id);

    const now = new Date();
    // A genuinely paying subscriber gets bonus messages rather than a plan write
    // that would overwrite what they're paying for. Tested on the Stripe id, not
    // on plan === 'premium': someone whose grant has lapsed still reads 'premium'
    // in this column — only the expiry date says otherwise — and sending them
    // down this branch would hand them a topup instead of the renewal they came
    // for. (stripe_subscription_id exists as of the go-live schema migration; the
    // note that it didn't is what made this check unreliable before.)
    const alreadyPaid = !!profile?.stripe_subscription_id;
    if (alreadyPaid) {
      // Paid user: add 200 bonus messages to this month's topup instead of changing plan
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const { data: usageRow } = await supabase
        .from('ai_usage').select('topup').eq('user_id', user_id).eq('period', period).maybeSingle();
      if (usageRow) {
        await supabase.from('ai_usage')
          .update({ topup: (usageRow.topup ?? 0) + 200 })
          .eq('user_id', user_id).eq('period', period);
      } else {
        await supabase.from('ai_usage').insert({ user_id, period, count: 0, topup: 200 });
      }
      await supabase.from('profiles').update({ promo_redeemed_at: now.toISOString() }).eq('id', user_id);
    } else {
      // Free user: upgrade plan for N months
      await supabase.from('profiles').update({
        plan:               promo.plan,
        gift_expires_at:    expiresAt.toISOString(),
        promo_redeemed_at:  now.toISOString(),
      }).eq('id', user_id);
    }

    // Get the user's email for the notification.
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user_id);
    const userEmail = authUser?.email ?? 'unknown';

    // Notify Daniel that a promo code was redeemed.
    const resendKey  = Deno.env.get('RESEND_API_KEY') ?? '';
    const resendFrom = Deno.env.get('RESEND_FROM') ?? 'kinwove <onboarding@resend.dev>';
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from:    resendFrom,
          to:      ['hello@kinwove.com'],
          subject: `Promo code redeemed — ${normalised}`,
          text:    `Someone just used the promo code ${normalised}.\n\nUser: ${userEmail}\nPlan: ${promo.plan} for ${promo.months} months\nExpires: ${expiresAt.toDateString()}\nTotal uses: ${promo.uses + 1} / ${promo.max_uses}`,
        }),
      });
    }

    return new Response(JSON.stringify({
      success:    true,
      plan:       promo.plan,
      months:     promo.months,
      expires_at: expiresAt.toISOString(),
    }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('redeem-promo error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
