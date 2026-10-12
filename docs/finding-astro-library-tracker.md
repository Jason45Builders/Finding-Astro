# Finding Astro Library — Implementation Tracker

- **Feature branch:** feature/finding-astro-library
- **Base branch:** Working
- **Blueprint:** docs/finding-astro-library-blueprint.md
- **Status:** In progress — admin/reader foundation committed; hardening and validation underway
- **Last updated:** 2026-10-12
- **Rule:** Update this tracker during every substantial implementation pass. Do not mark work complete without observed evidence.

## Current status at a glance

| Workstream | Status | Notes |
|---|---|---|
| Create isolated feature branch from Working | DONE | Branch created in GitHub |
| Detailed blueprint | DONE | Product, data model, security, UX, testing, and pass plan documented |
| Persistent tracker | DONE | This file |
| Repository/framework audit | DONE | Next.js 15 App Router, auth flow, media upload contract, existing sidebar, Supabase schema/migrations and actual Storage bucket visibility verified |
| Supabase schema and policies | PARTIAL | Additive Library migration committed; RLS enabled fail-closed; API-level auth still required due service-role bypass |
| Storage strategy and upload workflow | PARTIAL | Confirmed public finding-astro-media and private finding-astro-private buckets; UI reuses the 10 MiB authenticated media upload route; orphan reconciliation/progress remain |
| Admin publishing studio | PARTIAL | Admin UI and book/chapter APIs exist; end-to-end upload, preview, reorder, and tests remain |
| Reader catalogue and reader | PARTIAL | Search, filters, cached facets, pagination, mobile cover artwork, chapter reader, hybrid PDF action and private PDF route committed; runtime checks remain |
| Reading progress/accessibility | PARTIAL | Owner-scoped progress API and chapter resume/save integrated; accessibility and cross-format position remain |
| Regression/release validation | BLOCKED | Vercel build-rate-limit failure; GitHub Actions check not yet observed |
| Preview deployment | BLOCKED | Latest Vercel status points to build-rate-limit/upgrade page; no current feature-head preview verified |
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
| LIB-006 | Define safe file size/type allowlist | High | Partial | Generic media upload currently allows PDF/images up to 10 MiB; EPUB remains unsupported in the upload flow |
| LIB-007 | Clean up media objects when multi-asset upload partially fails | Medium | Open | Track media IDs and reconcile unlinked uploads on retry/failure |
| LIB-008 | Add reading progress and resume | Medium | Partial | Chapter-level API and reader integration committed; PDF page/scroll positions remain |

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
- Add PDF page-position persistence, draft preview, and chapter-file upload/delivery; run database and runtime validation.
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


### Preview CI observation (2026-10-12)
- GitHub combined status for code commit 00350a040316bc9a634a5f0818638d38da8a7555 reports Vercel status **failure** with the target URL indicating a Vercel build-rate-limit/upgrade page.
- This is an environment/build-quota blocker, not evidence that the application code passed or failed compilation. No successful preview deployment was confirmed.
- Next action: retry after the Vercel build limit resets or run lint/typecheck/tests/build in a local/CI environment with available capacity. Do not merge based on the current status.


### Pass 5 — Reader/admin hardening and production audit (2026-10-12)
**Status: PARTIAL — source hardening committed; execution validation remains blocked**

Delivered on the existing `feature/finding-astro-library` branch. No additional branch was created.

**Reader UI and discovery**
- Added a dedicated public facets endpoint for topic/language options, cached for five minutes at the shared-cache layer.
- Added paginated discovery in batches of 24 with a visible “showing N of total” count, a load-more action, and recoverable load-more errors.
- Added skip-navigation links and explicit content landmarks to catalogue and reader pages.
- Cover art now appears on mobile as well as desktop.
- Hybrid publications expose a direct complete-PDF action while retaining chapter navigation.
- Complete-file editions no longer reserve a blank table-of-contents column.
- Structured-text headings now scale with the reader's text-size control.
- Public pages now show a stable, human-readable message if infrastructure returns malformed/non-JSON content instead of surfacing a JSON parse exception.

**API/storage hardening**
- Published PDF delivery now uses `Cache-Control: private, no-store, max-age=0` so a shared cache cannot continue serving a previously published PDF after unpublishing.
- Tightened storage path checks for public cover and private document assets, rejecting traversal, backslash and control-character paths.
- Publishing now validates the *effective* status even when an administrator edits metadata on an already-published item.
- Complete-file and hybrid publications must have a PDF; chapter-based and hybrid publications must have at least one published, readable rich-text chapter.
- Until a chapter-file viewer is implemented, create/update APIs accept structured-text chapters only; the API no longer accepts PDF/EPUB chapter metadata that the UI cannot actually render.
- Structured chapter bodies are constrained to a bounded block count, supported block types and text lengths.
- Qualified Library table UUID defaults as `extensions.uuid_generate_v4()`, matching the live Supabase project's extension schema.

