-- Media subsystem hardening: establish an authoritative ledger and a private
-- bucket for sensitive uploads while preserving the existing public bucket.
alter table public.media_uploads
  add column if not exists storage_bucket text,
  add column if not exists storage_key text,
  add column if not exists visibility text not null default 'public',
  add column if not exists status text not null default 'ready',
  add column if not exists scan_status text not null default 'unverified',
  add column if not exists scan_provider text,
  add column if not exists scan_threat text,
  add column if not exists content_type text,
  add column if not exists byte_size bigint,
  add column if not exists sha256 text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

update public.media_uploads
set storage_bucket = coalesce(storage_bucket, 'finding-astro-media'),
    storage_key = coalesce(storage_key, nullif(regexp_replace(cdn_url, '^.*/object/public/finding-astro-media/', ''), '')),
    content_type = coalesce(content_type, mime_type),
    byte_size = coalesce(byte_size, size_bytes::bigint),
    updated_at = coalesce(updated_at, created_at, now())
where storage_bucket is null or storage_key is null or content_type is null or byte_size is null;

create unique index if not exists media_uploads_storage_location_uidx
  on public.media_uploads(storage_bucket, storage_key)
  where storage_key is not null and deleted_at is null;

create index if not exists media_uploads_owner_idx
  on public.media_uploads(uploaded_by_id, created_at desc);

create index if not exists media_uploads_case_idx
  on public.media_uploads(linked_case_id)
  where linked_case_id is not null;

create index if not exists media_uploads_animal_idx
  on public.media_uploads(linked_animal_id)
  where linked_animal_id is not null;

create index if not exists media_uploads_status_idx
  on public.media_uploads(status, scan_status);

alter table public.media_uploads
  drop constraint if exists media_uploads_visibility_check;
alter table public.media_uploads
  add constraint media_uploads_visibility_check
  check (visibility in ('public','private'));

alter table public.media_uploads
  drop constraint if exists media_uploads_status_check;
alter table public.media_uploads
  add constraint media_uploads_status_check
  check (status in ('uploading','ready','quarantined','deleted','failed'));

alter table public.media_uploads
  drop constraint if exists media_uploads_scan_status_check;
alter table public.media_uploads
  add constraint media_uploads_scan_status_check
  check (scan_status in ('clean','infected','unverified','error'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'finding-astro-private',
  'finding-astro-private',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']::text[]
where id = 'finding-astro-media';
