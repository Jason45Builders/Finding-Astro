# Finding Astro Library — Feature Blueprint

- **Status:** Approved for implementation
- **Repository:** Jason45Builders/Finding-Astro
- **Implementation branch:** feature/finding-astro-library
- **Base branch:** Working
- **Last updated:** 2026-10-12
- **Companion tracker:** docs/finding-astro-library-tracker.md

## 1. Vision

Build a first-class, mobile-first digital library inside Finding Astro. The team can publish animal-welfare books, guides, illustrated publications, and stories. Administrators may publish a complete book as a file or manage a publication chapter by chapter. Readers discover content, read it within the application where the format permits, navigate chapters, and resume reading.

This is an in-app publishing and reading capability, not merely a folder of downloadable files. The initial release is free to readers and supports Finding Astro's welfare-education mission.

## 2. Outcomes and acceptance goals

1. Authorised administrators can create, edit, preview, publish, unpublish, and archive publications.
2. A publication can use a complete-file format or a chapter-based format within one coherent product model.
3. Draft and unpublished content is inaccessible to ordinary readers.
4. Readers can browse published books, inspect details, and read on mobile and desktop.
5. Chapter-based publications have stable ordering, a table of contents, and previous/next navigation.
6. Reading progress is saved per authenticated user and publication, then restored safely.
7. Upload, validation, permission, missing-file, and network errors are understandable and recoverable.
8. Existing Finding Astro workflows, authentication, navigation, and deployment remain intact.

### Out of scope for the first release

Payments, subscriptions, comments, ratings, social feeds, public user-submitted books, audiobooks, DRM, advanced analytics, and automatic OCR/conversion pipelines.

## 3. Product principles

- **Mission first:** optimise for accessible welfare education, not monetisation.
- **Mobile first:** accommodate small screens, slower networks, and older devices.
- **Safe by default:** drafts are private and publication requires an explicit action.
- **Accessible:** semantic headings, keyboard access, text resizing, readable contrast, meaningful image alternatives, and visible focus.
- **Reuse existing infrastructure:** follow the actual framework, design system, routing, auth, admin patterns, and Supabase conventions after auditing the branch.
- **Avoid duplication:** inspect migrations, roles, storage buckets, upload helpers, and shared components before implementing equivalents.
- **Recoverable operations:** prevent silent failure and orphaned records/files.
- **Copyright aware:** require the publisher to confirm ownership, permission, or an applicable licence. Charitable intent alone does not grant rights to third-party material.

## 4. Roles and access

### Administrator
- Create and edit metadata.
- Upload/replace covers and book or chapter assets.
- Add, reorder, edit, and remove chapters.
- Preview content before publication.
- Publish/unpublish a book and manage chapter visibility.
- See useful upload errors and retry safely.
- Confirm rights/permission before publishing.

Use the application's existing verified admin authorization mechanism. Do not introduce a parallel role system or trust client-side route guards as the security boundary.

### Reader
- Browse only published publications and chapters.
- Search/filter the catalogue where practical.
- Read content through the supported viewer.
- Navigate the table of contents and chapters.
- Resume saved progress.
- Adjust text size for reflowable content.

### Guest access
The product intent is broad access to published welfare materials. Decide guest versus sign-in reading after inspecting current auth patterns. If guest reading is supported, only published content may be public; personal progress remains authenticated and private. Do not force sign-in without a product or technical reason.

## 5. Formats and publication model

### Initial format strategy
- **PDF:** preserves print layout and illustrations. Provide an in-app viewer if the current stack supports it reliably; otherwise provide a clear, safe open/download fallback.
- **Structured chapter content:** sanitised HTML or the application's existing editor format. Preferred for responsive reading, semantic structure, and text resizing.
- **EPUB:** desirable if a compatible reader fits the framework, bundle, and performance constraints. Treat as planned until real rendering/navigation is tested; uploading an EPUB does not equal supporting it.

