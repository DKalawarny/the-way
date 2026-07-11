-- ============================================================================
-- 2026-07-10 — Server-side text moderation (audit: ALL moderation was
--               client-side; anon comments / groups / DMs unfiltered)
-- ----------------------------------------------------------------------------
-- clean_profanity() mirrors src/moderation.js (same deliberately-short list —
-- Bible platform, so hell/damn/ass/whore etc. stay allowed). trg_clean_body()
-- masks flagged words with #### BEFORE INSERT/UPDATE on all nine user-text
-- tables, so no client path can store them. Client-side cleaning remains as
-- the instant-feedback layer. Run in the Supabase SQL editor. Idempotent.
-- ============================================================================

create or replace function public.clean_profanity(p_text text)
returns text
language sql
immutable
as $c$
  select regexp_replace(
    p_text,
    '\m(fuck|fucking|fucker|fuckers|fucked|fucks|motherfucker|motherfucking|shit|shitting|shitty|bullshit|cunt|cunts|twat|twats|bitch|bitches|asshole|arshole|arsehole|nigger|niggers|nigga|niggas|faggot|faggots|retard|retards|retarded|spic|spics|kike|kikes|chink|chinks)\M',
    '####', 'gi'
  );
$c$;

create or replace function public.trg_clean_body()
returns trigger
language plpgsql
as $t$
begin
  if new.body is not null then
    new.body := public.clean_profanity(new.body);
  end if;
  return new;
end;
$t$;

drop trigger if exists trg_clean_posts on public.posts;
create trigger trg_clean_posts before insert or update of body on public.posts
  for each row execute function public.trg_clean_body();

drop trigger if exists trg_clean_post_comments on public.post_comments;
create trigger trg_clean_post_comments before insert or update of body on public.post_comments
  for each row execute function public.trg_clean_body();

drop trigger if exists trg_clean_personal_prayers on public.personal_prayers;
create trigger trg_clean_personal_prayers before insert or update of body on public.personal_prayers
  for each row execute function public.trg_clean_body();

drop trigger if exists trg_clean_prayers on public.prayers;
create trigger trg_clean_prayers before insert or update of body on public.prayers
  for each row execute function public.trg_clean_body();

drop trigger if exists trg_clean_group_posts on public.group_posts;
create trigger trg_clean_group_posts before insert or update of body on public.group_posts
  for each row execute function public.trg_clean_body();

drop trigger if exists trg_clean_group_messages on public.group_messages;
create trigger trg_clean_group_messages before insert or update of body on public.group_messages
  for each row execute function public.trg_clean_body();

drop trigger if exists trg_clean_dm_messages on public.dm_messages;
create trigger trg_clean_dm_messages before insert or update of body on public.dm_messages
  for each row execute function public.trg_clean_body();

drop trigger if exists trg_clean_care_messages on public.care_messages;
create trigger trg_clean_care_messages before insert or update of body on public.care_messages
  for each row execute function public.trg_clean_body();

drop trigger if exists trg_clean_sermon_discussions on public.sermon_discussions;
create trigger trg_clean_sermon_discussions before insert or update of body on public.sermon_discussions
  for each row execute function public.trg_clean_body();

-- Verify: select count(*) from pg_trigger where tgname like 'trg_clean_%' and not tgisinternal;  -- 9
-- ============================================================================
