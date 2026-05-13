-- Direct messages between any two users.
-- participant_ids is always stored sorted so the pair is order-independent.

create table if not exists dm_conversations (
  id               uuid primary key default gen_random_uuid(),
  participant_ids  uuid[] not null check (array_length(participant_ids, 1) = 2),
  created_at       timestamptz default now(),
  last_message_at  timestamptz
);

alter table dm_conversations enable row level security;

create policy "dm_conv_select" on dm_conversations
  for select using (auth.uid() = any(participant_ids));

create policy "dm_conv_insert" on dm_conversations
  for insert with check (auth.uid() = any(participant_ids));


create table if not exists dm_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references dm_conversations(id) on delete cascade,
  sender_id        uuid not null references profiles(id) on delete cascade,
  body             text not null check (char_length(body) between 1 and 2000),
  created_at       timestamptz default now()
);

alter table dm_messages enable row level security;

create policy "dm_msg_select" on dm_messages
  for select using (
    exists (
      select 1 from dm_conversations dc
      where dc.id = conversation_id
      and auth.uid() = any(dc.participant_ids)
    )
  );

create policy "dm_msg_insert" on dm_messages
  for insert with check (
    sender_id = auth.uid() and
    exists (
      select 1 from dm_conversations dc
      where dc.id = conversation_id
      and auth.uid() = any(dc.participant_ids)
    )
  );

-- Keep last_message_at current so the inbox can sort by recency.
create or replace function update_dm_last_message_at()
returns trigger language plpgsql security definer as $$
begin
  update dm_conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_dm_last_message_at on dm_messages;
create trigger trg_dm_last_message_at
  after insert on dm_messages
  for each row execute function update_dm_last_message_at();
