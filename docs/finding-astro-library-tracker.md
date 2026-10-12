# Finding Astro Library — Implementation Tracker

- **Feature branch:** feature/finding-astro-library
- **Base branch:** Working
- **Blueprint:** docs/finding-astro-library-blueprint.md
- **Status:** In progress — repository audit underway; schema migration added
- **Last updated:** 2026-10-12
- **Rule:** Update this tracker during every substantial implementation pass. Do not mark work complete without observed evidence.

## Current status at a glance

| Workstream | Status | Notes |
|---|---|---|
| Create isolated feature branch from Working | DONE | Branch created in GitHub |
| Detailed blueprint | DONE | Product, data model, security, UX, testing, and pass plan documented |
| Persistent tracker | DONE | This file |
| Repository/framework audit | PARTIAL | Next.js 15 monorepo, custom JWT auth, media upload flow, package scripts and actual app sidebar identified; deployed Storage config still to confirm |
| Supabase schema and policies | PARTIAL | Additive Library migration committed; RLS enabled fail-closed; API-level auth still required due service-role bypass |
| Storage strategy and upload workflow | PARTIAL | Existing media endpoint inspected; 10 MiB allowlist supports images/PDF only; Library-specific secure upload flow remains to build |
| Admin publishing studio | PARTIAL | Admin UI and book/chapter APIs exist; end-to-end upload, preview, reorder, and tests remain |
| Reader catalogue and reader | PARTIAL | Catalogue, chapter reader, and PDF viewing route added; full runtime validation and progress remain |
| Reading progress/accessibility | PARTIAL | Owner-scoped progress API and chapter resume/save integrated; accessibility and cross-format position remain |
| Regression/release validation | TODO | Pass 5 |
| Preview deployment | TODO | Only if connector/config permits; never assume |
| Merge/deploy to production | BLOCKED | Requires user approval |

## Branch and repository safeguards

- Repository: Jason45Builders/Finding-Astro
- Feature branch: feature/finding-astro-library
- Base branch: Working
- Do not commit feature changes to Working or master.
- Do not merge or deploy to production without explicit approval.
- Keep secrets, credentials, real user data, and private publication assets out of commits.
- Inspect current branch state before each pass and verify the target branch on every write.
- If the branch was created but local development access is unavailable, state that constraint accurately and use the connected GitHub capability only for operations it supports.

## Pass log

### Pass 0 — Branch and plan
**Status: DONE**

Delivered:
- Created feature branch feature/finding-astro-library from Working.
- Added docs/finding-astro-library-blueprint.md with the product vision, scope, roles, formats, reader/admin workflows, proposed schema, security model, accessibility, testing, implementation passes, and definition of done.
- Added this persistent tracker.

Validation:
- GitHub confirmed branch creation.
- GitHub confirmed blueprint file commit.
- Tracker commit is being recorded as part of this pass.

Not yet done:
- No application code changed.
- No migrations or Storage policies added.
- No tests/build/deployment run.
- No claim is made that the feature is implemented.

### Pass 1 — Repository audit and technical foundation
**Status: TODO — next pass**

Required work:
- Inspect project root, package scripts, framework/routing, app structure, current admin sidebar, authentication/session logic, admin authorization, Supabase client helpers, existing migrations, Storage buckets/policies, upload components/utilities, UI conventions, and existing tests.
- Identify existing media-upload patterns and known failure-handling constraints to avoid repeating past bugs.
- Confirm whether the current admin role is enforced server-side/database-side and identify the trusted source of that role.
- Record the actual route and component locations and any existing relevant schema.
- Decide guest-reading behaviour and file access model based on real code and the product's broad-access goal.
- Design additive schema and RLS/Storage policies aligned to actual naming and auth conventions.
- Implement the schema/security foundation only after the audit confirms the design.
- Update the blueprint decision log and this tracker with concrete repository findings, exact changed files, migration/policy behaviour, test results, and unresolved risks.

Exit criteria:
- Repository architecture documented in this tracker.
- Schema and access model are based on observed code, not assumptions.
- Migration/policy changes are committed to the feature branch if safe and supported.
- Available targeted checks are run and results recorded.
- No unrelated workflows are changed.

### Pass 2 — Admin publishing studio
**Status: TODO**

Required substantial deliverables:
- Admin Library listing and status/actions.
- Create/edit publication metadata and rights confirmation.
- Complete-book and cover uploads with progress, validation, defensive error parsing, retry, and duplicate-submit protection.
- Chapter creation, edit, reorder, and removal for chapter-based books.
- Draft save and private admin preview.
- Publish/unpublish validation and lifecycle.
- Integration into the existing admin sidebar and established UI patterns.
- Database/storage authorization enforced beyond the UI.
- Tests for role access, validation, upload errors, and publish lifecycle.

Exit criteria:
- Administrator can complete a realistic draft-to-published workflow.
- Ordinary users cannot mutate content or access drafts.
- Errors preserve input and permit safe retry.
- All available targeted checks and results recorded.

### Pass 3 — Reader catalogue and content viewing
**Status: TODO**