Do not accept arbitrary files. Use an explicit allowlist and validate file type, size, and content as practical.

### Publication types
1. Complete file: one primary PDF, plus EPUB only if supported.
2. Chapter-based: ordered chapters using supported file or structured content.
3. Hybrid: optional later, only if one book can clearly expose both chapter navigation and a complete edition.

### Metadata
Required by publish time: title, stable slug/route identifier, description, credited author/team, publication type, category, language, status, cover or accessible fallback, and rights confirmation.

Optional: subtitle, contributors, tags, audience/age guidance, estimated reading time where derived reliably, edition/version, publication date, accessibility notes, ISBN/external reference, and admin-controlled featured flag.

Inspect existing taxonomy conventions before creating categories. Candidate topics include Animal Care, Adoption and Fostering, Community Animals, Wildlife, Children's Stories, and Finding Astro Publications.

## 6. Reader experience

### Catalogue
- Responsive cover grid/list; title, author, description, category, and language.
- Search by title/author and filters where practical.
- Loading, empty, error, and no-results states.
- Pagination/incremental loading if catalogue size requires it.
- Never expose drafts, private storage paths, unpublished chapters, or admin controls.

### Publication detail
- Cover, title, author, summary, language, category, and edition/version when available.
- Read or Continue Reading action.
- Ordered table of contents for chapter-based books.
- Only published chapters shown.
- Graceful handling when a book is unpublished or its asset is missing.

### Reading view
- Read inside the app where format permits.
- PDF: retain page layout and provide tested navigation/zoom, or a reliable fallback.
- Structured chapters: sanitised semantic content, readable line length, adjustable text size.
- Clear book context, table of contents, previous/next controls.
- Save progress at meaningful intervals and navigation events, not every scroll tick.
- Validate saved positions before restoring them.
- A failed progress write must not interrupt reading.
- Do not promise DRM or absolute prevention of copying; access policies cannot stop all copying of visible content.

### Accessibility and performance
- Keyboard-accessible controls, visible focus, semantic landmarks/headings and labels.
- Readable contrast, zoom, and text resizing on mobile.
- Lazy-load covers and load book payload only after opening.
- Clear upload/read states and prevention of duplicate submissions.
- Test slow network, expired sessions, and narrow screens.

## 7. Admin publishing workflow

1. Open Library from the existing admin sidebar.
2. View publications with title, format, status, updated time, and actions.
3. Create a publication and enter metadata.
4. Select complete-file or chapter-based type.
5. Upload cover/content or add chapters.
6. Display progress, validation, retry, and actionable errors. Parse error responses defensively; non-JSON responses must not crash the UI.
7. Save drafts at any time.
8. Preview as a reader without publishing.
9. Validate required metadata, readable content, asset references, chapter ordering, and rights confirmation.
10. Explicitly publish. Never expose incomplete chapters by changing a parent status accidentally.
11. Edit/replace content safely. Preserve progress when stable identity remains valid; reconcile it if chapter structure changes.
12. Unpublish so the catalogue and content access stop exposing it.

Prefer archive/unpublish for ordinary lifecycle management. Hard deletion must account for chapters, progress, storage objects, and orphan cleanup. Decide exact deletion behaviour during implementation.

## 8. Proposed data model — validate before migration

These are conceptual names only. Align final schema, ID types, user references, timestamps, and naming with the existing project.

### Books / library_books
- id, title, slug, description, credited author/team
- publication_type: complete_file, chapter_based, optional hybrid
- category, language, cover_storage_path
- status: draft, published, archived
- rights_confirmed_at, rights_confirmed_by or equivalent audit fields
- created_by, updated_by, published_at, created_at, updated_at
- optional edition, version, tags, featured, metadata

### Chapters / library_chapters
- id, book_id with deliberate foreign-key deletion behaviour
- title, optional summary, sort_order
- content_type/format and either validated structured content or storage_path
- status: draft or published
- created_by, updated_by, timestamps