**Live environment verification (read-only)**
- Supabase project “Finding Astro” is active.
- The existing `finding-astro-media` bucket is public and `finding-astro-private` is private, matching the cover/PDF delivery strategy.
- The live database has no `library_books`, `library_chapters`, or `library_reading_progress` tables yet; neither Library migration has been applied. No production schema change was made.
- Added the existing CI workflow's push trigger for this feature branch so typecheck/build checks can run without depending solely on Vercel.

**Unresolved release blockers**
- No successful typecheck, lint, test suite, production build, SQL migration execution, or browser test has been observed.
- GitHub's Vercel status continues to report a build-rate-limit/upgrade URL; it does not prove that source compilation failed, but it prevents confirming a valid preview.
- The first GitHub Actions attempt failed in `actions/setup-node` before dependency installation because the workflow pointed at nonexistent `apps/web/package-lock.json`. The workflow has been corrected to use the root npm-workspace lockfile, run scripts from the repository root, and use Node 22. The first run has been inspected and a fresh run has not yet appeared on the later commits; do not claim checks passed.
- Need a safe database validation environment before applying the migrations; do not apply to production as a shortcut.
- Need to verify the complete upload→publish→read workflow in a browser and add automated tests for publication-state enforcement, chapter ownership, progress ownership, malformed responses, and reorder behaviour.
- The Supabase security advisor reports a pre-existing critical finding: `public.spatial_ref_sys` has RLS disabled. This is outside the Library changes and was not modified. It requires separate owner review; enabling RLS without appropriate policies may break intended PostGIS access.

**Next substantial pass**
- Confirm CI results and fix compile/type/lint errors first.
- Add test coverage around publish validation, storage path checks, private PDF delivery and chapter progress.
- Validate both migrations in a non-production database, then browser-test the whole workflow and document exact rollout steps.


### CI workflow correction (2026-10-12)
- Inspected the first GitHub Actions run (job `114782994302`). It failed before `npm ci` because `cache-dependency-path` referenced `apps/web/package-lock.json`, which does not exist in this npm-workspace monorepo.
- Confirmed the repository root has `package.json` with `apps/web` as a workspace and a root `package-lock.json`.
- Updated `.github/workflows/ci.yml` to use Node 22, cache against the root lockfile, run `npm ci` at repository root, then execute root `lint`, `typecheck`, `test`, and `build` scripts.
- The earlier CI failure is a workflow configuration issue, not an application compilation result. Await a new run before drawing conclusions.


### Pass 5 follow-up — reader interaction hardening (2026-10-12)
**Status: PARTIAL**

- Chapter navigation now aborts the previous in-flight request when the reader selects another chapter. This prevents a slow response from an earlier selection overwriting the current chapter, and avoids clearing the loading state for a newer request.
- Malformed responses in the catalogue load-more flow now use the same friendly API parsing path as the initial catalogue load.
- Hybrid editions are labelled explicitly as `PDF + CHAPTERS` in discovery and book details.
- Verified source files after the changes. No current-head compile/build/test result is available yet.

**CI state**
- The first Actions run failed at `actions/setup-node` before `npm ci` because the cache path pointed to a nonexistent workspace lockfile.
- Root npm workspace/lockfile is confirmed; the workflow has been corrected to use root `npm ci`, root scripts, Node 22, and the root lockfile.
- GitHub Actions has not produced a check run for the latest follow-up commits at the last observation. Continue investigating the trigger/run status before calling the source validated.


### CI follow-up — ESLint bootstrap (2026-10-12)
- The corrected workflow successfully installed the root workspace dependencies.
- The next step failed because `next lint` opened an interactive “configure ESLint” prompt: the app had no ESLint config, so the non-interactive CI runner exited before typecheck/tests/build.
- Added `apps/web/.eslintrc.json` extending `next/core-web-vitals` and `next/typescript`, with generated/build directories ignored.
- A fresh workflow run is required to determine whether the existing codebase has actual lint findings. The previous run did not reach typecheck, tests, or build.
- Dependency installation also reported 19 audit findings (5 moderate, 13 high, 1 critical). This is an existing dependency-tree risk signal, not yet triaged by package/advisory; do not run an automatic breaking upgrade without reviewing the exact affected packages.


### Pass 5 final UI/accessibility polish (2026-10-12)
- Added visible keyboard-focus rings to the catalogue filters/cards and reader chapter controls.
- Added an `aria-live="polite"` status for chapter loading.
- The complete-file layout, hybrid PDF action, mobile cover artwork and proportional text sizing use the existing Finding Astro design tokens; no parallel theme was introduced.
- The only observed GitHub Actions run after fixing the workspace install completed at commit `160f336` and failed at `npm run lint` because the repository had no ESLint configuration and `next lint` launched an interactive prompt.
- Added `apps/web/.eslintrc.json` afterward. No new check run for the newer code head has been observed, so current code remains unvalidated by CI.


### Pass 6 — testable validation and request-race fixes (2026-10-12)
**Status: PARTIAL — tests added; latest-head CI/build still unconfirmed**

