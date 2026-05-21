create table if not exists public.flyer_entries (
  spot_id text not null,
  cycle_key text not null,
  name text not null,
  description text not null,
  image_url text not null,
  image_path text,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (spot_id, cycle_key)
);

alter table public.flyer_entries enable row level security;

drop policy if exists "Anyone can read flyer entries" on public.flyer_entries;
create policy "Anyone can read flyer entries"
on public.flyer_entries
for select
to anon
using (true);

drop policy if exists "Anyone can add flyer entries" on public.flyer_entries;
create policy "Anyone can add flyer entries"
on public.flyer_entries
for insert
to anon
with check (true);

drop policy if exists "Anyone can update flyer entries" on public.flyer_entries;
create policy "Anyone can update flyer entries"
on public.flyer_entries
for update
to anon
using (true)
with check (true);

drop policy if exists "Anyone can clear flyer entries" on public.flyer_entries;
create policy "Anyone can clear flyer entries"
on public.flyer_entries
for delete
to anon
using (true);

insert into storage.buckets (id, name, public)
values ('flyer-photos', 'flyer-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can read flyer photos" on storage.objects;
create policy "Anyone can read flyer photos"
on storage.objects
for select
to anon
using (bucket_id = 'flyer-photos');

drop policy if exists "Anyone can upload flyer photos" on storage.objects;
create policy "Anyone can upload flyer photos"
on storage.objects
for insert
to anon
with check (bucket_id = 'flyer-photos');

drop policy if exists "Anyone can update flyer photos" on storage.objects;
create policy "Anyone can update flyer photos"
on storage.objects
for update
to anon
using (bucket_id = 'flyer-photos')
with check (bucket_id = 'flyer-photos');
