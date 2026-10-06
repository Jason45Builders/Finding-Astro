# Finding Astro — NGO Hardening Progress Tracker

**Specification:** `docs/FINDING-ASTRO-NGO-HARDENING-SPEC.md`  
**Repository:** `Jason45Builders/Finding-Astro`  
**Branch:** `master`  
**Program status:** 🟡 IN PROGRESS  
**Last updated:** 2026-10-06

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
| 1 | Authorization Architecture | ⬜ | Pending |
| 2 | Multi-NGO Membership | ⬜ | Pending |
| 3 | NGO Onboarding & Verification | ⬜ | Pending |
| 4 | Invitations & Member Lifecycle | ⬜ | Pending |
| 5 | Member Administration & Privilege Security | ⬜ | Pending |
| 6 | Case & Rescue Coordination | ⬜ | Pending |
| 7 | Animals & Medical | ⬜ | Pending |
| 8 | Volunteers, Foster & Tasks | ⬜ | Pending |
| 9 | Adoption & Follow-Ups | ⬜ | Pending |
| 10 | Finance, Campaigns, Events & Shelters | ⬜ | Pending |
| 11 | Documents, Reports & Notifications | ⬜ | Pending |
| 12 | Audit Trail | ⬜ | Pending |
| 13 | Supabase Security | ⬜ | Pending |
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

- [ ] Define canonical organization permission constants.
- [ ] Define role-to-permission profiles.
- [ ] Centralize permission evaluation.
- [ ] Define platform-role vs organization-role boundaries.
- [ ] Define active organization context.
- [ ] Define authorization failure semantics.
- [ ] Audit all org routes against the matrix.
- [ ] Remove client authority over arbitrary permissions.
- [ ] Add authorization unit tests.
- [ ] Add privilege-escalation tests.

### Exit criteria

- [ ] Every organization role has a documented permission profile.
- [ ] Server is authoritative for role/permission decisions.
- [ ] No arbitrary client wildcard grants.
- [ ] Authorization tests pass.

---

# Pass 2 — Multi-NGO Membership

**Status:** ⬜

### Tasks

- [ ] Support multiple memberships per user.
- [ ] Define active organization context.
- [ ] Implement organization switching.
- [ ] Scope API requests to active organization.
- [ ] Scope dashboard data.
- [ ] Scope notifications.
- [ ] Scope member permissions.
- [ ] Prevent membership collision.
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

- [ ] Reconcile public NGO signup and verification.
- [ ] Define pending state.
- [ ] Define verified state.
- [ ] Define rejected state.
- [ ] Define suspended state.
- [ ] Prevent premature operational access.
- [ ] Preserve approved organization identity.
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

- [ ] Invitation persistence.
- [ ] Secure one-time token.
- [ ] Expiration.
- [ ] Acceptance.
- [ ] Password setup.
- [ ] Resend.
- [ ] Revoke.
- [ ] Suspend.
- [ ] Reactivate.
- [ ] Remove.
- [ ] Leave NGO.
- [ ] Prevent accidental global-user deletion.
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

- [ ] Case organization ownership.
- [ ] Case access matrix.
- [ ] Case assignment.
- [ ] Rescue coordinator workflow.
- [ ] Responder assignment.
- [ ] Comments.
- [ ] Status transitions.
- [ ] Escalation.
- [ ] Cross-NGO protection.
- [ ] Audit events.
- [ ] Integration tests.

### Exit criteria

- [ ] Pawstice can receive, assign, coordinate and close a rescue case.
- [ ] Unauthorized NGO cannot access the case.

---

# Pass 7 — Animals & Medical

**Status:** ⬜

### Tasks

- [ ] Animal organization ownership.
- [ ] Animal access matrix.
- [ ] Animal assignments.
- [ ] Case linkage.
- [ ] Medical linkage.
- [ ] Vet permissions.
- [ ] Medical coordinator permissions.
- [ ] Medical records.
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

- [ ] Adoption coordinator permissions.
- [ ] Application workflow.
- [ ] Review.
- [ ] Approval/rejection.
- [ ] Handover.
- [ ] Follow-up.
- [ ] Medical/adoption coordination.
- [ ] Cross-NGO protection.

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

## 2026-10-06 — Initial baseline

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

