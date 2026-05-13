-- ── Stripe columns on profiles (safe — only adds if missing) ────────────────
alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text;

-- ── Question of the Day on churches ─────────────────────────────────────────
alter table public.churches
  add column if not exists question_of_day text,
  add column if not exists question_of_day_set_at timestamptz,
  add column if not exists question_of_day_set_by uuid references auth.users(id);

-- ── Trigger: notify prayer owner when someone prays for them ────────────────
create or replace function public.notify_prayer_support()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_owner_id uuid;
begin
  select user_id into v_owner_id
  from public.personal_prayers
  where id = new.prayer_id;

  -- Don't notify yourself
  if v_owner_id is null or v_owner_id = new.user_id then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, kind, data)
  values (
    v_owner_id,
    new.user_id,
    'prayer_support',
    jsonb_build_object('prayer_id', new.prayer_id)
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trg_notify_prayer_support on public.personal_prayer_support;
create trigger trg_notify_prayer_support
  after insert on public.personal_prayer_support
  for each row execute procedure public.notify_prayer_support();
