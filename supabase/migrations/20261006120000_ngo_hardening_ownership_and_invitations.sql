-- NGO hardening: explicit organization ownership + invitation lifecycle.
-- Legacy records are intentionally left nullable when ownership cannot be proven.

alter table public.animals
  add column if not exists welfare_group_id uuid references public.welfare_orgs(id) on delete set null;
alter table public.cases
  add column if not exists welfare_group_id uuid references public.welfare_orgs(id) on delete set null;
alter table public.adoption_applications
  add column if not exists welfare_group_id uuid references public.welfare_orgs(id) on delete set null;
alter table public.vaccinations
  add column if not exists welfare_group_id uuid references public.welfare_orgs(id) on delete set null;

create index if not exists idx_animals_welfare_group_id on public.animals(welfare_group_id);
create index if not exists idx_cases_welfare_group_id on public.cases(welfare_group_id);
create index if not exists idx_adoption_applications_welfare_group_id on public.adoption_applications(welfare_group_id);
create index if not exists idx_vaccinations_welfare_group_id on public.vaccinations(welfare_group_id);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'organization_invitation_status') then
    create type public.organization_invitation_status as enum ('pending','accepted','revoked','expired');
  end if;
end $$;

create table if not exists public.organization_invitations (
  id uuid primary key default extensions.uuid_generate_v4(),
  welfare_group_id uuid not null references public.welfare_orgs(id) on delete cascade,
  invited_email text not null,
  invited_user_id uuid references public.users(id) on delete set null,
  invited_by uuid not null references public.users(id) on delete restrict,
  org_role public.org_role not null default 'volunteer',
  token_hash text not null unique,
  status public.organization_invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_org_invitations_group on public.organization_invitations(welfare_group_id);
create index if not exists idx_org_invitations_email on public.organization_invitations(lower(invited_email));
create index if not exists idx_org_invitations_status_expiry on public.organization_invitations(status, expires_at);

create unique index if not exists uq_pending_org_invitation_email
  on public.organization_invitations(welfare_group_id, lower(invited_email))
  where status = 'pending';

-- Safe backfill only when the creator/reporter has exactly one active NGO
-- membership. Ambiguous and unowned legacy records remain NULL by design.
update public.animals a
set welfare_group_id = m.welfare_group_id
from (
  select user_id, min(welfare_group_id) welfare_group_id
  from public.organization_members
  where is_active = true
  group by user_id
  having count(distinct welfare_group_id) = 1
) m
where a.welfare_group_id is null
  and a.created_by_user_id = m.user_id;

update public.cases c
set welfare_group_id = m.welfare_group_id
from (
  select user_id, min(welfare_group_id) welfare_group_id
  from public.organization_members
  where is_active = true
  group by user_id
  having count(distinct welfare_group_id) = 1
) m
where c.welfare_group_id is null
  and c.reporter_user_id = m.user_id;

update public.adoption_applications a
set welfare_group_id = an.welfare_group_id
from public.animals an
where a.welfare_group_id is null
  and a.animal_id = an.id
  and an.welfare_group_id is not null;
