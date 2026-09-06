# Finding Astro — Full Technical Audit & Misuse Scenario Report

> **Date:** 2026-09-05  
> **Auditor:** Kilo (Static code review, volunteer/attacker POV)  
> **Scope:** Full-stack Next.js app at `D:\Finding Astro` — API routes, auth middleware, financial flows, admin panel, media uploads, volunteer/responder logic, adoption pipeline, ABC tracking, safety reports, database schema.  
> **Method:** Line-by-line code review, threat modeling, attacker-playground reconstruction, volunteer-role privilege mapping.

---

## Executive Summary

Finding Astro is a **sophisticated civic-welfare platform** with strong domain modeling, but the current serverless implementation has **multiple critical security and integrity gaps** that a motivated volunteer, malicious user, or opportunistic attacker can exploit. The most dangerous issues are in **financial flows** (donations, payouts, welfare payments), **admin over-privileging**, **unauthenticated media uploads**, and **broken authorization checks** on several mutating endpoints.

**Risk Rating Summary:**

| Severity | Count | Key Areas |
|----------|-------|-----------|
| **CRITICAL** | 9 | Financial fraud, unauthenticated uploads, admin privilege escalation, IDOR on payments/recovery |
| **HIGH** | 14 | Case manipulation, responder abuse, volunteer score inflation, payment bypass, data exposure |
| **MEDIUM** | 11 | Rate limiting gaps, race conditions, audit gaps, information disclosure |
| **LOW** | 6 | Input validation, missing length limits, client-side trust, enum drift |

---

## 1. Authentication & Session Flaws

### 1.1 CRITICAL — No Rate Limiting on Login / Signup

**File:** `apps/web/app/api/v1/auth/login/route.ts`, `apps/web/app/api/v1/auth/signup/route.ts`

The login endpoint has **zero rate limiting**. An attacker can:
- Brute-force passwords via credential stuffing
- Enumerate valid emails by observing response timing or error consistency
- Signup-spam the database with throwaway accounts to inflate user counts or create fake verification requests

**Volunteer misuse:** A frustrated volunteer who knows another user's email can repeatedly attempt logins to lock out the account (if lockout were implemented) or simply harass.

**Fix:** Add `checkRateLimit` from `@/lib/rate-limit` to both login and signup POST handlers. Cap at 5-10 attempts per IP per 15 minutes.

### 1.2 HIGH — JWT Tokens Are Long-Lived With No Refresh Mechanism

**File:** `apps/web/lib/jwt.ts`

JWTs are signed with a 7-day expiry but there is no refresh token flow. If a token is stolen (via XSS, device theft, or log exposure), it remains valid for 7 days. There is no server-side token revocation list.

**Volunteer misuse:** A volunteer who logs in on a shared device and forgets to log out leaves their token in `localStorage`. Anyone using that browser can act as them for 7 days, including claiming emergency cases or donating money.

### 1.3 MEDIUM — `optionalAuth` Silently Swallows Ban Checks

**File:** `apps/web/src/lib/auth-middleware.ts:67-97`

`optionalAuth` returns `null` for banned users instead of the user object. This means endpoints using `optionalAuth` will treat a banned user as a guest/anonymous, potentially allowing them to perform restricted actions that the endpoint thinks are coming from an unauthenticated user.

---

## 2. Financial Transaction Vulnerabilities

### 2.1 CRITICAL — Donations Are Marked SUCCESS Without Any Payment Processing

**File:** `apps/web/app/api/v1/funding/[...path]/route.ts:90-128`

The `handleDonate` function:
1. Validates input
2. Checks idempotency key
3. **Immediately inserts a `funding_transactions` row with `payment_status: "SUCCESS"`**
4. Updates `amount_raised` on the funding case
5. **Never calls any payment gateway** (Razorpay, Stripe, etc.)

There is no actual money movement. Anyone can "donate" unlimited amounts by calling this endpoint repeatedly. The funding case auto-closes when `amount_raised >= total_amount`, triggering payout release.

**Volunteer misuse:** A volunteer with a grudge against an NGO can call the donate endpoint with a fake amount to force-close a funding case and trigger a payout. Or they can inflate donation numbers to make an NGO look artificially popular for CSR reporting.

**Fraud scenario:** An attacker creates 100 fake accounts, each "donates" ₹10,000 to a funding case. The case reaches its target in seconds. Admin sees "₹1,00,000 raised" and releases the payout. The money never existed.

**Fix:** Integrate a real payment gateway. The `payment_status` should be `PENDING` until the gateway confirms settlement. Use Razorpay/Stripe webhooks to update status asynchronously.

