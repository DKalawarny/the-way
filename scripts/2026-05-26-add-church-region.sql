-- Add region column to churches (province / state / county)
-- Run in Supabase SQL Editor
alter table public.churches add column if not exists region text;
