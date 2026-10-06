-- NGO hardening: propagate explicit ownership into dependent operational records.
alter table public.medical_history add column if not exists welfare_group_id uuid references public.welfare_orgs(id) on delete set null;
alter table public.recovery_funding add column if not exists welfare_group_id uuid references public.welfare_orgs(id) on delete set null;

create index if not exists idx_medical_history_welfare_group_id on public.medical_history(welfare_group_id);
create index if not exists idx_recovery_funding_welfare_group_id on public.recovery_funding(welfare_group_id);

update public.medical_history mh
set welfare_group_id = a.welfare_group_id
from public.animals a
where mh.welfare_group_id is null
  and mh.animal_id = a.id
  and a.welfare_group_id is not null;

update public.medical_history mh
set welfare_group_id = c.welfare_group_id
from public.cases c
where mh.welfare_group_id is null
  and mh.case_id = c.id
  and c.welfare_group_id is not null;

update public.recovery_funding rf
set welfare_group_id = c.welfare_group_id
from public.cases c
where rf.welfare_group_id is null
  and rf.case_id = c.id
  and c.welfare_group_id is not null;