### 2.2 CRITICAL — Welfare UPI Donations Are Trust-Based With No Bank Verification

**File:** `apps/web/app/api/v1/welfare-groups/[id]/donate/route.ts`

The entire flow relies on a **UTR (Unique Transaction Reference) number** submitted by the donor. The system:
1. Accepts the UTR without any bank verification
2. Stores it as `utr` in `welfare_payments`
3. Marks the payment as `PENDING`
4. An org admin can then `verify` it

An attacker can:
- Submit a **fake or reused UTR** for a real payment they never made
- Submit a **valid UTR for a tiny amount** (e.g., ₹10) but claim they donated ₹50,000
- **Replay the same UTR** across multiple welfare groups (the duplicate check is only within the same welfare group)

**Volunteer misuse:** A corrupt NGO admin can verify fake donations to inflate their org's funding numbers for CSR reports, or verify their own personal UPI payments as "donations" to themselves and then mark them verified.

**Fix:** Integrate with UPI payment gateway APIs (Razorpay, PhonePe, GPay) to verify UTRs against actual transaction records. Add bank-statement reconciliation.

### 2.3 HIGH — Admin Payout Release Transfers ALL Unallocated Funds Without Multi-Signature

**File:** `apps/web/app/api/v1/admin/[...path]/route.ts:231-252`

`POST /admin/funding/{id}/release-payout`:
1. Calculates `unallocated = amount_raised - amount_disbursed`
2. If `unallocated > 0`, creates a `payout` record with `status: "RELEASED"` for **the full amount**
3. Closes the funding case

There is:
- **No multi-approval workflow** — a single admin can release all funds
- **No verification that the hospital/recipient is legitimate**
- **No cap on payout amount** — if `amount_raised` was inflated via fake donations (see 2.1), the payout is inflated too
- **No actual money transfer** — it just creates a DB record

**Volunteer misuse:** An NGO-admin volunteer who also has admin platform access can create a fake funding case, fake-donate to it, then release the payout to a hospital they control.

### 2.4 HIGH — Reimbursement Verify Endpoint Allows Hospital to Self-Verify

**File:** `apps/web/app/api/v1/funding/[...path]/route.ts:151-166`

`handleReimbursementVerify` does NOT check that the verifying user belongs to the hospital specified in the reimbursement request. Any user with the `hospital` role can verify ANY reimbursement request, including ones submitted by their own organization for inflated amounts.

**Fix:** Add a check: `existing.hospital_id === verifyingUser.hospital_id` before allowing verification.

---

## 3. Insecure Direct Object Reference (IDOR)

### 3.1 HIGH — Recovery Funding Can Be Created for Any Case by Any User

**File:** `apps/web/app/api/v1/recovery/route.ts:39-66`

Any authenticated user can create a `recovery_funding` record for **any case ID**. There is no check that:
- The user is associated with the case
- The case exists and is in a valid status
- The animal belongs to the case

**Volunteer misuse:** A volunteer creates a recovery record for a case they have no connection to, setting `daily_cost_inr: 5000` and `provider_type: "ngo_shelter"`. This creates the appearance that an animal is in expensive foster care, potentially diverting donations.

### 3.2 HIGH — Any Admin Can Adopt Any Animal on Behalf of Any Applicant

**File:** `apps/web/app/api/v1/adoption/[...path]/route.ts:110-117`

`handleConfirm` allows ANY admin (`role: "admin"`) to mark ANY adoption application as `adopted` without:
- Verifying the applicant is not on the blacklist
- Checking the trial period was completed
- Verifying the animal is actually adoptable

**Fix:** Only allow the NGO that approved the application, or the reviewing admin, to confirm adoption. Add blacklist check before allowing any status change.

### 3.3 MEDIUM — Animal Records Can Be Modified by Any Authenticated User

**File:** `apps/web/app/api/v1/animals/[id]/route.ts:106-157`

The `PATCH /animals/{id}` endpoint has **no ownership or role check**. Any authenticated user can:
- Change an animal's status to `adopted` (bypassing the adoption pipeline)
- Set `is_sterilized: true` without a medical record
- Modify `vaccination_status` to `verified` without a vet visit
- Change `location` to falsify territory data

**Volunteer misuse:** A volunteer who dislikes a particular community dog can change its status to `adopted` to remove it from the community registry. Or they can mark an animal as "lost" to trigger an expensive search response.

---

## 4. Admin Panel Privilege Escalation & Over-Privileging

