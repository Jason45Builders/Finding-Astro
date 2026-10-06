create table if not exists public.rescue_collective_donation_settings (
  welfare_group_id uuid primary key references public.welfare_orgs(id) on delete cascade,
  donation_admin_user_id uuid not null references public.users(id) on delete restrict,
  upi_id text not null,
  upi_name text,
  monthly_target_inr numeric(12,2),
  donations_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rescue_collective_donation_settings_upi_check
    check (length(trim(upi_id)) between 4 and 50 and position('@' in upi_id) > 1),
  constraint rescue_collective_donation_settings_target_check
    check (monthly_target_inr is null or monthly_target_inr >= 0)
);

create index if not exists idx_rc_donation_settings_admin
  on public.rescue_collective_donation_settings (donation_admin_user_id);

alter table public.rescue_collective_donation_settings enable row level security;
alter table public.rescue_collective_donation_settings force row level security;
revoke all on table public.rescue_collective_donation_settings from anon, authenticated;
drop policy if exists "deny direct data api access" on public.rescue_collective_donation_settings;
create policy "deny direct data api access"
  on public.rescue_collective_donation_settings
  for all to anon, authenticated
  using (false)
  with check (false);

create unique index if not exists idx_welfare_payments_group_utr
  on public.welfare_payments (welfare_group_id, utr);

create or replace function public.update_rescue_collective_donation_settings_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_rescue_collective_donation_settings_updated_at
  on public.rescue_collective_donation_settings;

create trigger trg_rescue_collective_donation_settings_updated_at
before update on public.rescue_collective_donation_settings
for each row execute function public.update_rescue_collective_donation_settings_updated_at();

revoke execute on function public.update_rescue_collective_donation_settings_updated_at() from public, anon, authenticated;
