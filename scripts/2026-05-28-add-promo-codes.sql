-- Add KINWOVE-FRIENDS promo code (and common typo variant KINWOVE-FRIEND)
-- plan: 'premium' = Individual ($6.99/mo tier)
-- months: 3
-- max_uses: 500 (generous — adjust as needed)

insert into public.promo_codes (code, plan, months, max_uses, uses, active)
values
  ('KINWOVE-FRIENDS', 'premium', 3, 500, 0, true),
  ('KINWOVE-FRIEND',  'premium', 3, 500, 0, true)
on conflict (code) do update
  set active    = true,
      max_uses  = excluded.max_uses,
      plan      = excluded.plan,
      months    = excluded.months;