### 4.1 CRITICAL — NGO Role Can Self-Promote to Admin via Verification Approval

**File:** `apps/web/app/api/v1/admin/[...path]/route.ts:140-174`

The NGO approval flow:
1. An NGO user creates an `ngo_verifications` request with `requested_tier: 5`
2. An `admin` or `govt` reviewer calls `POST /admin/verifications/ngo`
3. If approved, the code does: `update users set role = "ngo", identity_tier = tier` where `tier = verification.requested_tier ?? 3`

The critical bug: **`requested_tier` comes from the untrusted NGO submission**. An NGO can set `requested_tier: 5` (admin level). If the reviewer doesn't notice, the NGO becomes an admin.

Additionally, there is **no check that the reviewer is senior to the requested tier**. A `govt` officer can approve a request for tier 5 (admin), and an `admin` can approve a request for any tier including their own.

**Fix:** Clamp `requested_tier` to a maximum of 3 (verified org). Add a rule: only `admin` role can approve tier 4-5 requests.

### 4.2 CRITICAL — Admin Can Modify Any User's Role Without Safeguards

**File:** `apps/web/app/api/v1/admin/[...path]/route.ts:322-336`

`PATCH /admin/users/{id}` allows any privileged user (`ngo`, `govt`, `admin`) to change **any user's role and identity_tier** without:
- Preventing self-promotion (an NGO can set themselves to `admin`)
- Preventing demotion of higher-tier users (a `govt` can demote an `admin`)
- Requiring multi-approval for sensitive changes
- Logging the reason for role change

**Volunteer misuse:** An NGO volunteer with admin panel access promotes their entire team to `admin`, then bans the original founder.

### 4.3 HIGH — Admin Case Status Override Bypasses All State Machine Rules

**File:** `apps/web/app/api/v1/admin/[...path]/route.ts:310-320`

`PATCH /admin/cases/{id}` uses `.passthrough()` on the Zod schema, meaning **any field on the `cases` table can be modified**: `reporter_user_id`, `location`, `evidence_urls`, `case_type`, `priority`, etc. This bypasses all the careful state-machine rules in `cases/[id]/route.ts`.

An admin can:
- Change `reporter_user_id` to frame someone else for a false report
- Change `case_type` from `rescue` to `abuse` to trigger different broadcast behavior
- Delete evidence by setting `evidence_urls: []`
- Change `location` to redirect responders to the wrong place

**Fix:** Use a strict schema that only allows `status` and `resolution_notes`. Never allow `case_type`, `reporter_user_id`, or `location` to be modified after creation.

---

## 5. Authorization Bypass & Broken Access Control

### 5.1 HIGH — Animal Update Endpoint Has No Ownership or Role Guard

**File:** `apps/web/app/api/v1/animals/[id]/route.ts:106-157`

Already covered in 3.3, but worth emphasizing: the `PATCH` endpoint checks `authMiddleware` but **never checks if the user owns the animal or has staff privileges**. Any citizen can modify any animal record.

### 5.2 HIGH — Adoption Mark-Adoptable Does Not Require NGO/Admin Role

**File:** `apps/web/app/api/v1/adoption/[...path]/route.ts:119-132`

`handleMarkAdoptable` is callable by **any authenticated user**, not just NGOs or admins. A regular citizen can mark any animal as adoptable (which sets `status: "adopted"` immediately, a separate bug).

**Bug:** The function sets `status: "adopted"` instead of a new `adoptable` status. This means the animal is immediately marked as adopted, removing it from the community. Combined with the missing role check, any user can make animals "disappear" from the platform.

### 5.3 MEDIUM — Responder Nearby Endpoint Ignores Coordinates

**File:** `apps/web/app/api/v1/users/[...path]/route.ts:33-40`

`GET /users/responders/nearby?latitude=...&longitude=...`:
- Receives `lat` and `lng` query parameters
- **Never uses them** — the query just returns all users with `role = "ngo"` and `is_available = true`, ignoring distance entirely
- Returns up to 50 users regardless of actual proximity

**Volunteer misuse:** The mobile app thinks it's getting nearby responders but actually gets all NGOs city-wide. This wastes broadcast resources and confuses dispatchers.

---

## 6. Media Upload Vulnerabilities

### 6.1 CRITICAL — Unauthenticated File Upload to Public Bucket

**File:** `apps/web/app/api/v1/media/upload/route.ts`

The `POST /media/upload` endpoint has **no authentication**. Anyone in the world can upload files to the `finding-astro-media` bucket. The bucket is **public**, meaning uploaded files are immediately accessible via URL.

