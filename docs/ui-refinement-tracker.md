# UI Refinement — Implementation Tracker

Branch: `ui-refinement`  
Production: `Working` (protected by process; do not merge without approval)

| ID | Work item | Status | Completion evidence / next action |
|---|---|---|---|
| UX-01 | Research dashboard vs activity hub | Done | Recommendation: evolve the current dashboard; do not replace existing utility. See `docs/ui-refinement-blueprint.md`. |
| DOC-01 | Create working blueprint | In progress | Commit blueprint to this branch. |
| DOC-02 | Create implementation tracker | In progress | Commit tracker to this branch; update it as implementation proceeds. |
| AUD-01 | Audit current dashboard and navigation | Done | Existing dashboard has quick actions, personal cases, collectives, impact and nearby-animal lookup; preserve these. |
| AUD-02 | Verify feed data sources and visibility | In progress | Case API is authenticated and has role-aware visibility filters. Inspect stories/adoption/notification models before aggregating them. |
| API-01 | Define authenticated feed contract | Not started | Bounded result set; stable IDs/types/timestamps/links; server-side visibility only. |
| API-02 | Implement feed endpoint using verified source(s) | Not started | Do not include sources whose schema, publication status or access rules are uncertain. |
| UI-01 | Build Home activity feed states | Not started | Loading, error/retry, empty, refresh, filter, accessible timestamps. |
| UI-02 | Integrate feed without deleting dashboard tools | Not started | Keep quick actions near top and preserve existing sections. |
| UI-03 | Mobile and keyboard usability | Not started | Test narrow viewport, focus, accessible labels, and no disruptive auto-reordering. |
| TEST-01 | Add/adjust targeted tests | Not started | Cover role visibility, empty results, ordering, errors and malformed filter input. |
| TEST-02 | Run typecheck/lint/tests/build | Not started | Record exact commands and outcomes; do not claim tests passed without running them. |
| QA-01 | Preview verification | Not started | Verify the branch deployment and core user flows. |
| RELEASE-01 | Open PR to Working after verification | Not started | Do not merge until the user reviews and explicitly approves. |

## Working log

### 2026-10-13
- Confirmed work branch is `ui-refinement`; production branch remains `Working`.
- Inspected the existing dashboard, case list API, app navigation and package scripts.
- Key safety finding: the case API has existing role-aware visibility behavior; a feed must preserve these rules rather than query and expose raw case records.
- Next: inspect existing community story and notification APIs, then implement the smallest useful feed from confirmed sources.