Do not store large binary files in ordinary database rows. Store files in Supabase Storage and keep validated object paths and metadata in the database.

### Reading progress / library_reading_progress
- id or composite key
- user_id tied to the real authenticated identity
- book_id, optional chapter_id
- position representation suitable for the format (PDF page, or structured-text section/offset)
- updated_at
- uniqueness per user/book for deterministic upserts
- foreign keys and deletion behaviour that prevent stale references

Progress is private to its owner and enforced with RLS. Add bookmarks only if core progress is stable and scope permits.

### Migration rules
- Inspect existing migrations and conventions first.
- Prefer additive, reversible migrations.
- Never rewrite historical migrations already applied to shared environments.
- Never modify production manually as a substitute for a committed migration.
- Add useful status/order/user indexes, constraints, foreign keys, and timestamp behaviour.
- Test against a clean/test database or preview environment where available.
- Document migration and storage policy setup.
- Avoid destructive changes to unrelated features.

## 9. Storage and security

Choose public/private access per asset type after auditing the project and confirming guest-reading policy.

- Covers may be public if safe.
- Published content may be public only if policy explicitly allows direct public access; otherwise use private storage and authenticated access.
- Draft files remain private.
- Admin preview requires admin authorization.
- Reading progress uses user-scoped RLS.

Required safeguards:
- Verify the actual admin role/claim source.
- Enforce writes in database policies and/or trusted server-side code.
- Enforce publication-state access; hiding UI buttons is insufficient.
- Validate extensions, MIME types, and sizes; do not trust browser MIME alone.
- Use an allowlist and non-guessable storage paths.
- Avoid unsafe filename/path construction and path traversal.
- Sanitise rich text to prevent script injection and unsafe embedded resources.
- Never expose service-role keys or privileged credentials to browser code.
- Do not log signed URLs or sensitive tokens.
- Handle database/storage partial failures and clean up orphaned uploads safely.
- Set size limits after checking hosting and expected publication sizes.
- Verify direct URLs cannot expose drafts.

## 10. Application integration audit

Before coding, inspect:
- framework, package manager, routing, server/client boundaries
- auth/session flow and admin role checks
- admin sidebar registration and responsive layout
- shared components, validation, notifications, and error handling
- Supabase client helpers and migration structure
- storage buckets, policies, upload helpers, and existing media fixes
- test/lint/typecheck/build scripts
- Vercel config and environment variable names (never print secrets)

Add Library navigation using the established pattern and create reader routes that do not conflict with existing routes. Avoid duplicate Supabase clients, one-off styling systems, parallel role checks, and hard-coded assumptions.

## 11. Failure handling and observability

Every asynchronous action needs explicit idle, validating, uploading/saving, success, recoverable-failure, and permission-failure states.

- Prevent double submission and duplicate chapter creation.
- Safely handle HTML/text responses where JSON was expected.
- Distinguish auth failure, permission denial, invalid input, file-too-large, unsupported format, network failure, missing asset, and unexpected server errors.
- Preserve form input after failed saves/uploads.
- Ensure retry does not duplicate records or orphan files.
- Do not show success until the server confirms success.

## 12. Test and acceptance plan

### Admin/security
- Unauthenticated users cannot mutate publication data.
- Authenticated non-admin users cannot create, upload, edit, or publish.
- Admin can create/save a draft and upload supported assets.
- Unsupported/oversize assets are rejected with useful feedback.
- Admin can add/reorder/edit/remove chapters.
- Draft preview works without public exposure.
- Publish validation blocks incomplete books.
- Publish/unpublish changes public visibility and access.
- Failed uploads/saves preserve data and allow safe retry.