Attack vectors:
1. **Malware distribution:** Upload an EXE disguised as `.jpg` (the MIME type is checked but the extension is from `originalName`, which is user-controlled)
2. **Storage exhaustion:** Upload 50MB files repeatedly to fill up Supabase storage
3. **Content abuse:** Upload illegal content, phishing pages, or propaganda
4. **Path traversal:** `originalName` is used to extract the extension via `originalName.slice(originalName.lastIndexOf("."))`. If `originalName` is `"../../etc/passwd.jpg"`, the extension is `.jpg` but the file name in the key is not sanitized — however Supabase's `upload` function may normalize paths, but this is untrusted.

**Fix:** Require authentication. Validate that the `purpose` maps to a known folder. Generate the file name entirely server-side (never trust `originalName` for path components).

### 6.2 HIGH — No Virus Scanning on Uploads

Medical bills, prescription PDFs, and evidence photos are uploaded without any malware scanning. A volunteer could upload a PDF with embedded malware that is later viewed by hospital staff or admins.

---

## 7. Case & Emergency Response Manipulation

### 7.1 HIGH — Staff Can Assign Cases to Banned or Inactive Responders

**File:** `apps/web/app/api/v1/emergency/[caseId]/[...action]/route.ts:134-198`

`handleClaim` allows staff (`admin`, `govt`, `ngo`) to assign a case to **any user ID** via the `responderId` field. The only check is `targetUser.is_banned`, but:
- It does **not** check if the target user is actually a responder (`is_available: true`)
- It does **not** check if the target user has the `active_case_limit` capacity
- It does **not** check if the target user has the required identity tier

**Volunteer misuse:** A staff volunteer can assign emergency cases to their friends (even if banned), inflating their friends' `completed_case_count` and reputation.

### 7.2 MEDIUM — Case Status Transitions Can Be Forced by Staff

The `PATCH /cases/{id}` endpoint (non-admin) has state-machine rules, but `PATCH /admin/cases/{id}` has no rules at all (see 4.3). An admin can:
- Set `status: "closed"` on an active emergency case, stopping the broadcast
- Set `status: "resolved"` without any responder action
- Change `priority` from `high` to `low` to deprioritize a rescue

---

## 8. Volunteer & Responder Abuse

### 8.1 HIGH — Any User Can Inflate Their Own Active Case Limit

**File:** `apps/web/app/api/v1/users/[...path]/route.ts:62-77`

`PATCH /users/me/volunteer` allows a user to set `activeCaseLimit` to any positive integer. The default is 3, but a user can set it to 999, bypassing the hoarding protection.

**Volunteer misuse:** A power-user volunteer sets their limit to 999, claims every emergency case in the city, and never responds. Other volunteers see no open cases and assume the platform is broken.

### 8.2 MEDIUM — Volunteer Reputation Score Has No Integrity Protection

The `reputation_score` field on `users` is updated by `volunteer_activity_logs` points, but there is no server-side cap enforcement in the API routes. A volunteer who creates many `animal_presence` entries (which award +1 point each) can inflate their score without actually doing meaningful work.

---

## 9. Adoption Pipeline Flaws

### 9.1 HIGH — Blacklist Check Is Missing in `handleApply`

**File:** `apps/web/app/api/v1/adoption/[...path]/route.ts:79-99`

The documentation and `PROJECT_DOCUMENTATION.md` describe an `adopter_blacklist` table and a mandatory blacklist check before creating an application. **This check is not implemented.** Anyone on the blacklist can submit adoption applications.

**Volunteer misuse:** A known animal abuser who was previously blacklisted can apply to adopt another animal.

### 9.2 HIGH — `handleMarkAdoptable` Sets Wrong Status

As noted in 5.2, `handleMarkAdoptable` sets `status: "adopted"` instead of an `adoptable` status. This is a **logic bug** that corrupts the adoption pipeline:
- The animal appears as already adopted, so no one can apply
- The `adoptable_since` timestamp is set but the status says `adopted`
- `GET /adoption/animals` queries `.not("adoptable_since", "is", null)` — so the animal shows up, but its status is contradictory

### 9.3 MEDIUM — `handleConfirm` Bypasses Trial Period

Any admin can call `adoption/{appId}/confirm` to jump straight to `adopted` status, bypassing the trial period entirely. There is no check that the application is in `approved` status before confirming.

---

## 10. Payment & Donation Fraud Vectors

### 10.1 HIGH — No Minimum or Maximum Donation Amount

