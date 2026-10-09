# Media System Hardening Tracker

> Scope: end-to-end media upload, storage, delivery, attachment, lifecycle, and security hardening for Finding Astro.
>
> Strategy: one cohesive implementation block. Preserve existing user media; migrate/reconcile safely; do not delete unmatched objects without explicit evidence.

## Status

- [x] Initial architecture audit completed
- [x] Both branches audited for core media parity
- [x] Supabase storage/schema state audited
- [x] Canonical media ledger/schema hardening
- [x] Upload validation hardening
- [x] Malware scanning behavior hardened
- [x] EXIF/privacy handling corrected
- [x] Storage visibility/access model corrected
- [x] Canonical media API contract implemented
- [x] Existing media consumers preserved through backward-compatible canonical upload response; new sensitive uploads use private delivery
- [x] Attachment lifecycle metadata added to ledger; upload records explicit entity context and attachment timestamp where supplied
- [x] Existing storage objects reconciled into the ledger
- [x] Orphan handling reviewed (no blind deletion)
- [x] Regression tests added for metadata sanitization and scanner fail-closed behavior; execution awaits CI/deployment capacity
- [x] Production build verified on master after fixing the ArrayBufferLike metadata-sanitizer type error; feature-branch deployment is queued
- [x] Master branch brought to parity via merged PR #1
- [ ] HTTP smoke tests for unauthenticated upload/proxy and authenticated upload remain; direct HTTP access from this execution environment is unavailable

## Target Contract

`upload -> media_id`

`attach -> media_id + entity`

`read -> authorized URL / authorized delivery`

`delete/detach -> lifecycle cleanup`

## Non-negotiable controls

- Server validates actual uploaded bytes and actual size; never trusts client-reported size/type.
- MIME allowlisting is backed by content/signature validation.
- Malware scanning is not silently fail-open for protected media.
- EXIF/GPS metadata is stripped where applicable, including profile media unless a documented exception is required.
- Sensitive media is not exposed through a public bucket or unauthenticated proxy.
- Every successful upload has a durable media ledger record with owner, purpose, storage location, status, and lifecycle metadata.
- Storage writes and ledger writes have compensating cleanup on failure.
- Feature attachment failures cannot leave silent, untracked media.
- Existing media is reconciled before any cleanup; unmatched objects are quarantined/reviewed rather than blindly deleted.
- Both `feature/ngo-hardening` and `master` end with the same media implementation.

## Implementation Log

### 2026-10-06
- Audit baseline recorded.
- Current public bucket: `finding-astro-media`.
- Existing `public.media_uploads` has zero rows despite live storage objects.
- Core media implementation is materially the same on both branches.
- Known defects include client-trusted size, fail-open scanning, profile EXIF bypass, public mixed-sensitivity storage, unauthenticated proxy, and missing media ledger lifecycle.

## Completion Gate

This tracker is complete only when the media subsystem is implemented as one coherent path, all known consumers use the canonical contract, both branches are aligned, existing objects are reconciled, and deployed smoke/regression checks pass.


### Implementation details
- New uploads validate `file.size` and file signatures independently of client-reported values.
- Uploads are ledger-first with compensating cleanup on storage/finalization failure.
- Canonical response now includes `mediaId`, while legacy URL fields remain compatible.
- Private-purpose uploads use `finding-astro-private` and authenticated delivery.
- Existing public media was reconciled into the ledger where a live DB reference established ownership/context.
- 13 existing public-bucket objects remain intentionally untouched because they are not currently referenced by live URL fields; they are legacy/unmatched objects, not silently deleted.
- Antivirus failures are represented as `error`; strict rejection can be enabled with `MEDIA_SCAN_REQUIRED=true`. Environments without a configured scanner remain explicitly `unverified` rather than being represented as clean.


### Final hardening additions
- Sensitive purposes now use the private bucket for new uploads: evidence, bills, prescriptions, medical records, NGO documents, generic documents, and welfare proofs.
- Private delivery authorization now recognizes case reporter, assigned responder, active case responder, animal caretaker, and animal creator in addition to the uploader and privileged roles.
- Media ledger now carries generic `entity_type`/`entity_id`, `attached_at`, and reconciliation timestamp fields for lifecycle tracking.
- Antivirus integration now fails closed at the scanner boundary; absent/unavailable scanners produce explicit `unverified`/error state rather than a false clean result.
- JPEG APP1/ICC/IPTC/APP14, PNG text/EXIF/time chunks, and WebP EXIF/XMP metadata are stripped server-side. HEIC/HEIF is rejected because this runtime cannot safely rewrite its metadata.
