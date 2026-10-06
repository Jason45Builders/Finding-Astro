alter table public.media_uploads add column if not exists entity_type text;
alter table public.media_uploads add column if not exists entity_id uuid;
alter table public.media_uploads add column if not exists attached_at timestamptz;
alter table public.media_uploads add column if not exists last_reconciled_at timestamptz;

create index if not exists media_uploads_entity_idx
  on public.media_uploads(entity_type, entity_id)
  where entity_id is not null;

create index if not exists media_uploads_unattached_idx
  on public.media_uploads(status, attached_at)
  where status = 'ready' and attached_at is null;

comment on column public.media_uploads.entity_type is
  'Polymorphic feature entity type for lifecycle/authorization.';
comment on column public.media_uploads.entity_id is
  'Identifier of the feature entity represented by this media record when applicable.';