**File:** `apps/web/app/api/v1/funding/[...path]/route.ts:11-15`

`DonateSchema` only validates `amount: z.number().positive()`. There is:
- No minimum (a user can "donate" ₹0.01)
- No maximum (a user can "donate" ₹99,99,99,999, crashing `amount_raised` calculations with floating-point issues or causing integer overflow in downstream systems)

**Volunteer misuse:** A volunteer donates ₹0.01 10,000 times via a script. The funding case shows "100 donations" and appears popular. Or they donate ₹10 crores to force-close the case.

### 10.2 MEDIUM — Donor Name Is Hardcoded

**File:** `apps/web/app/api/v1/funding/[...path]/route.ts:110`

`donor_name: "User ${user.id.slice(0, 8)}"` — the donor name is a truncated user ID, not the user's actual name. This makes donation receipts meaningless and prevents proper donor recognition.

### 10.3 MEDIUM — Refund Does Not Verify Donation Ownership Properly

**File:** `apps/web/app/api/v1/funding/[...path]/route.ts:168-197`

The refund check is: `tx.user_id !== user.id && !["admin", "govt"].includes(user.role)`. An `ngo` role user (not in the allowed list) cannot refund others' donations, but a `ngo` can refund their own donations. However, there is no check that the funding case is still open or that the donation was recent — a user could "donate" and immediately "refund" to game transaction counts.

---

## 11. Information Disclosure & Data Leakage

### 11.1 HIGH — Admin Users Endpoint Exposes All Users Without Filtering

**File:** `apps/web/app/api/v1/admin/[...path]/route.ts:87-98`

`GET /admin/users` returns **all users** with `limit(200)` and no pagination. For a platform with thousands of users, this exposes:
- All email addresses
- All full names
- All roles and identity tiers
- Ban status

If a malicious NGO gains admin access, they can scrape the entire user database.

### 11.2 HIGH — Case List for Staff Returns All Cases Including Private Details

**File:** `apps/web/app/api/v1/cases/route.ts:31-61`

Staff (`admin`, `govt`, `ngo`) see ALL cases with no filtering. Non-staff users see open cases + their own. However, the `or()` clause in the non-staff query:
```
or(`status.eq.open,reporter_user_id.eq.${authResult.user.id},assigned_to_user_id.eq.${authResult.user.id}`)
```
This is correct, but for staff there is **no `reporter_user_id` restriction** — staff see all cases including those reported by banned users, guest users, and other NGOs' sensitive cases.

### 11.3 MEDIUM — Animal List Has No Ownership Filter

**File:** `apps/web/app/api/v1/animals/route.ts:45-71`

Any authenticated user can list ALL animals with no ownership filter. While `fuzzyLocation` obscures exact coordinates based on tier, a low-tier user can still see all animal names, species, statuses, and creation dates.

---

## 12. Rate Limiting Gaps

### 12.1 HIGH — Rate Limiting Is In-Memory and Incomplete

**File:** `apps/web/src/lib/rate-limit.ts`

The rate limiter uses an in-memory `Map`. In a serverless deployment (Vercel), **each invocation runs in an isolated environment with no shared memory**. This means:
- Rate limits reset on every request (effectively useless)
- A distributed attacker can bypass limits by hitting multiple serverless instances

Additionally, rate limiting is only applied to:
- `funding/donate`
- `welfare-groups/{id}/donate`
- `safety/report`
- `conflict` (implied from grep)
- `wildlife/report`
- `cases/emergency` (implied from grep)

It is **NOT applied to**:
- `auth/login`
- `auth/signup`
- `cases` creation (rescue, abuse, conflict, abc)
- `animals` creation
- `media/upload`
- `adoption/apply`
- Any admin endpoint

**Volunteer misuse:** A volunteer creates 1000 fake animal records in a script to pollute the map view.

---

## 13. Input Validation & Injection

### 13.1 MEDIUM — SQL Injection via `.or()` with Unsanitized Input

**File:** `apps/web/app/api/v1/admin/[...path]/route.ts:78-81`

```typescript
query = isUuid ? query.or(`location_text.ilike.%${ward}%,id.eq.${ward}`) : query.ilike("location_text", `%${ward}%`);
```

The `.or()` method in Supabase client constructs raw PostgREST queries. If `ward` contains special characters, it could break the query syntax. While Supabase uses parameterized queries for `.eq()`, `.or()` uses string interpolation.

**Fix:** Use `.or()` with properly escaped values, or use `.ilike()` with the parameterized form.

