# Finding Astro — NGO Workspace Hardening & Production Readiness Specification

**Project:** Finding Astro  
**Repository:** Jason45Builders/Finding-Astro  
**Primary branch:** master  
**Program:** NGO Workspace Hardening  
**Status:** Planned / Baseline captured  
**Owner:** Engineering implementation by ChatGPT, with user intervention only when an external credential, legal/business decision, or unavailable integration is required.

---

## 1. Objective

Make the NGO portion of Finding Astro production-ready for a real animal-welfare organization such as **Pawstice**.

A verified NGO must be able to:

1. Create and verify its organization.
2. Have multiple members participate in the same NGO.
3. Allow one person to participate in multiple NGOs without data leakage or role collision.
4. Give each member an appropriate NGO role and permissions.
5. Coordinate rescue cases, animals, medical care, volunteers, foster care, adoption, tasks, events, finance, documents and follow-ups.
6. Coordinate with citizens, responders, hospitals/vets, government and other platform actors.
7. Maintain strict organization-level data isolation.
8. Produce an auditable history of important actions.
9. Continue functioning correctly when members join, leave, are suspended, change roles, or belong to multiple organizations.
10. Pass a complete end-to-end Pawstice simulation.

This specification is the source of truth for the implementation. The tracker is the source of truth for progress.

---

# 2. Current Architecture Baseline

## Platform roles

- citizen
- ngo
- hospital
- govt
- admin
- guest_system

## Organization roles

- org_admin
- rescue_coordinator
- medical_coordinator
- adoption_coordinator
- finance
- volunteer
- vet
- foster

## Current organization permissions observed

- campaigns:write
- cases:write
- events:write
- expenses:write
- expenses:approve
- followups:write
- foster:write
- members:write
- reports:write
- settings:write
- shelters:write
- tasks:write
- volunteers:write

## Critical baseline findings already identified

1. NGO signup currently creates an operational NGO account before verification.
2. NGO signup and NGO verification are separate onboarding paths.
3. Organization role selection does not automatically establish a complete permission profile.
4. A member with members:write can potentially modify roles/permissions too broadly.
5. Arbitrary wildcard permissions must not be client-controlled.
6. Current organization context assumes one active membership and is not a proper multi-NGO model.
7. Member creation uses temporary credentials rather than a proper invitation/acceptance lifecycle.
8. Some organization workflows need stronger related-record ownership checks.
9. Dashboard aggregation can mix organization data if multi-organization membership is introduced without explicit scoping.
10. Live Supabase currently has RLS enabled on many app tables but the focused policy audit found no actual RLS policies; API authorization is therefore currently the primary security boundary and must be hardened accordingly.
11. The system has a substantial NGO feature surface already; this program is primarily about making that surface coherent, secure, correctly scoped and operational end-to-end rather than rebuilding the entire NGO product from zero.

---

# 3. Target Authorization Architecture

## 3.1 Separate platform identity from organization membership

A user's global platform role and their membership in a particular NGO must not be treated as the same concept.

A user can:

- be a citizen on the platform and a volunteer in NGO A;
- be a vet in NGO A and a volunteer/foster in NGO B;
- belong to multiple NGOs with different roles;
- leave NGO A without losing access to NGO B.

Organization membership is the authoritative source for organization-scoped capabilities.

Platform roles remain authoritative for platform-wide privileged operations.

## 3.2 Active organization context

Every organization-scoped operation must resolve an explicit organization context.

The context must:

- identify the active organization;
- verify the authenticated user is an active member/admin of that organization;
- never infer organization solely from an arbitrary resource ID;
- prevent a stale organization context from being reused after membership changes;
- support switching organizations;
- be consistently enforced by frontend and backend.

## 3.3 Permission profiles

Permissions should be derived from server-controlled role profiles.

The client must not be trusted to submit arbitrary permissions.

Recommended baseline:

