-- ============================================================================
-- 2026-06-08 — Admin analytics tables + get_platform_stats RPC
-- ----------------------------------------------------------------------------
-- Creates three missing objects required by /api/admin/dashboard:
--
--   topic_counts          — per-topic keyword hit counter (slug → count)
--   increment_topic_count — RPC called by server.js on every AI question
--   ai_feedback           — thumbs-down feedback log from Chat.jsx
--   get_platform_stats    — single RPC that returns all dashboard aggregates
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. topic_counts — one row per topic slug, incremented on each AI question
-- ---------------------------------------------------------------------------
create table if not exists public.topic_counts (
  topic_slug   text primary key,
  count        bigint not null default 0,
  last_seen_at timestamptz not null default now()
);

alter table public.topic_counts enable row level security;
-- No client access — writes via service role only.

create or replace function public.increment_topic_count(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.topic_counts (topic_slug, count, last_seen_at)
  values (p_slug, 1, now())
  on conflict (topic_slug) do update
    set count        = topic_counts.count + 1,
        last_seen_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. ai_feedback — thumbs-down / flag submissions from Chat.jsx
-- ---------------------------------------------------------------------------
create table if not exists public.ai_feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete set null,
  message_text text not null,
  created_at   timestamptz not null default now()
);

alter table public.ai_feedback enable row level security;
-- No client access — writes via service role only.

-- ---------------------------------------------------------------------------
-- 3. get_platform_stats — single JSON object returned to /api/admin/dashboard
-- ---------------------------------------------------------------------------
create or replace function public.get_platform_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_users          bigint;
  v_verified_churches    bigint;
  v_total_churches       bigint;
  v_pending_apps         bigint;
  v_total_posts          bigint;
  v_total_prayers        bigint;
  v_total_shared         bigint;
  v_total_ai_events      bigint;
  v_first_turn_events    bigint;
  v_cache_hits           bigint;
  v_new_users_week       bigint;
  v_new_users_month      bigint;
  v_model_dist           jsonb;
  v_person_type_dist     jsonb;
  v_country_dist         jsonb;
  v_top_churches         jsonb;
  v_user_signups_weekly  jsonb;
  v_ai_events_weekly     jsonb;
begin
  -- Core counts
  select count(*) into v_total_users
    from public.profiles
    where (is_system_account is null or is_system_account = false);

  select count(*) into v_verified_churches
    from public.churches
    where verification_status = 'verified';

  select count(*) into v_total_churches
    from public.churches;

  select count(*) into v_pending_apps
    from public.pastor_applications
    where status = 'pending';

  select count(*) into v_total_posts
    from public.posts;

  select count(*) into v_total_prayers
    from public.personal_prayers;

  select count(*) into v_total_shared
    from public.shared_conversations;

  select count(*),
         count(*) filter (where is_first_turn = true),
         count(*) filter (where was_cache_hit = true)
    into v_total_ai_events, v_first_turn_events, v_cache_hits
    from public.qa_events;

  select count(*) into v_new_users_week
    from public.profiles
    where created_at >= now() - interval '7 days'
      and (is_system_account is null or is_system_account = false);

  select count(*) into v_new_users_month
    from public.profiles
    where created_at >= now() - interval '30 days'
      and (is_system_account is null or is_system_account = false);

  -- Model distribution
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_model_dist
    from (
      select model_used as model, count(*) as count
        from public.qa_events
        where model_used is not null
        group by model_used
        order by count desc
    ) t;

  -- Person type distribution (from profiles)
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_person_type_dist
    from (
      select person_type as type, count(*) as count
        from public.profiles
        where person_type is not null
        group by person_type
        order by count desc
    ) t;

  -- Country distribution (from churches)
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_country_dist
    from (
      select country, count(*) as count
        from public.churches
        where country is not null and country <> ''
        group by country
        order by count desc
    ) t;

  -- Top churches by member count
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_top_churches
    from (
      select c.id, c.name, c.city, c.verification_status as status,
             count(p.id) as member_count
        from public.churches c
        left join public.profiles p on p.church_id = c.id
        group by c.id, c.name, c.city, c.verification_status
        order by member_count desc
        limit 20
    ) t;

  -- User signups per week (last 10 weeks)
  select coalesce(jsonb_agg(row_to_json(t) order by t.week), '[]'::jsonb) into v_user_signups_weekly
    from (
      select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
             count(*) as count
        from public.profiles
        where created_at >= now() - interval '10 weeks'
          and (is_system_account is null or is_system_account = false)
        group by date_trunc('week', created_at)
        order by week
    ) t;

  -- AI events per week (last 10 weeks)
  select coalesce(jsonb_agg(row_to_json(t) order by t.week), '[]'::jsonb) into v_ai_events_weekly
    from (
      select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
             count(*) as count
        from public.qa_events
        where created_at >= now() - interval '10 weeks'
        group by date_trunc('week', created_at)
        order by week
    ) t;

  return jsonb_build_object(
    'total_users',         v_total_users,
    'verified_churches',   v_verified_churches,
    'total_churches',      v_total_churches,
    'pending_apps',        v_pending_apps,
    'total_posts',         v_total_posts,
    'total_prayers',       v_total_prayers,
    'total_shared',        v_total_shared,
    'total_ai_events',     v_total_ai_events,
    'first_turn_events',   v_first_turn_events,
    'cache_hits',          v_cache_hits,
    'new_users_week',      v_new_users_week,
    'new_users_month',     v_new_users_month,
    'model_dist',          v_model_dist,
    'person_type_dist',    v_person_type_dist,
    'country_dist',        v_country_dist,
    'top_churches',        v_top_churches,
    'user_signups_weekly', v_user_signups_weekly,
    'ai_events_weekly',    v_ai_events_weekly
  );
end;
$$;
