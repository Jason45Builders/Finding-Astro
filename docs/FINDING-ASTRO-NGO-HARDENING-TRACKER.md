# Welfare Group Feature — Block 2

**Status:** 🟢 COMPLETE

Block 2 adds the Rescue Collective onboarding and administration path on top of the existing welfare-group architecture. NGO creation remains on the existing NGO verification workflow.

### Completed

- [x] Authenticated user can create a local Rescue Collective.
- [x] Rescue Collective creation is explicitly constrained to `org_type = rescue_collective`.
- [x] Creator automatically becomes the first `org_admin`.
- [x] Creator receives server-derived wildcard organization permissions.
- [x] Rescue Collective starts unverified but operational.
- [x] Existing NGO verification flow is not bypassed by the new Rescue Collective creation path.
- [x] Rescue Collective membership is visible through the existing multi-group membership endpoint.
- [x] Membership payload now includes group type.
- [x] Organization workspace no longer requires the global platform role `ngo`; authenticated users with an active organization membership can use the workspace.
- [x] No-membership workspace state now offers direct Rescue Collective creation.
- [x] Active group selection continues through the existing `fa_active_org_id` / `X-Finding-Astro-Org-Id` path.
- [x] Settings displays the immutable welfare-group type.
- [x] Existing invitation/member/role administration remains reusable without a Rescue Collective-specific fork.
- [x] Creation endpoint includes CSRF protection and rate limiting.
- [x] Creation failure rolls back the newly created group if membership creation fails.
- [x] Legacy `welfare_org_admins` compatibility is preserved for the creator.

### Block 2 verification

- Live database constraint accepts `rescue_collective`.
- No new schema/table hierarchy was introduced.
- Rescue Collective creation uses the existing `welfare_orgs`, `organization_members`, and `welfare_org_admins` structures.
- Rescue Collective members remain ordinary platform users; organization authorization is determined by organization membership and role, not by globally changing their platform role.
- NGO onboarding remains separate and is not accidentally converted into unverified immediate NGO creation.

### Block 2 exit decision

**Complete.** Block 3 can focus on adapting the operational workspace UX and workflows specifically for local rescue collectives, followed by the combined security/stress acceptance work.

---

# Welfare Group Feature — Block 1

**Status:** 🟢 COMPLETE

Block 1 extends the existing `welfare_orgs` + `organization_members` architecture. It does **not** introduce a second organization hierarchy.

### Completed

- [x] Reuse `welfare_orgs` as the common Welfare Group parent.
- [x] Use existing `welfare_orgs.org_type` as the canonical group-type discriminator.
- [x] Restrict group type to `ngo` or `rescue_collective`.
- [x] Preserve all existing organizations as `ngo`.
- [x] Keep the existing organization membership and role model unchanged.
- [x] Extend the server-derived organization context with `groupType`.
- [x] Require the selected welfare group itself to exist and be active during authorization.
- [x] Reject unsupported/invalid group types at the authorization boundary.
- [x] Preserve explicit multi-group selection through `X-Finding-Astro-Org-Id`.
- [x] Add the schema migration and index for group-type queries.
- [x] Verify the live database accepts both supported group types and retains legacy NGO rows.

### Block 1 verification

- Live `welfare_orgs` currently contains 6 groups; all existing rows are `ngo`.
- `org_type` is now non-null with default `ngo`.
- Database check constraint allows only `ngo` and `rescue_collective`.
- Existing `organization_members` uniqueness remains `(welfare_group_id, user_id)`.
- Authorization now checks membership **and** group existence/activity/type.
- No second parent organization table was introduced.

### Block 1 exit decision

**Complete.** Block 2 can build Rescue Collective onboarding/admin UX on top of the existing architecture.

---

# Finding Astro — NGO Hardening Progress Tracker

**Specification:** `docs/FINDING-ASTRO-NGO-HARDENING-SPEC.md`  
**Repository:** `Jason45Builders/Finding-Astro`  
**Branch:** `feature/ngo-hardening`  
**Program status:** 🟡 IN PROGRESS  
**Last updated:** 2026-10-06 — Welfare Group Feature Block 2

---

## Status Legend

- ⬜ Not started
- 🟡 In progress
- 🔵 Audited
- 🟢 Complete
- 🔴 Blocked
- ⚠️ Needs user decision/input

---

# Executive Progress

