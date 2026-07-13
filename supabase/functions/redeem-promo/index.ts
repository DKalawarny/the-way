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
    // NOTE: select only columns that exist — this previously selected
    // stripe_subscription_id (nonexistent), which errored the whole lookup
    // and silently BYPASSED the already-redeemed check for everyone.
    const { data: profile } = await supabase
      .from('profiles')
      .select('promo_redeemed_at, plan')
      .eq('id', user_id)
      .maybeSingle();

    if (profile?.promo_redeemed_at) {
      return new Response(JSON.stringify({ error: 'You have already redeemed a promo code.' }), {
        status: 409, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

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
    // Already on a paid individual tier → bonus messages instead of a
    // redundant plan write (no personal Stripe columns exist pre-go-live).
    const alreadyPaid = profile?.plan === 'premium' || profile?.plan === 'premium_plus';
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
