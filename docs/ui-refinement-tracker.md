# UI Refinement — Implementation Tracker

Branch: `ui-refinement`  
Production: `Working` (protected by process; do not merge without approval)

| ID | Work item | Status | Completion evidence / next action |
|---|---|---|---|
| UX-01 | Research dashboard vs activity hub | Done | Recommendation: evolve the current dashboard; do not replace existing utility. See `docs/ui-refinement-blueprint.md`. |
| DOC-01 | Create working blueprint | In progress | Commit blueprint to this branch. |
| DOC-02 | Create implementation tracker | In progress | Commit tracker to this branch; update it as implementation proceeds. |
| AUD-01 | Audit current dashboard and navigation | Done | Existing dashboard has quick actions, personal cases, collectives, impact and nearby-animal lookup; preserve these. |
| AUD-02 | Verify feed data sources and visibility | Done for MVP | Cases use the existing role-aware API; stories use the published-only stories endpoint. |
| API-01 | Feed data access | Done for MVP | Existing authenticated APIs; bounded case/story requests; stable source IDs and destinations. |
| API-02 | Implement feed data access | Done for MVP | Existing source APIs reused; no new aggregate endpoint or database table. |
| UI-01 | Build Home activity feed states | Implemented; validation pending | Loading, partial-error, empty, refresh, filters, timestamps and focus styling. |
| UI-02 | Integrate feed without deleting dashboard tools | Implemented; validation pending | Feed placed after quick actions; existing dashboard sections remain. |
| UI-03 | Mobile and keyboard usability | QA pending | Horizontal filter row, keyboard-operable controls, no auto-refresh/reordering. |
| TEST-01 | Add/adjust targeted tests | Not started | Cover role visibility, empty results, ordering, errors and malformed filter input. |
| TEST-02 | Run typecheck/lint/tests/build | Pending | No connected local runtime; no CI run found for the branch commit. Must run before release. |
| QA-01 | Preview verification | Blocked | Vercel deployment API returned HTTP 402 due to daily deployment quota. Retry after 24 hours or resolve the Vercel plan/quota; no preview has been validated. |
| RELEASE-01 | Open PR to Working after verification | Not started | Do not merge until the user reviews and explicitly approves. |

## Current implementation

- Added `HomeActivityFeed.tsx` using the existing role-aware cases API and published-only community stories API.
- Added bounded `api.listCommunityStories()` client method and integrated the feed after existing quick actions.
- Added manual refresh, filters, loading/partial-error/empty states, timestamps and accessible focus styling. Open cases marked `heldForReview` are excluded from the public feed unless the current user reported or is assigned to them.
- Draft PR: https://github.com/Jason45Builders/Finding-Astro/pull/8
- Typecheck/build/preview QA remain pending; do not merge until verified.
- Preview deployment attempt was blocked by Vercel API quota (HTTP 402, `api-deployments-free-per-day`; retry after 24 hours). No branch preview was available to inspect.

## Working log

### 2026-10-13
- Confirmed work branch is `ui-refinement`; production branch remains `Working`.
- Inspected the existing dashboard, case list API, app navigation and package scripts.
- Key safety finding: the case API has existing role-aware visibility behavior; a feed must preserve these rules rather than query and expose raw case records.
- Next: inspect existing community story and notification APIs, then implement the smallest useful feed from confirmed sources.
