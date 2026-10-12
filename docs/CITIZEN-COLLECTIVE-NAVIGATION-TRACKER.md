# Citizen & Rescue Collective Navigation — Implementation Tracker

**Blueprint:** [CITIZEN-COLLECTIVE-NAVIGATION-BLUEPRINT.md](./CITIZEN-COLLECTIVE-NAVIGATION-BLUEPRINT.md)  
**Working branch:** `feat/citizen-collective-navigation`  
**Status:** In progress  
**Last updated:** 2026-10-12

## Progress key
- `[x]` implemented in code/documentation
- `[~]` implementation started or awaiting verification
- `[ ]` not yet complete

## Work items

### A. Planning and baseline
- [x] Define citizen-space vs collective-workspace model.
- [x] Preserve current URLs and use existing membership API.
- [x] Explicitly exclude payment capture/reconciliation and database changes.
- [ ] Capture baseline screenshots for desktop and mobile.
- [ ] Confirm CI/build results for the implementation commit.

### B. Citizen navigation
- [x] Replace flat citizen list with labeled sections.
- [x] Remove the ten collective-operation links from the citizen sidebar.
- [x] Add one **My Collectives** entry linking to `/collectives`.
- [x] Keep less-frequent destinations discoverable under More.
- [x] Keep mobile bottom navigation compact and workspace-aware.

### C. My Collectives landing page
- [x] Implement `/collectives` using `api.getMyOrgMemberships()`.
- [x] Show only active memberships and role/type/verification context.
- [x] Support zero, one, and multiple memberships.
- [x] Set active org and open `/org/dashboard` on selection.
- [x] Link to existing create-collective flow.
- [x] Add loading, retryable error, and empty states.

### D. Collective workspace navigation
- [x] Show collective tools only on `/org/*` routes (and preserve existing NGO workspace behavior).
- [x] Add clear links to My Collectives and Citizen Dashboard.
- [x] Use workspace-specific mobile shortcuts.
- [x] Reused existing nested-route active matching; runtime verification pending.
- [x] Preserve existing `/org/layout.tsx` membership guard (left unchanged).

### E. Quality and regression
- [ ] TypeScript typecheck.
- [ ] Production build.
- [x] Review navigation and route diff for unrelated changes (focused on the two layouts, the new landing page, and docs).
- [ ] Smoke test citizen without collective.
- [ ] Smoke test citizen with one collective.
- [ ] Smoke test citizen with multiple collectives.
- [ ] Smoke test collective admin and NGO account.
- [ ] Smoke test mobile drawer and bottom navigation.
- [ ] Confirm existing links/deep links remain valid.
- [ ] Confirm donation and payment flows were not modified.
- [ ] Record CI and Vercel preview result before merge.

## Implementation notes

- Existing membership source: `api.getMyOrgMemberships()` from `apps/web/src/lib/api.ts`.
- Existing active context: `api.setActiveOrgId(orgId)`.
- Existing collective workspace: `/org/dashboard` and sibling `/org/*` routes.
- Existing create flow: `/community/rescue-collective/create`.
- The dashboard already displays collectives; this page provides a durable navigation destination outside the dashboard.
- A navigation condition is not an authorization boundary. Existing server-side checks must remain authoritative.

## Change log

| Date | Change | Evidence / result |
|---|---|---|
| 2026-10-12 | Blueprint and tracker created on feature branch | Documentation committed |
| 2026-10-12 | Implemented grouped citizen navigation, contextual collective navigation, mobile shortcuts, and `/collectives` switcher | Committed to feature branch; preview build and end-to-end checks still pending |