| Organization Role | Primary Scope |
|---|---|
| org_admin | Full organization administration |
| rescue_coordinator | Cases, rescue operations, assignments, tasks, operational follow-up |
| medical_coordinator | Medical records, treatment workflows, animals, medical follow-up |
| adoption_coordinator | Adoption, animals, applications, follow-up |
| finance | Expenses, approvals where authorized, financial reports |
| volunteer | Assigned tasks/cases/events and permitted collaboration |
| vet | Medical records and treatment operations |
| foster | Assigned foster animals and foster follow-up |

Exact permissions must be finalized during implementation after route/schema audit.

## 3.4 Privilege hierarchy

Server-side rules must prevent:

- self-promotion to org_admin;
- arbitrary wildcard grants;
- promotion of another member above the actor's authority;
- removal of the final org administrator;
- changing membership state without appropriate permission;
- granting permissions unavailable to the actor;
- using client-supplied permissions to bypass role policy.

---

# 4. Workstream A — NGO Onboarding & Verification

## Requirements

- One canonical NGO onboarding flow.
- Registration data validation.
- Registration number handling.
- NGO type.
- Address/contact details.
- Supporting documents.
- Verification status.
- Approval/rejection.
- Rejection reason.
- Resubmission.
- Suspension/deactivation.
- Clear pending state.
- No full operational access before verification unless deliberately designed as a restricted onboarding state.
- Existing direct signup and verification routes must be reconciled.

## Acceptance

A new Pawstice organization cannot accidentally become a fully operational verified NGO merely by completing public signup.

---

# 5. Workstream B — Multi-NGO Membership

## Requirements

- One user may have many organization memberships.
- Each membership stores its own role.
- Each membership stores its own active/inactive state.
- Each membership stores its own organization permissions.
- NGO A membership must never alter NGO B membership.
- Active organization switcher.
- Backend requires organization context.
- Removal from NGO A leaves NGO B intact.
- Role change in NGO A leaves NGO B intact.
- Notifications must identify the relevant NGO.
- Dashboard data must be scoped to the active NGO.

## Acceptance

A test user can belong to Pawstice and another NGO simultaneously with different roles and can switch between them without cross-contamination.

---

# 6. Workstream C — Member Invitations & Lifecycle

## Requirements

- Invite by email.
- Invitation record.
- Inviter.
- Organization.
- Proposed role.
- Invitation status.
- Expiry.
- Secure one-time acceptance token.
- Accept invitation.
- Set password/authentication.
- Activate membership.
- Resend invitation.
- Revoke invitation.
- Suspend member.
- Reactivate member.
- Remove member.
- Leave organization.
- Prevent accidental deletion of user identity when only membership should be removed.

## Acceptance

NGO administrators never need to copy a temporary password to a member manually.

---

# 7. Workstream D — Organization Role & Permission System

## Requirements

- Canonical permission constants.
- Canonical role profiles.
- Server-side role-to-permission mapping.
- Read/write/approve separation where needed.
- No arbitrary client wildcard.
- Safe custom permission support only if explicitly required.
- Permission evaluation centralized in reusable authorization utilities.
- Every organization endpoint audited against the matrix.

## Acceptance

Each organization role can perform exactly the intended operations and cannot escalate itself or another member.

---

# 8. Workstream E — Member Administration

## Requirements

- Member directory.
- Role display.
- Membership status.
- Permissions summary.
- Invitation status.
- Last activity where available.
- Role change.
- Suspend/reactivate.
- Remove.
- Controlled transfer of responsibilities.
- Protection of final org_admin.
- Audit events for sensitive member changes.

---

# 9. Workstream F — Case & Rescue Coordination

## Requirements

- NGO access to appropriate cases.
- Case claiming/assignment.
- Rescue coordinator workflow.
- Member assignment.
- Responder assignment.
- Case comments.
- Case status changes.
- Escalation.
- Case ownership.
- Cross-NGO isolation.
- Related-record validation.
- Rescue activity/audit history.