| Pass | Area | Status | Verification |
|---|---|---:|---|
| 0 | Baseline | 🔵 Audited | Repository + Supabase + route/RBAC review |
| 1 | Authorization Architecture | 🟢 | Server-derived role profiles + explicit org context + permission regression tests implemented |
| 2 | Multi-NGO Membership | 🟡 | Active-org context implemented; explicit ownership model now live; full multi-NGO acceptance pending |
| 3 | NGO Onboarding & Verification | 🟡 | Canonical pending/approval flow implemented; frontend + migration/regression audit pending |
| 4 | Invitations & Member Lifecycle | 🟡 | One-time hashed invitation, expiry, acceptance, revoke, and member-list endpoints implemented; notifications/resend/suspend/leave still pending |
| 5 | Member Administration & Privilege Security | 🟡 | Server-derived permissions and final-admin/self-deactivation protections implemented; full hierarchy/audit tests pending |
| 6 | Case & Rescue Coordination | 🟡 | NGO case ownership column + scoped list/create/detail/update implemented; assignment/comment/isolation regression suite pending |
| 7 | Animals & Medical | 🟢 | Explicit animal ownership plus scoped animal detail, medical history, and vaccination APIs implemented; full document/medical regression suite pending |
| 8 | Volunteers, Foster & Tasks | 🟡 | Recovery/foster records now carry NGO ownership and NGO writes are scoped; broader volunteer/task endpoint audit pending |
| 9 | Adoption & Follow-Ups | 🟡 | Adoption ownership is linked to animal organization and NGO review/mark-adoptable paths are scoped; full follow-up isolation pending |
| 10 | Finance, Campaigns, Events & Shelters | ⬜ | Pending |
| 11 | Documents, Reports & Notifications | ⬜ | Pending |
| 12 | Audit Trail | ⬜ | Pending |
| 13 | Supabase Security | 🟡 | Removed public execution of custom RLS auto-enable function, hardened security-definer view, fixed mutable search paths; broad RLS policy design and PostGIS exposure remain pending |
| 14 | Cross-Platform Coordination | ⬜ | Pending |
| 15 | Pawstice End-to-End Simulation | ⬜ | Pending |
| 16 | Production Hardening | ⬜ | Pending |
| 17 | Final Acceptance | ⬜ | Pending |

---

# Pass 0 — Baseline

**Status:** 🔵 Audited

### Confirmed

- [x] Repository access.
- [x] Supabase project access.
- [x] Vercel project context available.
- [x] 6 platform roles identified.
- [x] 8 organization roles identified.
- [x] Existing organization permission scopes identified.
- [x] NGO signup flow inspected.
- [x] NGO verification flow inspected.
- [x] Organization membership flow inspected.
- [x] Organization dashboard inspected.
- [x] Organization member management inspected.
- [x] Core organization routes inspected.
- [x] Current multi-NGO limitation identified.
- [x] Current permission-profile limitation identified.
- [x] Privilege escalation risk identified.
- [x] Temporary-password invitation model identified.
- [x] Related-record scoping risks identified.
- [x] Live Supabase database confirmed healthy.
- [x] Live database contains 84 public tables and 747 public functions at baseline capture.
- [x] RLS is enabled on many application tables.
- [x] Focused policy audit found no actual RLS policies; API authorization is currently the primary boundary.
- [x] Direct NGO signup currently grants operational access before verification.

### Baseline blockers

- [ ] Multi-NGO architecture.
- [ ] Role → permission profiles.
- [ ] Member privilege hierarchy.
- [ ] Canonical NGO verification lifecycle.
- [ ] Proper invitations.
- [ ] Cross-NGO resource enforcement.
- [ ] Full end-to-end NGO acceptance test.

---

# Pass 1 — Authorization Architecture

**Status:** ⬜

### Tasks

- [x] Define canonical organization permission constants.
- [x] Define role-to-permission profiles.
- [x] Centralize permission evaluation.
- [x] Define platform-role vs organization-role boundaries.
- [x] Define active organization context.
- [x] Define authorization failure semantics.
- [ ] Audit all org routes against the matrix.
- [x] Remove client authority over arbitrary permissions.
- [x] Add authorization unit tests.
- [x] Add initial privilege-escalation protection/tests.

### Exit criteria

- [ ] Every organization role has a documented permission profile.
- [ ] Server is authoritative for role/permission decisions.
- [ ] No arbitrary client wildcard grants.
- [ ] Authorization tests pass.

---

# Pass 2 — Multi-NGO Membership

**Status:** ⬜

### Tasks

