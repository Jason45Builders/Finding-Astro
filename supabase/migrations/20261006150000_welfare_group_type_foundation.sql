-- Welfare Group foundation: reuse the existing welfare_orgs parent model
-- and make its org_type the canonical group-type discriminator.
--
-- Existing rows are all legacy NGOs; preserve them as 'ngo'. Rescue collectives
-- use the same parent table, membership table, role model and resource ownership.

alter table public.welfare_orgs
  alter column org_type set default 'ngo',
  alter column org_type set not null;

alter table public.welfare_orgs
  drop constraint if exists welfare_orgs_org_type_check;

alter table public.welfare_orgs
  add constraint welfare_orgs_org_type_check
  check (org_type in ('ngo', 'rescue_collective'));

comment on column public.welfare_orgs.org_type is
  'Welfare group type: ngo or rescue_collective.';

create index if not exists idx_welfare_orgs_org_type
  on public.welfare_orgs(org_type);