### Reader
- Catalogue shows published books only.
- Search/filter/loading/empty/error states work.
- Complete PDF reading path works as claimed.
- Chapter order and previous/next navigation are correct.
- Draft chapters cannot be accessed by changing URLs/API requests.
- Progress saves/resumes for the same user.
- A user cannot read/overwrite another user's progress.
- Missing/unpublished content fails gracefully.
- Mobile and keyboard reading controls work.

### Regression/release
- Auth, admin navigation, adoption/rehome, existing media uploads, and other core flows remain unaffected.
- Run available lint, typecheck, tests, and production build.
- Inspect migration and RLS/storage policy diffs.
- No secrets or private book assets committed.
- Validate preview deployment before production rollout.
- Record every check that could not be run; never claim unexecuted checks passed.

## 13. Substantial implementation passes

Each pass must deliver a coherent, meaningful body of work. Do not split into tiny cosmetic commits. Update the tracker during every pass with files changed, behaviour delivered, checks and results, known gaps, and the next pass.

### Pass 1 — Audit and technical foundation
Audit the branch and stack; map auth/admin/storage/migrations; document confirmed conventions; implement the additive schema and policies required for the library; establish storage strategy; update decisions and tracker. Do not make speculative edits before the audit.

### Pass 2 — Complete admin publishing studio
Build admin catalogue, create/edit forms, complete-file and cover uploads, chapter creation/reordering/editing, draft persistence, preview, publish/unpublish lifecycle, validation, robust errors/retries, sidebar integration, and enforced authorization.

### Pass 3 — Reader catalogue and content viewing
Build catalogue and detail pages, responsive discovery/search/filter, complete PDF reading path, structured chapter renderer, table of contents, previous/next navigation, and loading/empty/error states. Expose published content only.

### Pass 4 — Progress, accessibility, hardening
Implement per-user progress and resume; text controls for structured content; accessibility/mobile refinement; storage/RLS review; upload edge cases; and regression tests.

### Pass 5 — End-to-end validation and release readiness
Run available checks, fix failures, inspect migrations/policies, test realistic book flows, validate preview deployment if connected, document setup/operations, and prepare a handoff. Do not merge or deploy production without explicit approval.

Adjust boundaries only when repository findings justify it. Each pass must remain substantial and leave a coherent checkpoint.

## 14. Decision log

| Topic | Initial direction | Validate |
|---|---|---|
| Name | Finding Astro Library | Fit with existing brand |
| Reader access | Free, broad access to published welfare content | Guest vs sign-in and auth conventions |
| Complete format | PDF first; EPUB only if genuinely supported | Framework and reader options |
| Chapter format | Structured content and/or supported chapter files | Existing editor/dependencies |
| Storage | Supabase Storage | Buckets, policies, upload helpers |
| Admin access | Reuse existing authorization | Server/database enforcement |
| Progress | Per authenticated user and book | Auth identity and RLS |
| Deletion | Prefer unpublish/archive | Cleanup and retention policy |
| Rollout | Feature branch, then preview | No production merge/deploy without approval |

## 17. Confirmed repository audit findings (2026-10-12)

These findings are based on inspecting the Working branch; revisit them if the branch changes.

- The repository is a monorepo. The web app is Next.js 15 with the App Router under apps/web and API handlers under apps/web/app/api/v1. Root npm scripts delegate build, lint, typecheck, and tests to apps/web.
- The project uses Supabase and a custom bearer-JWT application auth flow. API handlers import authMiddleware and supabaseAdmin through the apps/web/src/lib alias.
- authMiddleware verifies the bearer token and re-reads the user's current role and ban status from public.users. The users table uses UUID IDs and its role enum includes admin.
- supabaseAdmin uses the service-role key and bypasses RLS. Every Library API route must explicitly enforce authorization and ownership. Never expose this client to browser code.
- The existing media upload handler is apps/web/app/api/v1/media/upload/route.ts. It validates file signatures for an allowlist of images and PDF, enforces 10 MiB, scans uploads, writes media_uploads records, uploads to Storage, then finalises the record. EPUB is not in the current allowlist. Private assets use an authenticated proxy.
- The root README documents finding-astro-media (public) and finding-astro-private (private) buckets. Actual deployed bucket settings remain unverified.
- The root README mentions apps/admin-dashboard as a separate deployment, but expected files there were not found on Working. The actual staff sidebar is apps/web/app/(app)/layout.tsx. The Library admin screen is at apps/web/app/admin/library/page.tsx and is linked from that sidebar.
- The initial schema enables uuid-ossp and defines public.users. The Library uses additive migrations and does not edit the historical initial schema.
- The package manifest contains Zod, Supabase JS, React 19, and Next.js 15. No EPUB/PDF reader dependency was confirmed in the inspected package manifest.

