# UI Refinement — Implementation Tracker

Branch: `ui-refinement`  
Production: `Working` (do not merge without explicit approval)

| ID | Work item | Status | Completion evidence / next action |
|---|---|---|---|
| UX-01 | Research dashboard vs activity hub | Done | Evolve the current dashboard; preserve existing utility. See `docs/ui-refinement-blueprint.md`. |
| DOC-01 | Create working blueprint | Done | Blueprint committed to this branch. |
| DOC-02 | Create implementation tracker | Done | This tracker records implementation and verification status. |
| AUD-01 | Audit current dashboard and navigation | Done | Existing quick actions, personal cases, collectives, impact and nearby-animal lookup remain in place. |
| AUD-02 | Verify feed data sources and visibility | Done for MVP | Cases use the role-aware API and server-side `publicFeed=true` visibility filter; stories use the published-only stories endpoint. |
| UX-02 | Prioritize Rescue Collectives on citizen dashboard | Implemented on branch; preview pending | Moved the existing collective membership and creation cards directly after quick actions, before the activity feed, so users can find them without scrolling through feed content. |
| API-01 | Feed data access | Done for MVP | Existing authenticated APIs; bounded requests and existing internal destinations. |
| UI-01 | Feed states and filters | Implemented; validation pending | Loading, partial error, empty, manual refresh, filters and timestamps. |
| UI-02 | Visual feed redesign | Implemented on branch; preview pending | Replaced divider rows with responsive media cards, image-backed case/story cards, image fallbacks, urgency/featured labels, location and time metadata, and stronger card hierarchy. |
| UI-03 | Mobile and keyboard usability | QA pending | Responsive one/two-column cards, horizontally scrollable filters, keyboard focus styles; needs browser verification. |
| TEST-01 | Add/adjust targeted tests | Not started | Cover role visibility, empty results, ordering, errors and malformed filter input. |
| TEST-02 | Run typecheck/lint/tests/build | Pending | No connected local runtime; must run before release. |
| QA-01 | Preview verification | Partially available | The prior revision `0fc384a` reached Vercel `READY`; it does not include the latest card redesign. A deployment for the latest commit was rejected by Vercel with HTTP 402 `api-deployments-free-per-day` (retry after 24 hours). |
| RELEASE-01 | Review and merge to Working | Not started | Keep PR #8 unmerged until checks pass and the user explicitly approves. |

## Current implementation

- `HomeActivityFeed.tsx` combines open/visible cases and published community stories.
- The visual refresh uses real case evidence images (`evidenceUrls`) and story media (`media_urls`) where available. A designed gradient/icon fallback remains when a record has no usable photo.
- Cards show source type, grounded urgency/featured state, status, timestamp, location, concise summary and a direct action. Responsive grid and loading skeletons use the existing app design tokens.
- The server-side case feed filter prevents held-for-review records from being returned to unrelated users.
- Draft PR: https://github.com/Jason45Builders/Finding-Astro/pull/8
- Latest feed redesign commit: `9cd6223af329855d31798a637f1f69c020acb196`
- Rescue Collectives reordered above the activity feed in commit `80bd676db0492b4c5f4105de2b37b579e2f19454`.
- The latest revision has not yet been browser-verified. Do not merge until verified.

## Working log

### 2026-10-13
- Confirmed `ui-refinement` is the work branch; `Working` remains untouched.
- Redesigned feed cards with media-first presentation and clearer visual hierarchy.
- Moved the Rescue Collectives section above the activity feed while preserving membership loading, collective navigation and the create-team CTA. Preview deployment and browser verification remain pending.