## Acceptance

A Pawstice rescue coordinator can receive a case, assign the correct member, coordinate the response and complete the case without another NGO gaining access.

---

# 10. Workstream G — Animal Management

## Requirements

- Organization ownership.
- Animal registration.
- Rescue linkage.
- Case linkage.
- Assignment.
- Medical linkage.
- Foster linkage.
- Adoption linkage.
- Documents.
- History.
- Cross-NGO isolation.

---

# 11. Workstream H — Medical Coordination

## Requirements

- Vet role.
- Medical coordinator role.
- Treatment records.
- Medical assignments.
- Medical documents.
- Follow-ups.
- Hospital/clinic coordination.
- Authorization by organization and role.

---

# 12. Workstream I — Volunteer Coordination

## Requirements

- Volunteer onboarding.
- Organization membership.
- Volunteer role.
- Availability.
- Assignment.
- Tasks.
- Events.
- Case participation.
- Activity tracking.
- Multiple-NGO participation.

---

# 13. Workstream J — Foster Coordination

## Requirements

- Foster onboarding.
- Foster assignment.
- Animal handover.
- Foster status.
- Follow-up.
- Organization isolation.
- Appropriate foster permissions.

---

# 14. Workstream K — Adoption Coordination

## Requirements

- Adoption coordinator.
- Applications.
- Review.
- Approval/rejection.
- Applicant communication.
- Animal handover.
- Follow-up.
- Organization ownership.

---

# 15. Workstream L — Tasks & Operational Work

## Requirements

- NGO tasks.
- Assignment.
- Reassignment.
- Priority.
- Due date.
- Status.
- Completion.
- Role-based creation.
- Notifications.
- Audit trail.

---

# 16. Workstream M — Events & Campaigns

## Requirements

- NGO event ownership.
- Campaign ownership.
- Member participation.
- Volunteer participation.
- Role-based management.
- Cross-NGO isolation.
- Activity history.

---

# 17. Workstream N — Finance

## Requirements

- Expense creation.
- Expense approval.
- Creator/approver separation where required.
- Finance role.
- Financial reports.
- Campaign finance linkage.
- Audit trail.
- Cross-NGO isolation.

---

# 18. Workstream O — Shelters

## Requirements

- Shelter ownership.
- Capacity.
- Animal allocation.
- Staff/member access.
- Shelter operations.
- Cross-NGO isolation.

---

# 19. Workstream P — Documents & Evidence

## Requirements

- NGO documents.
- Verification documents.
- Animal documents.
- Case evidence.
- Access control.
- Organization ownership.
- Secure storage access.
- Audit trail.

---

# 20. Workstream Q — Reports & Analytics

## Requirements

- Rescue metrics.
- Animal metrics.
- Adoption metrics.
- Medical metrics.
- Volunteer metrics.
- Foster metrics.
- Finance metrics.
- Campaign metrics.
- Impact reporting.
- Strict active-NGO scoping.

---

# 21. Workstream R — Follow-Ups

## Requirements

- Animal follow-ups.
- Adoption follow-ups.
- Medical follow-ups.
- Assigned member.
- Due dates.
- Completion.
- Escalation.
- Notifications.
- Organization isolation.

---

# 22. Workstream S — Notifications & Coordination

## Requirements

Notifications for:

- Member invitations.
- Invitation acceptance.
- Role changes.
- Case assignments.
- Task assignments.
- Case comments.
- Medical updates.
- Adoption updates.
- Foster updates.
- Follow-up reminders.
- Expense approvals.
- Administrative changes.

Every notification must identify the relevant organization where applicable.

---

# 23. Workstream T — Audit Trail

Audit sensitive operations including:

- NGO creation.
- NGO verification.
- NGO suspension.
- Member invitation.
- Invitation acceptance.
- Member removal.
- Role changes.
- Permission changes.
- Case changes.
- Animal changes.
- Medical changes.
- Adoption decisions.
- Foster assignments.
- Financial approvals.
- Document changes.
- Administrative changes.