### Decisions after audit

1. Use Next.js App Router route handlers and the existing auth/response helpers.
2. Re-check current database role for every admin operation; do not rely on the role claim in the JWT alone.
3. Keep binaries in Supabase Storage and metadata/paths in the database.
4. Support PDF and structured-text chapters in the first release; do not advertise EPUB until a real reader and upload path are tested.
5. Enable RLS on Library tables. Because current server-side service-role access bypasses RLS, API checks are mandatory.
6. Do not add Library content to the generic media endpoint as an unrestricted purpose. The admin UI currently reuses existing authenticated media purposes, and only admin APIs may attach a resulting storage path to a publication.

## 18. Implementation snapshot (2026-10-12)

Committed on feature/finding-astro-library:
- supabase/migrations/20261012170000_finding_astro_library.sql — books, chapters, reading progress, constraints/indexes, and RLS enabled.
- supabase/migrations/20261012183000_library_chapter_reorder.sql — atomic chapter reorder function restricted to service_role.
- Admin APIs for book metadata/lifecycle, chapter CRUD/hide/reorder, and publication rights/content validation.
- Published-only reader APIs for catalogue, details, structured chapter content, and PDF delivery.
- Admin publishing studio at apps/web/app/admin/library/page.tsx, linked from the actual staff sidebar.
- Reader catalogue and chapter/PDF reading pages at apps/web/app/library/page.tsx and apps/web/app/library/[slug]/page.tsx.
- Authenticated per-user progress API and chapter-level save/resume integration.
- Public topic/language facets endpoint and paginated catalogue discovery.
- Accessibility refinements: skip navigation, named landmarks, responsive cover artwork, proportional heading scaling, and graceful malformed-response messages.
- Publication validation enforces a supported PDF for complete-file/hybrid types and at least one readable published rich-text chapter for chapter-based/hybrid types.
- PDF content responses are marked private/no-store; storage key validation rejects traversal/backslash/control characters.
- Chapter APIs are restricted to bounded structured-text blocks until chapter-file viewing is implemented.
- The migration uses schema-qualified `extensions.uuid_generate_v4()` to match the connected Supabase project.

Release blockers and remaining scope:
- No local lint, typecheck, tests, SQL execution, build, or browser validation has run.
- GitHub's Vercel status for a feature-branch code commit reported a build-rate-limit/upgrade page; no successful preview deployment was confirmed.
- Read-only inspection confirmed the live Supabase project does not yet have the Library tables and the migrations are unapplied. No production schema change was made.
- Draft preview, chapter-file upload/delivery, PDF page position, upload progress and orphan reconciliation remain. A complete-file PDF viewer and chapter-based reader are implemented, but need browser validation.
- Read-only inspection confirmed the public `finding-astro-media` bucket and private `finding-astro-private` bucket exist with the expected visibility; still validate upload and retrieval end to end.
- The current complete-book upload UI supports PDF and uses the existing 10 MiB media-upload limit. EPUB is not supported end to end.

## 15. Working rules

