create table if not exists public.rehome_requests (
  id uuid primary key default uuid_generate_v4(),
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  animal_type text not null check (animal_type in ('own_pet','community_animal')),
  species text not null check (species in ('dog','cat','bird','other')),
  animal_name text,
  breed text,
  age_months integer check (age_months is null or age_months >= 0),
  gender text,
  description text not null,
  rehome_reason text not null,
  contact_name text not null,
  contact_phone text not null,
  location_text text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  photo_url text,
  ownership_confirmed boolean not null default false,
  helper_acknowledged boolean not null default false,
  status text not null default 'pending_review' check (status in ('pending_review','needs_info','approved','rejected','withdrawn')),
  reviewer_user_id uuid references auth.users(id) on delete set null,
  review_notes text,
  linked_animal_id uuid references public.animals(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rehome_request_authority_check check (
    (animal_type = 'own_pet' and ownership_confirmed = true)
    or (animal_type = 'community_animal' and helper_acknowledged = true)
  )
);
create index if not exists rehome_requests_applicant_created_idx on public.rehome_requests(applicant_user_id, created_at desc);
create index if not exists rehome_requests_review_queue_idx on public.rehome_requests(status, created_at asc);
alter table public.rehome_requests enable row level security;
revoke all on public.rehome_requests from anon, authenticated;
grant select, insert, update on public.rehome_requests to authenticated;
drop policy if exists "Applicants can read own rehome requests" on public.rehome_requests;
create policy "Applicants can read own rehome requests" on public.rehome_requests
  for select to authenticated using ((select auth.uid()) = applicant_user_id);
drop policy if exists "Applicants can submit own rehome requests" on public.rehome_requests;
create policy "Applicants can submit own rehome requests" on public.rehome_requests
  for insert to authenticated with check ((select auth.uid()) = applicant_user_id);
-- All privileged review and animal publication writes are performed by the server API
-- with role checks; client-side access to this table is intentionally not granted for updates.
revoke update on public.rehome_requests from authenticated;
