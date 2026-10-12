# Citizen & Rescue Collective Navigation Blueprint

**Status:** Implementation in progress  
**Branch:** `feat/citizen-collective-navigation`  
**Scope:** Frontend navigation and workspace discovery only. No database schema, payment, donation reconciliation, or authorization changes.

## 1. Problem statement

The citizen sidebar currently mixes community-wide animal-welfare destinations with ten operational links for a citizen's NGO/Rescue Collective membership. A citizen who belongs to a collective therefore sees an excessively long, mixed-purpose navigation list. This also scales poorly when a person belongs to multiple collectives.

## 2. Product principles

1. **Two explicit workspaces:** Citizen space for community participation; Collective space for operating one selected group.
2. **One entry point for groups:** Citizens navigate to **My Collectives** to list, create, and switch between their groups. Collective tools must not be appended to the citizen sidebar.
3. **Contextual navigation:** When the route is under `/org/*`, show collective tools and explicit links back to citizen space / collective selection.
4. **Preserve destinations:** Existing feature routes and links remain valid. This change changes discovery and navigation, not feature access.
5. **Server remains authoritative:** Hiding a link is never an authorization control. Existing API and organization membership checks remain responsible for access control.
6. **Mobile is not an afterthought:** Keep the compact bottom navigation; the More drawer exposes the same workspace-aware navigation.
7. **No destructive scope creep:** Do not modify payment capture/reconciliation, database policies, or collective role logic as part of this UX refactor.

## 3. Citizen-space information architecture

### Primary / frequently used
- Dashboard
- Animals
- My Cases
- Respond SOS
- City Map
- Adopt
- Foster
- Lost & Found
- Wildlife
- Safety
- ABC

### Community & support
- Funding
- My Donations
- Community
- My Collectives
- Partners
- Ambulance

### Secondary / More
- Memorial Wall
- Feedback
- My Profile (also available through the mobile bottom bar)
- Legal
- Privacy
- Terms
- Report Cruelty (kept discoverable here rather than removed)

Use clear section labels and compact spacing. Do not remove any existing route. Keep Dashboard and the primary animal-welfare actions easy to scan.

## 4. My Collectives landing page

Route: `/collectives`

Responsibilities:
- Fetch memberships through the existing `api.getMyOrgMemberships()` API.
- Show active memberships only, consistent with the current dashboard and workspace behavior.
- For each group, show its name, group type, membership role, and verification state when available.
- Selecting a group sets the existing active organization context via `api.setActiveOrgId(orgId)` and navigates to `/org/dashboard`.
- Provide a clear create action linking to the existing `/community/rescue-collective/create` flow.
- Provide loading, error/retry, and empty states.
- Support multiple collectives; never assume a user has only one.
- Do not add a new API endpoint or change membership data shape.

## 5. Collective workspace navigation

When the current route is under `/org/*`, show only:
- Switch to My Collectives
- Return to Citizen Dashboard
- Dashboard
- Animals
- Volunteers
- Tasks
- Events
- Expenses
- Donations
- Documents
- Team
- Settings

The selected collective context remains controlled by the existing active-org mechanism and `/org/layout.tsx`. Do not put collective operation links beside citizen-wide links.

## 6. Responsive behavior

- Desktop: grouped citizen sidebar; secondary items are visually separated under More. Collective routes use a dedicated collective sidebar.
- Mobile: preserve the bottom bar and More drawer. Use workspace-appropriate primary shortcuts while in `/org/*`; drawer links must use the same contextual nav sections.
- Active-route styling must continue to work for nested paths.
- Link tap targets, labels, keyboard behavior, and scrollable drawer/sidebar remain usable on narrow screens.

## 7. Compatibility and safety constraints

- Keep all existing URLs and page implementations intact.
- Do not alter authentication, API authorization, active-org persistence semantics, or membership roles.
- Do not make an NGO-only route reachable by merely changing a sidebar condition; existing route/layout checks must remain in place.
- Do not modify UPI donation pages, payment capture, UTR reporting, payment verification, or reconciliation.
- Avoid unrelated visual redesigns.

## 8. Acceptance criteria

- [ ] A citizen without memberships sees one **My Collectives** entry and no collective operation links mixed into citizen navigation.
- [ ] A citizen with one or more memberships sees the same citizen navigation and can open `/collectives`.
- [ ] The landing page supports zero, one, or multiple active memberships.
- [ ] Selecting a collective sets active-org context and opens its dashboard.
- [ ] Collective routes show collective-only tools plus clear routes back to citizen space / group selection.
- [ ] Existing feature URLs continue to work.
- [ ] Mobile bottom shortcuts are appropriate to the active workspace; More exposes the full navigation.
- [ ] Loading, error/retry, and empty states are present on the landing page.
- [ ] Typecheck/build and targeted route/navigation checks are run; any unverified checks are clearly reported.

## 9. Rollout

Implement on `feat/citizen-collective-navigation`, review the diff and CI/build status, then use a preview deployment for citizen-without-membership, citizen-with-membership, multi-membership, collective-admin, NGO, and mobile smoke tests. Merge/promote only after the checks pass.
