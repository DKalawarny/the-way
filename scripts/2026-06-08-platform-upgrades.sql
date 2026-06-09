-- ============================================================================
-- 2026-06-08 — Platform upgrades: user_reports table + expanded get_platform_stats
-- ----------------------------------------------------------------------------
-- 1. user_reports  — in-app contact / bug-report submissions
-- 2. get_platform_stats (drop + recreate) — adds activation_rate, WAU,
--    profile_completion_rate, tradition_dist, avg_ai_turns, posts/prayers
--    this week, thumbs_down_count, dead_accounts, zombie_churches, avg_follows
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. user_reports — submitted from "Report an issue" in the app menu
-- ---------------------------------------------------------------------------
create table if not exists public.user_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  category    text not null check (category in ('bug','ai','complaint','suggestion','other')),
  subject     text not null,
  body        text not null,
  status      text not null default 'open' check (status in ('open','resolved','dismissed')),
  admin_note  text,
  created_at  timestamptz not null default now()
);

alter table public.user_reports enable row level security;

-- Users can submit reports; no select policy (admin reads via service role only)
drop policy if exists "users can submit reports" on public.user_reports;
create policy "users can submit reports" on public.user_reports
  for insert to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- ---------------------------------------------------------------------------
-- 2. get_platform_stats — drop old signature first, then recreate with new fields
-- ---------------------------------------------------------------------------
drop function if exists public.get_platform_stats();

create or replace function public.get_platform_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_users             bigint;
  v_verified_churches       bigint;
  v_total_churches          bigint;
  v_pending_apps            bigint;
  v_total_posts             bigint;
  v_total_prayers           bigint;
  v_total_shared            bigint;
  v_total_ai_events         bigint;
  v_first_turn_events       bigint;
  v_cache_hits              bigint;
  v_new_users_week          bigint;
  v_new_users_month         bigint;
  -- New fields
  v_activation_rate         numeric;
  v_weekly_active_users     bigint;
  v_profile_completion_rate numeric;
  v_avg_ai_turns            numeric;
  v_posts_this_week         bigint;
  v_prayers_this_week       bigint;
  v_thumbs_down_count       bigint;
  v_dead_accounts           bigint;
  v_zombie_churches         bigint;
  v_avg_follows             numeric;
  -- Distributions
  v_model_dist              jsonb;
  v_person_type_dist        jsonb;
  v_tradition_dist          jsonb;
  v_country_dist            jsonb;
  v_top_churches            jsonb;
  v_user_signups_weekly     jsonb;
  v_ai_events_weekly        jsonb;
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

  -- ── New metrics ────────────────────────────────────────────────────────────

  -- Activation rate: % of users who have had ≥1 AI conversation
  select round(
    count(distinct q.user_id)::numeric
    / nullif(count(distinct p.id), 0) * 100, 1
  ) into v_activation_rate
    from public.profiles p
    left join public.qa_events q on q.user_id = p.id
    where (p.is_system_account is null or p.is_system_account = false);

  -- Weekly active users (had AI conversation in last 7 days)
  select count(distinct user_id) into v_weekly_active_users
    from public.qa_events
    where created_at >= now() - interval '7 days';

  -- Profile completion rate: % of users with tradition AND person_type set
  select round(
    count(*) filter (where tradition is not null and person_type is not null)::numeric
    / nullif(count(*), 0) * 100, 1
  ) into v_profile_completion_rate
    from public.profiles
    where (is_system_account is null or is_system_account = false);

  -- Average AI turns per conversation
  select round(
    count(*)::numeric
    / nullif(count(*) filter (where is_first_turn = true), 0), 1
  ) into v_avg_ai_turns
    from public.qa_events;

  -- Community posts this week
  select count(*) into v_posts_this_week
    from public.posts
    where created_at >= now() - interval '7 days';

  -- Prayers this week
  select count(*) into v_prayers_this_week
    from public.personal_prayers
    where created_at >= now() - interval '7 days';

  -- Thumbs-down / feedback count (last 30 days)
  select count(*) into v_thumbs_down_count
    from public.ai_feedback
    where created_at >= now() - interval '30 days';

  -- Dead accounts: signed up >7 days ago, zero AI + zero posts
  select count(*) into v_dead_accounts
    from public.profiles p
    where p.created_at < now() - interval '7 days'
      and (p.is_system_account is null or p.is_system_account = false)
      and not exists (select 1 from public.qa_events q where q.user_id = p.id)
      and not exists (select 1 from public.posts po where po.author_id = p.id);

  -- Zombie churches: created >7 days ago, 0 members
  select count(*) into v_zombie_churches
    from public.churches c
    where c.created_at < now() - interval '7 days'
      and not exists (select 1 from public.profiles p where p.church_id = c.id);

  -- Average follows per user
  select round(
    count(*)::numeric
    / nullif(
        (select count(*) from public.profiles
         where is_system_account is null or is_system_account = false),
        0
      ), 1
  ) into v_avg_follows
    from public.follows;

  -- ── Distributions ─────────────────────────────────────────────────────────

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_model_dist
    from (
      select model_used as model, count(*) as count
        from public.qa_events
        where model_used is not null
        group by model_used
        order by count desc
    ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_person_type_dist
    from (
      select person_type as type, count(*) as count
        from public.profiles
        where person_type is not null
          and (is_system_account is null or is_system_account = false)
        group by person_type
        order by count desc
    ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_tradition_dist
    from (
      select tradition as type, count(*) as count
        from public.profiles
        where tradition is not null and tradition <> ''
          and (is_system_account is null or is_system_account = false)
        group by tradition
        order by count desc
    ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_country_dist
    from (
      select country, count(*) as count
        from public.churches
        where country is not null and country <> ''
        group by country
        order by count desc
    ) t;

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
    -- Existing fields
    'total_users',              v_total_users,
    'verified_churches',        v_verified_churches,
    'total_churches',           v_total_churches,
    'pending_apps',             v_pending_apps,
    'total_posts',              v_total_posts,
    'total_prayers',            v_total_prayers,
    'total_shared',             v_total_shared,
    'total_ai_events',          v_total_ai_events,
    'first_turn_events',        v_first_turn_events,
    'cache_hits',               v_cache_hits,
    'new_users_week',           v_new_users_week,
    'new_users_month',          v_new_users_month,
    -- New fields
    'activation_rate',          v_activation_rate,
    'weekly_active_users',      v_weekly_active_users,
    'profile_completion_rate',  v_profile_completion_rate,
    'avg_ai_turns',             v_avg_ai_turns,
    'posts_this_week',          v_posts_this_week,
    'prayers_this_week',        v_prayers_this_week,
    'thumbs_down_count',        v_thumbs_down_count,
    'dead_accounts',            v_dead_accounts,
    'zombie_churches',          v_zombie_churches,
    'avg_follows',              v_avg_follows,
    -- Distributions
    'model_dist',               v_model_dist,
    'person_type_dist',         v_person_type_dist,
    'tradition_dist',           v_tradition_dist,
    'country_dist',             v_country_dist,
    'top_churches',             v_top_churches,
    'user_signups_weekly',      v_user_signups_weekly,
    'ai_events_weekly',         v_ai_events_weekly
  );
end;
$$;
