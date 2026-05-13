-- Flags: up to 2 ISO 3166-1 alpha-2 country codes per user profile
alter table profiles
  add column if not exists flags text[] not null default '{}',
  add column if not exists preferred_language text not null default 'en';

alter table profiles
  add constraint profiles_flags_max check (cardinality(flags) <= 2);

-- Churches: up to 2 countries they're open to / serve
alter table churches
  add column if not exists countries_open_to text[] not null default '{}';

alter table churches
  add constraint churches_countries_open_to_max check (cardinality(countries_open_to) <= 2);
