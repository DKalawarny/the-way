-- ── Bible notes ──────────────────────────────────────────────────────────────
create table if not exists public.bible_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  book_id    text not null,
  book_name  text not null,
  chapter    integer not null,
  verse      integer not null,
  verse_text text,
  note_text  text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id, chapter, verse)
);

alter table public.bible_notes enable row level security;

create policy "Users manage own bible notes"
  on public.bible_notes for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Birthday + youth sponsorship on profiles ─────────────────────────────────
alter table public.profiles
  add column if not exists birthday          date,
  add column if not exists is_youth_sponsored boolean default false;

-- ── Youth invite code on churches ────────────────────────────────────────────
alter table public.churches
  add column if not exists youth_invite_code text unique;