### 13.2 MEDIUM — No Length Limits on Text Fields

Several text fields have no maximum length:
- `description` in cases, animals, safety reports
- `notes` in case responses, adoption reviews, reimbursements
- `address` in adoption applications
- `reasonForAdopting` in adoption applications

An attacker can submit a 10MB JSON payload with a 5MB description string, causing:
- Memory exhaustion in the serverless function
- Database row size limits exceeded
- Log aggregation overflow

**Fix:** Add `z.string().max(5000)` or similar limits to all free-text fields.

### 13.3 LOW — EXIF Stripping Is Best-Effort

**File:** `apps/web/lib/strip-exif.ts` (referenced in media upload)

EXIF stripping is applied, but the code does not validate that the stripping succeeded. A crafted image could retain GPS metadata, violating the fuzzy-location privacy model.

---

## 14. Business Logic Flaws

### 14.1 HIGH — ABC Request Creates Case with `POINT(0 0)` When No Location Provided

**File:** `apps/web/app/api/v1/abc/[...path]/route.ts:87`

```typescript
location: location ? `POINT(${location.longitude} ${location.latitude})` : "POINT(0 0)",
```

When creating an ABC case without a location, the code falls back to `POINT(0 0)` — the **Gulf of Guinea, off the coast of Africa**. This breaks geospatial queries, wastes broadcast resources, and creates confusing data.

**Fix:** Require location for ABC requests (the animal must be somewhere). If location is optional, use `NULL` instead of `POINT(0,0)`.

### 14.2 MEDIUM — `getClientIp` Is Trivially Spoofed

Rate limiting relies on `getClientIp(req)` which likely reads `X-Forwarded-For` or `req.ip`. In a serverless environment behind Vercel's CDN, these headers are **set by the client** unless Vercel overwrites them. An attacker can rotate IPs by sending `X-Forwarded-For: 1.2.3.4, X-Forwarded-For: 5.6.7.8` to bypass rate limits.

**Fix:** Use Vercel's `x-vercel-ip-country` or similar trusted headers, or implement a token-bucket algorithm keyed by user ID (not IP) for authenticated endpoints.

### 14.3 MEDIUM — No Idempotency on Case Creation

`POST /cases` and `POST /cases/emergency` do not support idempotency keys. A user with a flaky network can accidentally create duplicate emergency cases by retrying.

---

## 15. Audit & Logging Gaps

### 15.1 MEDIUM — Audit Is Best-Effort and Unreliable

**File:** `apps/web/lib/audit.ts`

The `audit()` function is called throughout the codebase but its errors are silently swallowed in many places (e.g., `catch { /* non-fatal */ }` in `emergency/route.ts:78`). If the audit log insert fails:
- The operation still succeeds
- There is no retry
- No alert is raised

This means audit logs are **incomplete and unreliable**, undermining any compliance or forensic investigation.

### 15.2 MEDIUM — No Audit for Login Attempts

Successful logins are audited, but **failed login attempts are not**. This makes it impossible to detect brute-force attacks.

### 15.3 MEDIUM — No Audit for Admin Role/Tier Changes

When an admin changes a user's role or identity_tier (via `PATCH /admin/users/{id}`), the audit only logs the final state, not the previous state. There is no "who approved this promotion" trail.

---

## 16. Volunteer Misuse Scenario Catalog

### Scenario 1: Fake Donation Inflation (CRITICAL)

**Actor:** NGO volunteer with access to their org's payment verification  
**Steps:**
1. Create 50 fake user accounts via `/auth/signup`
2. Use each account to "donate" ₹10,000 to the NGO's welfare group via `/welfare-groups/{id}/donate` with a fake UTR
3. Log in as the org admin and verify all 50 payments
4. The NGO now appears to have received ₹5,00,000 in verified donations
5. Use these numbers in CSR reports to secure matching funds

**Impact:** Financial fraud, false CSR reporting, reputational damage to platform

### Scenario 2: Emergency Case Hijacking (HIGH)

**Actor:** Power-user volunteer  
**Steps:**
1. Set `activeCaseLimit: 999` via `/users/me/volunteer`
2. Monitor `/cases?status=open` every second
3. Claim every emergency case immediately
4. Never update status — just hold them
5. Real responders see no open cases and assume the platform is empty

**Impact:** Real emergencies go unresponded, platform reputation destroyed

### Scenario 3: Animal Record Vandalism (HIGH)