- [x] Support multiple memberships per user.
- [x] Define active organization context.
- [ ] Implement organization switching.
- [x] Scope API requests to active organization.
- [ ] Scope dashboard data.
- [ ] Scope notifications.
- [x] Scope member permissions.
- [x] Prevent membership collision.
- [ ] Add multi-NGO database tests.
- [ ] Add cross-NGO API tests.

### Exit criteria

- [ ] One user can belong to at least two NGOs.
- [ ] Different roles can be held in each NGO.
- [ ] Switching NGOs changes visible/allowed data correctly.
- [ ] NGO A cannot access NGO B resources.

---

# Pass 3 — NGO Onboarding & Verification

**Status:** ⬜

### Tasks

- [x] Reconcile public NGO signup and verification.
- [x] Define pending state.
- [x] Define verified state.
- [ ] Define rejected state.
- [ ] Define suspended state.
- [x] Prevent premature operational access.
- [x] Preserve approved organization identity.
- [ ] Handle resubmission.
- [ ] Update NGO frontend messaging.
- [ ] Add onboarding tests.

### Exit criteria

- [ ] Pawstice can register.
- [ ] Pawstice enters the correct pending state.
- [ ] Authorized verifier approves Pawstice.
- [ ] Only then does full operational access activate.

---

# Pass 4 — Invitations & Member Lifecycle

**Status:** ⬜

### Tasks

- [x] Invitation persistence.
- [x] Secure one-time token.
- [x] Expiration.
- [x] Acceptance.
- [x] Password setup.
- [ ] Resend.
- [x] Revoke.
- [ ] Suspend.
- [ ] Reactivate.
- [ ] Remove.
- [ ] Leave NGO.
- [x] Prevent accidental global-user deletion.
- [ ] Invitation notifications.
- [ ] Tests.

### Exit criteria

- [ ] No temporary-password sharing required.
- [ ] Member can accept invitation independently.
- [ ] Membership lifecycle is recoverable and auditable.

---

# Pass 5 — Member Administration & Privilege Security

**Status:** ⬜

### Tasks

- [ ] Role hierarchy.
- [ ] Permission hierarchy.
- [ ] Self-escalation protection.
- [ ] Prevent wildcard escalation.
- [ ] Prevent unauthorized org_admin promotion.
- [ ] Protect final org_admin.
- [ ] Safe role transfer.
- [ ] Member management audit events.
- [ ] Negative authorization tests.

### Exit criteria

- [ ] No member can elevate themselves.
- [ ] No unauthorized member can elevate another member.
- [ ] Organization cannot accidentally lose all administrators.

---

# Pass 6 — Case & Rescue Coordination

**Status:** ⬜

### Tasks

- [x] Case organization ownership.
- [x] Case access matrix.
- [ ] Case assignment.
- [ ] Rescue coordinator workflow.
- [ ] Responder assignment.
- [ ] Comments.
- [ ] Status transitions.
- [ ] Escalation.
- [x] Cross-NGO protection.
- [ ] Audit events.
- [ ] Integration tests.

### Exit criteria

- [ ] Pawstice can receive, assign, coordinate and close a rescue case.
- [ ] Unauthorized NGO cannot access the case.

---

# Pass 7 — Animals & Medical

**Status:** ⬜

### Tasks

- [x] Animal organization ownership.
- [x] Animal access matrix.
- [ ] Animal assignments.
- [ ] Case linkage.
- [x] Medical linkage.
- [ ] Vet permissions.
- [ ] Medical coordinator permissions.
- [x] Medical records.
- [ ] Medical documents.
- [ ] Medical follow-ups.
- [ ] Cross-NGO tests.

---

# Pass 8 — Volunteers, Foster & Tasks

**Status:** ⬜

### Tasks

- [ ] Volunteer membership.
- [ ] Volunteer role.
- [ ] Volunteer assignment.
- [ ] Availability.
- [ ] Task assignment.
- [ ] Foster onboarding.
- [ ] Foster assignment.
- [ ] Animal handover.
- [ ] Foster follow-up.
- [ ] Multiple-NGO volunteer tests.

---

# Pass 9 — Adoption & Follow-Ups

**Status:** ⬜

### Tasks

- [x] Adoption coordinator permissions.
- [x] Application workflow.
- [x] Review.
- [x] Approval/rejection.
- [ ] Handover.
- [ ] Follow-up.
- [ ] Medical/adoption coordination.
- [x] Cross-NGO protection.

---

# Pass 10 — Finance, Campaigns, Events & Shelters

**Status:** ⬜

### Tasks

