-- NGO hardening: dependent ownership and database privilege tightening.
alter table public.medical_history add column if not exists welfare_group_id uuid references public.welfare_orgs(id) on delete set null;
alter table public.recovery_funding add column if not exists welfare_group_id uuid references public.welfare_orgs(id) on delete set null;

create index if not exists idx_medical_history_welfare_group_id on public.medical_history(welfare_group_id);
create index if not exists idx_recovery_funding_welfare_group_id on public.recovery_funding(welfare_group_id);

update public.medical_history mh set welfare_group_id = a.welfare_group_id
from public.animals a where mh.welfare_group_id is null and mh.animal_id = a.id and a.welfare_group_id is not null;
update public.medical_history mh set welfare_group_id = c.welfare_group_id
from public.cases c where mh.welfare_group_id is null and mh.case_id = c.id and c.welfare_group_id is not null;
update public.recovery_funding rf set welfare_group_id = c.welfare_group_id
from public.cases c where rf.welfare_group_id is null and rf.case_id = c.id and c.welfare_group_id is not null;

alter view public.ward_animal_summary set (security_invoker = true);

revoke execute on function public.rls_auto_enable() from anon, authenticated;
revoke execute on function public.st_estimatedextent(text,text) from anon, authenticated;
revoke execute on function public.st_estimatedextent(text,text,text) from anon, authenticated;
revoke execute on function public.st_estimatedextent(text,text,text,boolean) from anon, authenticated;

alter function public.update_updated_at_column() set search_path = public, pg_catalog;
alter function public.update_welfare_payments_updated_at() set search_path = public, pg_catalog;