- Extracted publication-readiness and storage-key checks into `apps/web/src/lib/library-validation.ts`.
- Added `apps/web/tests/library-validation.test.ts` covering namespace allowlists, traversal/backslash/control-character rejection, rights confirmation, PDF requirements, and readable-chapter requirements.
- Admin publication PATCH now uses the tested validation helpers and preserves the original `published_at` timestamp when an already-published publication receives metadata edits. Republish after draft/archive still receives a fresh publication timestamp.
- Catalogue pagination now aborts stale requests when query/category/language filters change; stale pagination results cannot append to a newer result set.
- Reader resume no longer overrides a chapter the user manually selects while the saved-progress request is still pending.
- Latest source changes are committed to the existing branch. No new branch was created.

**Validation state**
- The observed CI run at `160f336` installed dependencies, then failed at lint because ESLint configuration was missing. That config has been added; the subsequent code/test commits have no successful current-head CI result attached yet.
- Vercel can list the preview deployment but the current connection receives a 403 when asked to create a deployment or fetch build events under the team scope. Do not try another connected Vercel account without confirming which account should be used.
- Live Supabase schema inspection remains read-only; no Library migration has been applied.


### Pass 7 — reader API boundaries and admin error clarity (2026-10-12)
- Public book-detail and chapter endpoints now return only published `rich_text` chapters; unsupported file-backed chapters cannot appear as blank/unreadable items in the reader.
- Reading-progress writes validate that a chapter is published, belongs to the selected book, and uses the supported rich-text format.
- Admin chapter rows label the stored content format and disable editing for unsupported file formats, with a helpful explanation.
- Catalogue filter selects now expose keyboard focus rings, and active reader chapters use `aria-current`; new-tab PDF links have accessible names.
- Admin library error states now distinguish an expired/missing sign-in from an authenticated user lacking administrator permission.
- Catalogue offsets are bounded to prevent pathological pagination values.
- No production data or database schema has been changed. These changes still require a successful current-head lint/typecheck/test/build run and browser validation.


### Pass 8 — bounded content and shared storage validation (2026-10-12)
- Reused the tested storage-key validator in the published PDF delivery route, keeping upload attachment and read-time validation consistent.
- Chapter authoring now validates empty content, maximum 100 paragraphs, and a 10,000-character per-paragraph limit before submitting; the form explains those limits and caps input length.
- Reader-facing APIs and progress writes filter to published rich-text chapters only, so unsupported file-backed chapter records cannot be surfaced as blank chapters or used as progress anchors.
- Admin publishing error states distinguish authentication from missing admin permission; unsupported file-backed chapters are labelled and their edit action is disabled.
- Catalogue filter wrappers and reader controls now have explicit keyboard focus styling and active chapter semantics.
- Current code has not been validated by a successful latest-head build. The observed GitHub Actions run failed before typecheck/tests/build at the missing ESLint configuration; configuration was added after that run. The latest Vercel preview is ERROR and build-event inspection is blocked by the current Vercel team's 403 authorization response.


### Pass 9 — verified feature build and release blockers (2026-10-12)
**Status: FEATURE BUILD PASSES; RELEASE GATES REMAIN**

Latest observed GitHub Actions run: `38243010355` (current source head at time of run).

- `npm ci`: PASS.
- `npm run lint:library`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS — production build completed and Next.js emitted the route/build summary.
- `npm run test`: FAIL — 9 test files, 35 tests total; 8 files passed, 34 tests passed, 1 existing test failed in `tests/org-permissions.test.ts:22`, suite `NGO role permission profiles > gives each operational role its intended capabilities`.
- All 6 new `library-validation.test.ts` tests passed.
- The failing org-permissions test is outside Library scope and its role matrix was not changed. Do not change operational permissions just to make CI green without confirming intended access policy.
- The build uses a CI-only placeholder `JWT_SECRET` so Next.js can import auth-dependent modules in CI. It is not a production secret and is not configured as a Vercel production environment variable.
- Full-app ESLint previously surfaced legacy violations across unrelated files. CI now blocks on the focused Library lint, while a few safe pre-existing JSX/hook issues were corrected so the production build can complete. Legacy explicit-any usage remains warnings.

**Still blocking production rollout**
1. Full test suite is not green because of the unrelated role-permissions expectation.
2. Dependency install reports 19 audit findings (13 high, 1 critical, 5 moderate); exact advisories need review before dependency upgrades.
3. Vercel's latest preview status is ERROR. The current connector can list deployments but receives 403 when requesting build events or creating a preview under the selected team scope; therefore the exact Vercel build error is not verified.
4. No browser/mobile end-to-end test has run.
5. Library migrations remain unapplied. Live Supabase checks were read-only; test the migrations against a non-production database first.
6. The existing Supabase security advisor reports `public.spatial_ref_sys` RLS disabled. This pre-existing critical finding was not changed and needs separate owner review.

**Next substantial pass**
- Triage the exact npm audit advisories and decide safe upgrades.
- Resolve the existing org-permissions test with the policy owner (do not grant extra role permissions speculatively).
- Restore Vercel team-scope access, obtain a current preview deployment, and test the admin upload → publish → reader → resume workflow on desktop and mobile.
- Validate the two SQL migrations on a non-production Supabase database, then record rollout/rollback steps.