- [ ] Finance role.
- [ ] Expense creation.
- [ ] Expense approval.
- [ ] Creator/approver separation.
- [ ] Campaign ownership.
- [ ] Event ownership.
- [ ] Shelter ownership.
- [ ] Shelter capacity.
- [ ] Animal allocation.
- [ ] Audit events.

---

# Pass 11 — Documents, Reports & Notifications

**Status:** ⬜

### Tasks

- [ ] NGO documents.
- [ ] Verification documents.
- [ ] Animal documents.
- [ ] Case evidence.
- [ ] Storage authorization.
- [ ] Reports.
- [ ] NGO-scoped analytics.
- [ ] Case notifications.
- [ ] Task notifications.
- [ ] Medical notifications.
- [ ] Adoption notifications.
- [ ] Follow-up notifications.
- [ ] Admin notifications.

---

# Pass 12 — Audit Trail

**Status:** ⬜

### Tasks

- [ ] Define audit event model.
- [ ] Member events.
- [ ] Role events.
- [ ] Permission events.
- [ ] Case events.
- [ ] Animal events.
- [ ] Medical events.
- [ ] Adoption events.
- [ ] Foster events.
- [ ] Finance events.
- [ ] Document events.
- [ ] Administrative events.
- [ ] Organization scoping.
- [ ] Audit access control.

---

# Pass 13 — Supabase Security

**Status:** ⬜

### Tasks

- [ ] Full RLS inventory.
- [ ] Policy inventory.
- [ ] Determine intended Data API exposure.
- [ ] Review grants.
- [ ] Review views.
- [ ] Review SECURITY DEFINER functions.
- [ ] Review function execution privileges.
- [ ] Review storage policies.
- [ ] Review sensitive user data exposure.
- [ ] Review foreign keys.
- [ ] Review integrity constraints.
- [ ] Add required policies.
- [ ] Verify application behavior after policy changes.
- [ ] Run Supabase advisors.
- [ ] Run security regression tests.

### Critical baseline note

The live database currently has RLS enabled on many application tables, but the focused policy audit found no actual policies. This must be treated as a high-priority security workstream rather than assumed complete.

---

# Pass 14 — Cross-Platform Coordination

**Status:** ⬜

### Tasks

- [ ] Citizen → NGO.
- [ ] NGO → Citizen.
- [ ] NGO → Government.
- [ ] NGO → Hospital/Clinic.
- [ ] NGO → Volunteer.
- [ ] NGO → Foster.
- [ ] NGO → Responder.
- [ ] Verify cross-platform actions do not bypass NGO authorization.
- [ ] Test escalation workflows.

---

# Pass 15 — Pawstice End-to-End Simulation

**Status:** ⬜

### Actors

- [ ] Pawstice admin.
- [ ] Rescue coordinator.
- [ ] Medical coordinator.
- [ ] Adoption coordinator.
- [ ] Finance.
- [ ] Volunteer.
- [ ] Vet.
- [ ] Foster.

### Scenario

- [ ] Create Pawstice.
- [ ] Verify Pawstice.
- [ ] Invite members.
- [ ] Accept invitations.
- [ ] Verify permissions.
- [ ] Create rescue.
- [ ] Assign coordinator.
- [ ] Assign volunteer.
- [ ] Coordinate transport.
- [ ] Add vet.
- [ ] Add medical record.
- [ ] Assign foster.
- [ ] Process adoption.
- [ ] Create expense.
- [ ] Approve expense.
- [ ] Schedule follow-up.
- [ ] Verify notifications.
- [ ] Verify audit trail.
- [ ] Attempt unauthorized operations.
- [ ] Attempt cross-NGO access.
- [ ] Add member to second NGO.
- [ ] Switch active NGO.
- [ ] Verify separate permissions.
- [ ] Remove member from Pawstice.
- [ ] Verify second NGO remains intact.
- [ ] Suspend Pawstice.
- [ ] Verify operational access is revoked.

---

# Pass 16 — Production Hardening

**Status:** ⬜

### Tasks

- [ ] Typecheck.
- [ ] Unit tests.
- [ ] Integration tests.
- [ ] Authorization tests.
- [ ] Multi-NGO tests.
- [ ] Security tests.
- [ ] Database verification.
- [ ] Build.
- [ ] Environment validation.
- [ ] Vercel deployment verification.
- [ ] Production smoke tests.
- [ ] Regression review.
- [ ] Performance review.

---

# Pass 17 — Final Acceptance

**Status:** ⬜

### Final checklist

