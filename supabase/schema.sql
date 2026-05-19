create table if not exists public.personal_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.personal_data enable row level security;

drop policy if exists "personal_data_select_own" on public.personal_data;
create policy "personal_data_select_own"
on public.personal_data
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "personal_data_insert_own" on public.personal_data;
create policy "personal_data_insert_own"
on public.personal_data
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "personal_data_update_own" on public.personal_data;
create policy "personal_data_update_own"
on public.personal_data
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_personal_data_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personal_data_updated_at on public.personal_data;
create trigger personal_data_updated_at
before update on public.personal_data
for each row
execute function public.set_personal_data_updated_at();
