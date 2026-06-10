-- kinwove persona: auto-follow system account on signup + backfill existing users
-- Run in Supabase SQL editor.

-- 1. Trigger: every new profile auto-follows the kinwove system account
create or replace function public.auto_follow_kinwove()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_kinwove_id uuid;
begin
  select id into v_kinwove_id from public.profiles where is_system_account = true limit 1;
  if v_kinwove_id is not null and new.id != v_kinwove_id then
    insert into public.follows (follower_id, following_id)
    values (new.id, v_kinwove_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_follow_kinwove on public.profiles;
create trigger trg_auto_follow_kinwove
  after insert on public.profiles
  for each row execute function public.auto_follow_kinwove();

-- 2. Backfill: existing users follow kinwove too
insert into public.follows (follower_id, following_id)
select p.id, k.id
from public.profiles p
cross join (select id from public.profiles where is_system_account = true limit 1) k
where p.id != k.id
  and (p.is_system_account is null or p.is_system_account = false)
on conflict do nothing;