Required substantial deliverables:
- Reader-facing catalogue with responsive layout, metadata, loading/empty/error/no-results states.
- Search/filter where supported by the chosen schema.
- Publication detail page and table of contents.
- Complete PDF viewing path, plus structured chapter rendering and navigation.
- Published-only queries and content access.
- Mobile, keyboard, and missing-asset handling.

Exit criteria:
- A published complete-file book and a chapter-based book can each be discovered and read.
- Draft/unpublished content remains inaccessible through UI, direct route, and underlying access policy.
- Reader flows and checks are recorded.

### Pass 4 — Progress, accessibility, and hardening
**Status: TODO**

Required substantial deliverables:
- Per-user reading progress with deterministic upsert and resume.
- Progress validation after chapter/file changes.
- Text-size controls for structured content.
- Keyboard/accessibility review and responsive refinements.
- Storage/RLS review and upload failure/partial-failure cleanup.
- Regression coverage for authentication, admin navigation, adoption/rehome, and existing media uploads.

Exit criteria:
- Progress cannot cross user boundaries.
- Core reading and upload paths remain usable during recoverable failures.
- Accessibility and regression checks are documented with actual results.

### Pass 5 — End-to-end validation and release readiness
**Status: TODO**

Required substantial deliverables:
- Run available lint, typecheck, tests, and production build.
- Fix all actionable failures caused by the feature.
- Review final migration, RLS, Storage policy, and file-access behaviour.
- Test a realistic admin upload/publish/unpublish and reader/resume workflow.
- Validate preview deployment if the connected environment permits.
- Document required migration/application steps and known limitations.
- Produce a release handoff and leave branch unmerged until user approval.

Exit criteria:
- Test results are factual and complete.
- Known gaps are explicit; no unrun check is reported as passing.
- No production merge/deployment occurs without explicit user approval.

## Per-pass reporting template

Copy and complete this section at the end of each substantial pass:

### Pass [number] — [name]
- **Status:** DONE / PARTIAL / BLOCKED
- **Summary:** What meaningful end-to-end capability was delivered?
- **Files changed:** List exact paths and purpose.
- **Database/storage changes:** List migration, tables, indexes, policies, bucket changes, or state none.
- **Security:** State which authorization paths were checked and how.
- **Validation run:** Exact commands/checks and observed result; include failures.
- **Manual scenarios:** Scenarios exercised and outcomes.
- **Known gaps/risks:** Explicit list.
- **Decisions added to blueprint:** What changed and why.
- **Next pass:** Substantial deliverables and exit criteria.

## Defect and decision log

| ID | Item | Severity | Status | Evidence / next action |
|---|---|---|---|---|
| LIB-001 | Confirm current app routes, framework, and package scripts | High | Done | Next.js 15 App Router, package scripts, and actual sidebar identified; see blueprint audit findings |
| LIB-002 | Confirm trusted admin-role enforcement | Critical | Open | Audit server handlers and database RLS/policies |
| LIB-003 | Confirm Storage bucket and upload conventions | High | Open | Inspect current Supabase configuration and media helpers |
| LIB-004 | Decide guest reading versus sign-in requirement | Medium | Open | Match existing auth behaviour and mission intent |
| LIB-005 | Confirm supported PDF/EPUB viewer options | Medium | Open | Inspect dependencies and test real mobile rendering |
| LIB-006 | Define safe file size/type allowlist | High | Partial | Generic media upload currently allows PDF/images up to 10 MiB; EPUB remains unsupported in the upload flow |\n| LIB-007 | Clean up media objects when multi-asset upload partially fails | Medium | Open | Track media IDs and reconcile unlinked uploads on retry/failure |\n| LIB-008 | Add reading progress and resume | Medium | Partial | Chapter-level API and reader integration committed; PDF page/scroll positions remain |

## Completion accounting

Do not report a percentage based on file count or number of commits. Report by completed acceptance criteria and working end-to-end paths. Planning, schema foundation, API routes, initial admin publishing UI, and reader pages are committed. The feature remains partial: no runtime checks have been executed, the migration is unapplied, and progress/resume plus several publishing workflows remain.


### Pass 2/3 progress checkpoint — API foundation (2026-10-12)
**Status: PARTIAL**

Files changed:
- supabase/migrations/20261012170000_finding_astro_library.sql — books, chapters, progress tables; constraints/indexes; RLS enabled.
- supabase/migrations/20261012183000_library_chapter_reorder.sql — atomic chapter reordering function restricted to service_role.
- apps/web/app/api/v1/library/books/route.ts — published catalogue API.
- apps/web/app/api/v1/library/books/[slug]/route.ts — published book detail and chapter metadata.
- apps/web/app/api/v1/library/books/[slug]/chapters/[chapterId]/route.ts — published chapter content endpoint.
- apps/web/app/api/v1/admin/library/books/route.ts — admin list and draft creation.
- apps/web/app/api/v1/admin/library/books/[bookId]/route.ts — admin edit, publish/unpublish, archive.
- apps/web/app/api/v1/admin/library/books/[bookId]/chapters/route.ts — admin chapter list/create.
- apps/web/app/api/v1/admin/library/books/[bookId]/chapters/[chapterId]/route.ts — admin chapter edit/hide.
- docs/finding-astro-library-blueprint.md — confirmed repository findings and decisions.
- docs/finding-astro-library-tracker.md — progress and risks.