1. Work only on feature/finding-astro-library; do not commit feature changes to Working or master.
2. Read relevant existing files before changing them.
3. Prefer large, cohesive implementation passes.
4. Update docs/finding-astro-library-tracker.md in every pass.
5. Never claim a test, command, migration, or deployment succeeded unless its result was observed.
6. Never expose secrets in logs, documentation, or commits.
7. If repository findings differ from assumptions, update this blueprint and explain the decision in the tracker.
8. Keep changes scoped to the Library and necessary shared integration points.

## 16. Definition of done

The feature is complete only when admin publishing works end to end; complete-file and chapter-based formats work as explicitly claimed; published content is readable on mobile and desktop; drafts are protected by enforced authorization; progress is private and resumable; failures are understandable/recoverable; migrations and storage/RLS policies are committed/documented; existing workflows pass regression checks; build/lint/typecheck/tests are run and results recorded; the tracker is current; and all work remains on the feature branch until the user approves integration.


## 19. Production-readiness hardening checkpoint (2026-10-12)

The current reader uses the existing application theme tokens (background/surface, primary/secondary containers, outline, on-surface and error roles) rather than introducing a parallel visual system. The catalogue is designed around editorial covers, strong hierarchy, accessible search/filter controls, responsive cards, and clear loading/empty/error states. The detail page retains responsive artwork and a dedicated reading surface.

Additional implementation details:
- Public catalogue is paginated in batches of 24 and exposes the total count; topic/language options are loaded separately from published-only metadata.
- Public filters are cached for five minutes and include stale-while-revalidate.
- Complete-file pages use the full reading width without an empty chapter sidebar; hybrid pages provide both chapters and the PDF edition.
- Skip links and named landmarks support keyboard/screen-reader navigation. Structured-text headings scale proportionally with text-size controls.
- Malformed JSON/HTML infrastructure responses are converted to a clear retry message on reader pages.
- Book publishing validates the effective resulting status, rights confirmation, PDF format, storage path shape, and readable chapter availability.
- Published PDF delivery is not shared-cacheable, preventing stale CDN copies from surviving an unpublish operation.
- The chapter editor API rejects PDF/EPUB chapter formats until a real chapter-file viewer exists; unsupported formats should not be presented as working features.

Live environment audit:
- Supabase project is active; library tables are absent, and both Library migrations remain unapplied.
- `finding-astro-media` is public and `finding-astro-private` is private.
- The current Supabase security advisor reports an existing critical issue on `public.spatial_ref_sys`: RLS is disabled. This is outside the Library scope and was not changed. It requires separate review before broader production hardening.

Release gate:
- The current feature-head GitHub Actions `typecheck-and-build` check was queued at the last observation; wait for and inspect its result before claiming code validation.
- Vercel's status remains a build-rate-limit failure. No current feature-head preview has been confirmed.
- Do not apply migrations to production until the build passes, migration SQL has been validated against a non-production database, and the end-to-end workflow has been browser-tested.


## 20. Validation checkpoint (2026-10-12)

A GitHub Actions run completed the production build successfully for the Library feature source:
- Focused Library lint: PASS.
- TypeScript typecheck: PASS.
- Production build: PASS, using a CI-only placeholder JWT secret to satisfy import-time environment validation. This is a compile/build result, not a runtime environment validation.
- New Library validation unit tests: 6/6 PASS.
- Full repository test suite: 34/35 PASS. The remaining failure is the existing `tests/org-permissions.test.ts:22` role-capability expectation; the Library changes do not alter that permission matrix.
- The full release check is therefore not green yet.

Production rollout remains blocked on:
- Triaging the npm audit report (19 findings: 13 high, 1 critical, 5 moderate).
- Resolving the existing role-permissions test with the policy owner.
- A current Vercel preview build and browser/mobile workflow validation; current Vercel team scope returns 403 for deployment logs/creation.
- Applying the Library migrations only after validation in a non-production database.
- Separate owner review of the pre-existing critical Supabase advisor finding for `public.spatial_ref_sys` RLS disabled.
