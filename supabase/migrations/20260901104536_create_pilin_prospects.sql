create table if not exists public.pilin_prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text not null,
  created_at timestamptz not null default now(),
  status text not null default 'NEW',
  constraint pilin_prospects_status_check check (status in ('NEW','CONTACTED','QUALIFIED','DEMO','CLOSED_WON','CLOSED_LOST'))
);

alter table public.pilin_prospects enable row level security;

create policy "pilin_prospects_anon_insert"
on public.pilin_prospects
for insert
to anon
with check (
  length(trim(name)) between 2 and 120
  and length(trim(whatsapp)) between 8 and 20
  and status = 'NEW'
);

create index if not exists pilin_prospects_created_at_idx
on public.pilin_prospects (created_at desc);

create index if not exists pilin_prospects_status_idx
on public.pilin_prospects (status);

revoke select, update, delete on public.pilin_prospects from anon;
revoke select, insert, update, delete on public.pilin_prospects from authenticated;
grant insert on public.pilin_prospects to anon;;
