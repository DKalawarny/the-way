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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { code, user_id } = await req.json();
    if (!code || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing code or user_id' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const normalised = String(code).trim().toUpperCase();

    const { data: gift, error: fetchErr } = await supabase
      .from('gift_codes')
      .select('*')
      .eq('code', normalised)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!gift) {
      return new Response(JSON.stringify({ error: 'Code not found.' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (gift.redeemed_by) {
      return new Response(JSON.stringify({ error: 'This code has already been redeemed.' }), {
        status: 409, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (new Date(gift.redeem_by) < new Date()) {
      return new Response(JSON.stringify({ error: 'This code has expired.' }), {
        status: 410, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + gift.months);

    // Mark redeemed
    await supabase.from('gift_codes').update({
      redeemed_by: user_id,
      redeemed_at: new Date().toISOString(),
      expires_at:  expiresAt.toISOString(),
    }).eq('id', gift.id);

    // Upgrade profile — only if not already on a higher paid plan
    const { data: profile } = await supabase
      .from('profiles').select('plan, stripe_subscription_id').eq('id', user_id).maybeSingle();

    const alreadyPaid = profile?.stripe_subscription_id || profile?.plan === 'premium_plus';
    if (!alreadyPaid) {
      await supabase.from('profiles').update({
        plan:             gift.plan,
        gift_expires_at:  expiresAt.toISOString(),
      }).eq('id', user_id);
    }

    return new Response(JSON.stringify({
      success: true,
      plan:    gift.plan,
      months:  gift.months,
      expires_at: expiresAt.toISOString(),
    }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('redeem-gift error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