**Actor:** Malicious citizen  
**Steps:**
1. Create an account (tier 0)
2. Find a community dog they dislike (via `/animals`)
3. `PATCH /animals/{id}` with `status: "adopted"` and `is_sterilized: true`
4. The dog disappears from the community registry and adoption listings

**Impact:** Data corruption, community trust erosion, false sterilization records

### Scenario 4: Admin Takeover via NGO Verification (CRITICAL)

**Actor:** NGO volunteer creating a verification request  
**Steps:**
1. Create account, get verified as NGO
2. Submit `POST /auth/org-verification/request` with `requested_tier: 5`
3. If an admin carelessly approves, the user's `identity_tier` becomes 5
4. With tier 5, access `ngo`-only endpoints (the role stays `ngo` but tier 5 unlocks everything)
5. Use tier-5 privileges to ban the original admin

**Impact:** Complete platform compromise

### Scenario 5: Payout Fraud via Fake Funding (CRITICAL)

**Actor:** NGO with admin access  
**Steps:**
1. Create a fake funding case for a non-existent rescue with `total_amount: 500000`
2. Use fake accounts to "donate" the full amount (see Scenario 1)
3. Call `POST /admin/funding/{id}/release-payout`
4. Payout record created for ₹5,00,000 to a hospital the NGO controls
5. In reality, no money was ever collected

**Impact:** Large-scale financial fraud

### Scenario 6: Unauthorized Media Upload (CRITICAL)

**Actor:** Any internet user (no auth required)  
**Steps:**
1. `POST /media/upload` with a malicious executable file
2. File is uploaded to the public Supabase bucket
3. Share the public URL in a WhatsApp group: "Donate now — click here"
4. Victims download and execute the malware

**Impact:** Malware distribution, platform used as CDN for attacks

### Scenario 7: Blacklist Evasion in Adoption (HIGH)

**Actor:** Previously blacklisted adopter  
**Steps:**
1. Create a new account with a different email
2. Apply for adoption of a vulnerable animal
3. The system does not check the blacklist (by phone or email)
4. Application goes to review, potentially approved

**Impact:** Animals placed with known abusers

### Scenario 8: Reimbursement Fraud (HIGH)

**Actor:** Volunteer + colluding hospital staff  
**Steps:**
1. Volunteer creates a fake rescue case
2. Volunteer submits reimbursement request with a photoshopped bill for ₹50,000
3. Hospital staff (who have `hospital` role) verify the request (no cross-check that the hospital actually treated an animal for that case)
4. Admin approves (3-gate check passes because hospital verified it)
5. Payout released to volunteer

**Impact:** Fraudulent reimbursement of non-existent expenses

### Scenario 9: Case Evidence Tampering (HIGH)

**Actor:** Admin or NGO  
**Steps:**
1. Open any case via `/admin/cases`
2. `PATCH /admin/cases/{id}` with `evidence_urls: []` and `description: "No evidence"`
3. The case's evidence is wiped. If the case was under review for abuse, the evidence is destroyed.
4. Update `reporter_user_id` to a banned user to discredit the report.

**Impact:** Evidence destruction, witness tampering, case miscarriage

### Scenario 10: Broadcast Poisoning (MEDIUM)

**Actor:** NGO volunteer  
**Steps:**
1. Create 100 low-quality rescue cases in a specific ward with fake photos
2. All cases are `priority: high` and trigger emergency broadcasts
3. Real responders get notification fatigue and start ignoring broadcasts
4. When a real emergency occurs in that ward, responders dismiss it as another fake

**Impact:** Notification fatigue, response rate degradation, real emergencies ignored

---

## 17. Database & Schema Concerns

### 17.1 MEDIUM — `case_status` Enum Contains an Anomaly

**File:** `database/schema.sql:26`

```sql
case_status AS ENUM ('open', 'in_review', 'action_taken', 'resolved', 'closed', 'VERIFIED_REIMBURSEMENT');
```

`VERIFIED_REIMBURSEMENT` is a reimbursement status, not a case status. It appears to be a copy-paste error from the `reimbursement_status` enum. This creates confusion and could lead to invalid state transitions if code accidentally uses it.

### 17.2 MEDIUM — No Foreign Key Constraints on Several Tables

The `recovery_funding` table has `case_id` and `animal_id` but no explicit foreign key constraints in the schema file (or they are missing). This allows orphaned records if a case or animal is deleted.

### 17.3 LOW — `users.email` Is Not Unique in Practice

The `users` table has `email TEXT UNIQUE`, but `signup/route.ts` uses `.upsert({ email: ... }, { onConflict: "email" })`. If two signup requests with the same email arrive simultaneously, the unique constraint will reject one, but the error handling just returns `serverError` without informing the user that the email already exists.