- [ ] Specification fully reviewed.
- [ ] Tracker fully updated.
- [ ] All critical blockers resolved.
- [ ] All high-risk authorization issues resolved.
- [ ] Multi-NGO participation verified.
- [ ] NGO onboarding verified.
- [ ] Member lifecycle verified.
- [ ] Role matrix verified.
- [ ] Cross-NGO isolation verified.
- [ ] Core NGO workflows verified.
- [ ] Audit trail verified.
- [ ] Supabase security verified.
- [ ] Production build verified.
- [ ] Production deployment verified.
- [ ] Pawstice simulation passed.
- [ ] No known critical/high security defects remain.

---

# Change Log

## 2026-10-06 — Heavy Work Block 4

- Audited the remaining NGO operational API surface instead of assuming it was unimplemented.
- Confirmed campaign, event, expense, shelter, foster, volunteer, task, follow-up, document, report and dashboard reads are NGO-scoped at the application layer.
- Added dependency ownership checks for follow-ups, foster assignments, task links, case comments and animal documents.
- Added active-NGO assignee validation for tasks.
- Corrected dashboard/report analytics to use explicit `welfare_group_id` ownership rather than inferred caretaker/assignee membership.
- Fixed member self-deactivation/removal checks to compare the target member's `user_id`, not the membership-row ID.
- Protected organization-document writes with the existing settings permission.
- Re-ran Supabase security advisors: the remaining finding is the existing 84-table RLS-enabled/no-policy inventory; no additional advisor finding is currently returned.
- Started a Vercel preview deployment from `feature/ngo-hardening`; it was still queued at the latest check, so build success is not claimed.


## 2026-10-06 — Heavy Work Block 3

- Extended explicit organization ownership into medical history and recovery/foster records.
- Scoped animal detail, medical-history, and vaccination APIs to the active NGO.
- Enforced medical permission for NGO medical writes and blocked cross-organization case references.
- Scoped recovery/foster reads and writes to active NGO ownership and validated linked animal ownership.
- Hardened the `ward_animal_summary` view with `security_invoker`.
- Removed public execution of the custom `rls_auto_enable()` SECURITY DEFINER function.
- Fixed mutable `search_path` on two trigger functions.
- Re-ran Supabase security advisors; remaining baseline items include 84 RLS-no-policy findings, `spatial_ref_sys` RLS disabled, public PostGIS extension, and three PostGIS `st_estimatedextent` SECURITY DEFINER functions whose extension-managed grants remain unresolved.


## 2026-10-06 — Heavy Work Block 2

- Added explicit `welfare_group_id` ownership columns to animals, cases, adoption applications, and vaccinations.
- Added the live `organization_invitations` lifecycle with hashed one-time tokens, seven-day expiry, acceptance and revocation.
- Replaced NGO member temporary-password creation with invitation creation.
- Added invitation listing and acceptance endpoints.
- Expanded server-derived NGO permissions with animals, medical, and adoption scopes.
- Scoped core NGO case, animal, and adoption APIs to active organization ownership.
- Safely backfilled only provable single-NGO legacy ownership; live baseline records remained unowned because their organization relationship could not be established safely.
- Ran Supabase security advisors after DDL; existing RLS-without-policy findings remain intentionally unresolved pending a policy design pass.


## 2026-10-06 — Heavy Work Block 1\n\n- Added centralized NGO role/permission profiles.\n- Added explicit active-organization context through `X-Finding-Astro-Org-Id`.\n- Added multi-NGO selection for organization workspace users.\n- Removed the previous single-membership `maybeSingle()` assumption from NGO context resolution.\n- Made member permissions server-derived from the selected organization role.\n- Added initial protection for final organization admins and self-deactivation.\n- Changed new NGO signup to pending verification instead of immediate operational access.\n- Unified verification approval with the existing pending organization and membership.\n- Added role-permission regression tests.\n\n## 2026-10-06 — Initial baseline

- Created NGO Hardening Specification.
- Created NGO Hardening Tracker.
- Captured current role model.
- Captured current permission model.
- Captured multi-NGO requirements.
- Captured onboarding/verification requirements.
- Captured member lifecycle requirements.
- Captured operational NGO workflows.
- Captured cross-NGO security requirements.
- Captured Supabase security requirements.
- Defined Pawstice end-to-end acceptance scenario.

---

# Progress Update Protocol

After every implementation pass:

1. Update the relevant pass status.
2. Check completed tasks.
3. Record tests run.
4. Record files/migrations changed.
5. Record unresolved issues.
6. Record blockers.
7. Record the next pass.
8. Do not mark a pass complete until its exit criteria are verified.

