# Citizen & Rescue Collective Navigation — Implementation Tracker

**Blueprint:** [CITIZEN-COLLECTIVE-NAVIGATION-BLUEPRINT.md](./CITIZEN-COLLECTIVE-NAVIGATION-BLUEPRINT.md)  
**Working branch:** `feat/citizen-collective-navigation`  
**Status:** In progress  
**Last updated:** 2026-10-12

## Progress key
- `[x]` implemented and verified
- `[~]` implementation started / needs verification
- `[ ]` not yet complete

## Work items

### A. Planning and baseline
- [x] Define citizen-space vs collective-workspace model.
- [x] Preserve current URLs and use existing membership API.
- [x] Explicitly exclude payment capture/reconciliation and database changes.
- [ ] Capture baseline screenshots for desktop and mobile.
- [ ] Confirm CI/build results for the implementation commit.

### B. Citizen navigation
- [ ] Replace flat citizen list with labeled sections.
- [ ] Remove the ten collective-operation links from the citizen sidebar.
- [ ] Add one **My Collectives** entry linking to `/collectives`.
- [ ] Keep less-frequent destinations discoverable under More.
- [ ] Keep mobile bottom navigation compact and functional.

### C. My Collectives landing page
- [ ] Implement `/collectives` using `api.getMyOrgMemberships()`.
- [ ] Show only active memberships and role/type/verification context.
- [ ] Support zero, one, and multiple memberships.
- [ ] Set active org and open `/org/dashboard` on selection.
- [ ] Link to existing create-collective flow.
- [ ] Add loading, retryable error, and empty states.

### D. Collective workspace navigation
- [ ] Show collective tools only on `/org/*` routes.
- [ ] Add clear links to My Collectives and Citizen Dashboard.
- [ ] Use workspace-specific mobile shortcuts.
- [ ] Verify active link highlighting for nested paths.
- [ ] Preserve existing `/org/layout.tsx` membership guard.

### E. Quality and regression
- [ ] TypeScript typecheck.
- [ ] Production build.
- [ ] Review navigation and route diff for unrelated changes.
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
| 2026-10-12 | Blueprint and tracker created on feature branch | Documentation committed; implementation pending verification |