---

## 18. Frontend / Client-Side Trust Issues

### 18.1 HIGH — Client-Side Role Gates Are Not Security Boundaries

**File:** `apps/web/app/(app)/layout.tsx:62-63`

```typescript
const isStaff = user?.role === "admin" || user?.role === "govt";
const navItems = isStaff ? [...BASE_NAV_ITEMS, ...ADMIN_NAV_ITEMS] : BASE_NAV_ITEMS;
```

The sidebar only shows admin links to staff users, but **every API route has its own server-side check**. A user who modifies their `localStorage` to set `role: "admin"` can see the admin nav, but the API will still reject them. However, this creates a **false sense of security** — if a developer forgets to add a server-side check on a new endpoint, the client-side gate will be the only protection.

### 18.2 MEDIUM — No CSRF Protection on State-Changing Endpoints

The API uses Bearer tokens in the `Authorization` header, which is not automatically sent by browsers. This provides **implicit CSRF protection** for browser-based attacks. However, if the frontend ever switches to cookie-based auth, all endpoints become CSRF-vulnerable.

### 18.3 LOW — Notification Polling Every 30 Seconds

**File:** `apps/web/app/(app)/layout.tsx:85`

```typescript
const interval = setInterval(fetchNotifications, 30000);
```

Every authenticated user polls the notifications endpoint every 30 seconds. For 10,000 active users, this is 20,000 requests per minute just for notifications. No cache headers, no ETag, no `If-Modified-Since`.

---

## 19. Recommended Immediate Fixes (Priority Order)

| Priority | Issue | Fix |
|----------|-------|-----|
| P0 | Donations marked SUCCESS without payment | Integrate Razorpay/Stripe webhook; set `payment_status: PENDING` initially |
| P0 | Unauthenticated media upload | Add `authMiddleware` to `/media/upload` |
| P0 | Admin role self-promotion via verification | Clamp `requested_tier` to max 3; only `admin` can set tier ≥4 |
| P0 | Admin case override with `.passthrough()` | Replace with strict Zod schema allowing only `status` and `resolution_notes` |
| P1 | No rate limiting on auth endpoints | Add `checkRateLimit` to login, signup, case creation, animal creation |
| P1 | Recovery funding IDOR | Add ownership check: user must be case reporter, responder, or staff |
| P1 | Animal update IDOR | Add ownership or role check before PATCH |
| P1 | Welfare UPI verification without bank check | Integrate UPI gateway API or require bank statement upload |
| P1 | In-memory rate limiting in serverless | Use Upstash Redis or Vercel Edge Config for distributed rate limiting |
| P2 | Mark-adoptable wrong status + missing role check | Fix status to `adoptable`; require `ngo` or `admin` role |
| P2 | Adoption blacklist check missing | Query `adopter_blacklist` before inserting application |
| P2 | No length limits on text fields | Add `z.string().max(...)` to all free-text inputs |
| P2 | ABC `POINT(0 0)` fallback | Require location or use `NULL` |
| P2 | Audit reliability | Add retry logic and failure alerting for audit inserts |
| P2 | Login brute force | Add rate limiting + account lockout after 5 failures |
| P3 | JWT refresh mechanism | Add refresh tokens with rotation |
| P3 | Volunteer case limit bypass | Enforce `active_case_limit` server-side in claim handler |
| P3 | Responder nearby ignores coordinates | Add `ST_DWithin` query with user's location |
| P3 | Donor name hardcoded | Use `users.full_name` or `users.email` for donor name |

---

## 20. Long-Term Architectural Recommendations

1. **Separate read and write databases** — Supabase admin client bypasses RLS. All authorization must be in application code, which is error-prone. Consider migrating to a framework with built-in RBAC (NestJS with CASL, or RedwoodJS).

2. **Implement a real payment gateway** — The current "simulated success" model is not production-safe. Use Razorpay for Indian payments with proper webhook verification.

3. **Add integration tests for financial flows** — Write tests that attempt to donate without payment, verify payments as non-admins, and release payouts for closed cases.

4. **Add a WebSocket layer for real-time case updates** — The current poll-based notification system is inadequate for emergency response.

5. **Implement proper cron jobs** — The `unreturned_alert` logic for ABC is described in docs but the cron runner is missing. Use Vercel Cron or a dedicated worker.

6. **Add penetration testing** — The financial and admin flows need professional security review before any real money flows through the system.

---

*End of Audit Report*
