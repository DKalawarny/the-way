-- Allow users to delete their own DM messages
drop policy if exists "dm_msg_delete" on dm_messages;
create policy "dm_msg_delete" on dm_messages
  for delete using (sender_id = auth.uid());

-- Allow users to edit (update body of) their own DM messages
drop policy if exists "dm_msg_update" on dm_messages;
create policy "dm_msg_update" on dm_messages
  for update using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- Allow either participant to delete the whole conversation
drop policy if exists "dm_conv_delete" on dm_conversations;
create policy "dm_conv_delete" on dm_conversations
  for delete using (auth.uid() = any(participant_ids));

-- Allow users to delete their own group messages
drop policy if exists "group_msg_delete" on group_messages;
create policy "group_msg_delete" on group_messages
  for delete using (sender_id = auth.uid());

-- Allow users to edit their own group messages
drop policy if exists "group_msg_update" on group_messages;
create policy "group_msg_update" on group_messages
  for update using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- Allow the requester to delete their care conversation
drop policy if exists "care_conv_delete" on care_conversations;
create policy "care_conv_delete" on care_conversations
  for delete using (requester_id = auth.uid());