Audit records must identify actor, organization, target, action, timestamp and useful before/after context where appropriate.

---

# 24. Workstream U — Cross-Organization Security

Every organization-scoped resource must be checked for organization ownership.

Audit at minimum:

- cases
- animals
- animal documents
- medical records
- follow-ups
- tasks
- events
- campaigns
- expenses
- shelters
- volunteers
- foster records
- adoption records
- comments
- reports
- documents
- notifications
- memberships

No endpoint may trust a client-supplied organization ID without verifying membership and resource ownership.

---

# 25. Workstream V — Supabase Security

Audit and harden:

- RLS status.
- RLS policies.
- table grants.
- views.
- functions.
- SECURITY DEFINER functions.
- storage policies.
- sensitive user data exposure.
- foreign keys.
- constraints.
- database functions used for authorization.
- Data API exposure.

RLS should be used as defense in depth where appropriate. API-layer authorization must remain correct because the current application uses privileged server-side Supabase access.

---

# 26. Workstream W — Platform ↔ NGO Coordination

Validate:

- Citizen → NGO case/report.
- NGO → Citizen updates.
- NGO → Government escalation.
- NGO → Hospital/clinic.
- NGO → Volunteer.
- NGO → Foster.
- NGO → Responder.
- NGO → other platform actors.

The organization boundary must remain intact while legitimate cross-platform coordination remains possible.

---

# 27. Workstream X — Identity & Trust

Review:

- platform identity.
- NGO verification.
- verified NGO state.
- member identity.
- vet verification.
- hospital/clinic identity.
- government identity.
- identity tiers.
- role assignment.
- suspension/ban interactions.

No identity or role should be granted merely because a client supplies a role value.

---

# 28. Workstream Y — NGO Offboarding

Support:

- NGO suspension.
- NGO deactivation.
- Member access revocation.
- Active case reassignment.
- Pending task reassignment.
- Data retention rules.
- Administrative ownership.
- Reopening/reactivation where appropriate.

---

# 29. Workstream Z — End-to-End Pawstice Acceptance Test

Create a realistic test scenario:

### Organization

**Pawstice**

### Members

- Pawstice Admin
- Rescue Coordinator
- Medical Coordinator
- Adoption Coordinator
- Finance Member
- Volunteer
- Vet
- Foster Coordinator

### Scenario

1. Create Pawstice.
2. Submit verification.
3. Approve Pawstice.
4. Create/invite members.
5. Members accept invitations.
6. Verify role-specific access.
7. Create a rescue case.
8. Assign rescue coordinator.
9. Assign volunteer.
10. Coordinate transport.
11. Assign vet.
12. Add medical record.
13. Assign foster.
14. Process adoption.
15. Create expense.
16. Approve expense.
17. Schedule follow-up.
18. Send/receive notifications.
19. Generate report.
20. Review audit trail.
21. Attempt unauthorized actions.
22. Attempt cross-NGO access.
23. Add one member to a second NGO.
24. Switch active NGO.
25. Repeat access checks.
26. Remove member from Pawstice.
27. Confirm second NGO membership remains intact.
28. Suspend Pawstice.
29. Confirm operational access is revoked.
30. Confirm authorized platform administrators retain appropriate control.

---

# 30. Testing Strategy

Every implementation pass must include appropriate verification:

- TypeScript/typecheck.
- Unit tests.
- Authorization tests.
- Database tests.
- Integration tests.
- Multi-organization tests.
- Regression tests.
- Build verification.
- Production configuration verification where relevant.

Security-sensitive changes must include both positive and negative tests.

Positive:
- authorized action succeeds.

Negative:
- unauthorized action fails.

Isolation:
- organization A cannot access organization B's resources.

---

# 31. Definition of Done

The NGO program is complete only when:

- all workstreams are implemented or explicitly marked not applicable;
- every organization role has documented behavior;
- every organization endpoint has an authorization decision;
- multi-NGO membership works;
- active organization switching works;
- onboarding/verification is coherent;
- invitations work;
- member lifecycle works;
- privilege escalation is blocked;
- cross-NGO access tests pass;
- sensitive operations are auditable;
- core NGO workflows pass end-to-end;
- Supabase security review passes;
- typecheck/tests/build pass;
- production deployment is verified;
- Pawstice acceptance simulation passes.

A feature is **not** considered complete merely because its UI exists.

---

# 32. Implementation Rules

1. Inspect before modifying.
2. Prefer small, coherent implementation batches.
3. Do not rewrite functioning systems without evidence.
4. Preserve existing user-facing functionality unless security or architecture requires change.
5. Do not create duplicate authorization logic.
6. Centralize permission definitions.
7. Never trust client-supplied organization IDs, roles or permissions.
8. Never claim a security fix without a verification test.
9. Update the tracker after every completed pass.
10. Record blockers explicitly.
11. Do not deploy repeatedly just to check intermediate work; batch deployment verification where practical.
12. If an external service requires the user's credentials, business verification, Meta/WhatsApp setup, domain configuration, legal approval or similar human action, stop at the boundary and ask the user.
13. If another AI/tool would materially improve implementation, identify exactly what input is needed rather than silently assuming it.
14. Keep this specification and the tracker current as architecture evolves.

---

# 33. Pass Structure

### Pass 0 — Baseline
Repository, database, routes, roles, permissions, current security posture.

### Pass 1 — Authorization Architecture
Central role/permission model and organization context.

### Pass 2 — Multi-NGO Membership
Multiple memberships, active NGO selection, isolation.

### Pass 3 — NGO Onboarding & Verification
Canonical onboarding and verified/pending lifecycle.

### Pass 4 — Invitations & Member Lifecycle
Invitation, acceptance, suspension, removal, reactivation.

### Pass 5 — Member Administration & Privilege Security
Hierarchy, role changes, permission protection, final-admin protection.

### Pass 6 — Case & Rescue Coordination
Case ownership, assignments, comments, rescue workflow.

### Pass 7 — Animals & Medical
Animal ownership, medical roles, records and access.

### Pass 8 — Volunteers, Foster & Tasks
Operational staffing and assignment workflows.

### Pass 9 — Adoption & Follow-Ups
Adoption lifecycle and follow-up coordination.

### Pass 10 — Finance, Campaigns, Events & Shelters
Operational administration.

### Pass 11 — Documents, Reports & Notifications
Information, communication and reporting.

### Pass 12 — Audit Trail
Security and operational auditability.

### Pass 13 — Supabase Security
RLS, grants, functions, storage and database integrity.

### Pass 14 — Cross-Platform Coordination
Citizen/government/hospital/responder interactions.

### Pass 15 — End-to-End Pawstice Simulation
Full realistic NGO workflow.

### Pass 16 — Production Hardening
Tests, build, deployment, regression, performance and final security review.

### Pass 17 — Final Acceptance
Definition-of-done verification and production sign-off.

---

# 34. Escalation / User Assistance Rules

The implementation should proceed autonomously whenever the repository, connected GitHub, Supabase and Vercel access are sufficient.

Ask the user only when:

- a credential/secret cannot be accessed through the connected integrations;
- a third-party verification must be completed by the account owner;
- a legal/compliance/business policy requires a human decision;
- a destructive action requires explicit approval;
- product behavior has multiple materially different interpretations;
- an external service cannot be accessed by available tools.

When asking, provide the exact action required from the user and then resume the program from the tracker.

---

# 35. Final Principle

**Pawstice must be able to operate as a real NGO inside Finding Astro, not merely have an NGO dashboard.**

The target is a secure multi-organization operating system where people, roles, cases, animals, medical work, volunteers, foster care, adoption, finance and coordination all work together while maintaining strict organizational boundaries.