Security:
- Every admin route uses authMiddleware, which verifies the bearer JWT and reads the current role from public.users, then requires role admin.
- Mutations use the existing CSRF helper.
- Public routes constrain both book and chapter status to published.
- Tables have RLS enabled. The service-role client bypasses RLS, so endpoint checks remain mandatory.
- File uploads are not wired yet. Do not publish file-backed books until the upload/storage ownership path is implemented and tested.

Validation:
- GitHub confirmed commits for the migration and API source files.
- Source was reviewed through the GitHub connector. No local test runner, TypeScript compiler, SQL execution, build, or deployment was run.
- The migration has not been applied to Supabase.
- The API handlers are not yet end-to-end validated. Treat the current APIs as implementation in progress, not release-ready.

Next substantial work:
- Complete repository/admin UI discovery and migration compatibility review.
- Implement secure Library file upload/delivery, then build the admin publishing UI and reader pages as cohesive batches.


### Pass 2/3 progress checkpoint — publishing and reader UI (2026-10-12)
**Status: PARTIAL**

Additional files changed:
- apps/web/app/admin/library/page.tsx — admin publishing studio with metadata, PDF and cover upload, structured chapter create/edit/reorder, rights confirmation, publish/unpublish/archive controls.
- apps/web/app/(app)/layout.tsx — admin sidebar link, visible only for role admin.
- apps/web/app/library/page.tsx — public catalogue with search, category/language filters, responsive cards and retry/empty/loading/error states.
- apps/web/app/library/[slug]/page.tsx — publication detail, chapter navigation, structured text renderer, text-size controls, PDF iframe and open-in-new-tab action.
- apps/web/app/api/v1/library/books/[slug]/content/route.ts — published-only PDF streaming from private Storage with path and PDF-signature validation.
- Updated catalogue/detail APIs to resolve public cover URLs and expose only a boolean for complete-file availability, not the private storage path.

Important limitations:
- Admin upload reuses the existing authenticated media upload endpoint: complete PDFs are uploaded as private purpose=document assets; covers use the existing public animal_photo purpose. Only admin-authorized Library APIs can attach paths to publications.
- The upload interface does not yet show byte-level progress. If one of multiple selected uploads succeeds and a later upload or database patch fails, a tracked media object may remain unlinked; cleanup/reconciliation is still needed.
- The admin interface now supports structured-text chapter editing and up/down reordering through an atomic database function; chapter-file uploads are still not in the UI.
- Draft preview is not implemented; draft content remains excluded from public APIs.
- The PDF reader streams the full file and does not implement HTTP byte-range requests. It is intended for the existing 10 MiB upload limit and requires browser validation.

Validation:
- GitHub confirmed commits for the UI, route handlers, sidebar integration, and follow-up fixes.
- No local dependency install, lint, typecheck, unit test, SQL execution, build, browser run, or deployment was executed in this connector session.
- Migration remains unapplied; APIs/UI are not yet release-ready.

Next substantial work:
- Audit/validate the schema and migration against the target Supabase project without applying unreviewed production changes.
- Add reading progress/resume and chapter-file delivery/edit/reorder support.
- Add automated tests and run actual build/typecheck/test commands through an available development environment.


### Pass 4 progress checkpoint — chapter-level reading progress (2026-10-12)
**Status: PARTIAL**

Delivered:
- apps/web/app/api/v1/library/progress/route.ts provides authenticated GET and PUT endpoints.
- Progress is always filtered/written using the authenticated user ID; clients cannot submit another user's ID.
- Save validation requires a published book and, when supplied, a published chapter belonging to that book.
- Position JSON is constrained to a small typed object rather than arbitrary JSON.
- Reader page loads saved chapter progress for signed-in users and falls back to the first chapter if progress is unavailable.
- Opening a chapter asynchronously saves the user's current chapter position; progress failures do not block reading.

Remaining:
- Restore PDF page position and richer text anchors.
- Add tests for cross-user access and invalid/unpublished chapter IDs.
- Validate browser behaviour and prevent overlapping progress writes if rapid navigation occurs.

Validation:
- Source files and GitHub commits confirmed. No automated test or build was run.


### Pass 2 follow-up — chapter maintenance (2026-10-12)
**Status: PARTIAL**

Delivered:
- Added supabase/migrations/20261012183000_library_chapter_reorder.sql with a transaction-safe reorder function that temporarily moves all chapters into a non-conflicting order range, then assigns contiguous order values. Function execution is restricted to service_role.
- Added POST /api/v1/admin/library/books/[bookId]/chapters/reorder with admin authorization, CSRF protection, UUID validation, and server-side RPC call.
- Admin chapter editor now supports editing structured text and moving chapters up/down; ordering uses the atomic RPC rather than conflicting single-row updates.

Validation:
- GitHub confirmed migration, endpoint, and admin UI commits.
- SQL has not been executed; function permissions and ordering behaviour need database validation.
- No automated tests or build were run.
