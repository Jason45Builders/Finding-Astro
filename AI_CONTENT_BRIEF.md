# Finding Astro — AI Content Creation Brief

> Complete knowledge base for generating accurate, on-brand content for the Finding Astro platform.

---

## 1. What Is Finding Astro?

**Finding Astro** is a civic animal-welfare platform built to connect communities, responders, NGOs, and government bodies around the rescue, care, and protection of street animals. It operates primarily in India (with a focus on urban wards like Tambaram, Chennai) and is built with a privacy-first, trust-first philosophy.

**Core mission:** No rescue is ever stuck. Every animal matters. Money goes only to verified clinics — never to individuals.

**Platform tagline idea:** "Because every life deserves a response."

---

## 2. Target Audience

| Segment | Who They Are | What They Need |
|---------|-------------|----------------|
| **Citizens** | General public who spot animals in distress | Report emergencies, track cases, donate safely, adopt/foster |
| **NGOs / Rescuers** | Registered animal welfare organisations | Case management, ABC coordination, fundraising, volunteer dispatch |
| **Government** | Local body / animal welfare board officials | Oversight, policy enforcement, payout approvals, ward-level analytics |
| **Hospitals / Clinics** | Veterinary care providers | Case referrals, reimbursement claims, verification |
| **Adopters / Foster Parents** | Individuals/families seeking to give animals homes | Browse adoptable animals, manage trial periods |
| **Donors** | Individuals and CSR sponsors | Donate to verified funding cases, CSR impact tracking |
| **Volunteer Responders** | Citizens trained/available for emergency dispatch | Claim rescue cases, update status, request transport |

---

## 3. Brand Voice & Tone

Finding Astro is a **civic tech** platform — it should feel:
- **Urgent but calm** in emergency contexts (lives are at stake, but the platform must be reliable)
- **Transparent and trustworthy** (financial integrity, audit trails, no corruption)
- **Compassionate but professional** (not overly sentimental — evidence-based, accountable)
- **Inclusive** (accessible to tier-0 phone-only users, not just privileged ones)
- **Local and grounded** (Indian context: wards, UPI, INR, ABC programs, street animals, community caretakers)

**Avoid:**
- Anthropomorphising animals to an excessive degree (keep professional)
- Promising outcomes that aren't guaranteed
- Using Western pet-industry terminology (use "street animal," "community animal," "ABC" — not "stray," "pup," "kitty" in formal content)
- Making financial promises; always say "funds go to verified treating clinics only"

---

## 4. Key Terminology & Domain Language

Use these terms consistently across all content:

| Term | Definition / Usage |
|------|--------------------|
| **Case** | A reported incident needing action. Types: rescue, abuse, conflict, lost_pet, abc, wildlife |
| **ABC** | Animal Birth Control — the programme of capture, surgery, and return for street animals |
| **ABC Event** | A stage in the ABC pipeline: request → capture → surgery → return |
| **Responder** | A citizen who claims and handles a rescue case |
| **Case Response** | The lifecycle of a responder on a case: claimed → en_route → on_scene → picked_up → at_hospital → completed (or abandoned) |
| **Identity Tier** | Trust level of a user (0–5): phone only → registered name → Aadhaar → verified org → government → admin |
| **Reputation Score** | Trust metric for users (default 50); affects visibility and permissions |
| **Animal Visibility** | Privacy setting for animals: private, public_emergency, public_abc, public_medical, public_adoption, public_general |
| **Ward** | A local administrative area (e.g., Tambaram ward); platform shows ward-level stats |
| **Funding Case** | A fundraising case tied to a rescue; money goes only to verified clinics |
| **Welfare Group** | A registered welfare organisation that can receive UPI donations directly |
| **Safe Awareness Zone** | A geofenced area on the map highlighting ABC coverage, vaccination %, and caretaker info |
| **Unreturned Alert** | Flag when an ABC animal hasn't been returned within expected timeframe |
| **Case Escalation** | Auto-reopening of a case if a responder doesn't act within 15 minutes of claiming |
| **Visual Signature** | AI-extracted visual identifiers for animal matching (facial recognition aid) |
| **Geo-fuzzing** | Location coordinates intentionally blurred based on user identity tier for privacy |
| **Reimbursement** | Volunteer or responder claiming back expenses — requires 3-gate approval |
| **CSR Sponsor** | Corporate social responsibility sponsor committing funds to ward-level budgets |
| **Trial Period** | Pre-adoption home trial with start/end dates and check-ins |
| **Adopter Blacklist** | List of users/phones flagged for failed adoptions |

---

## 5. User Roles & Permissions

**Roles (enum):** `citizen`, `ngo`, `govt`, `admin`, `hospital`

| Role | Can Do |
|------|--------|
| **Citizen** | Report cases, browse public animals, donate, apply for adoption, report safety/abuse/conflict. Cannot see other users' private animals. |
| **NGO** | All citizen features + approve NGO verifications, view all cases, manage welfare groups, oversight. |
| **Govt** | All NGO features + approve identity tiers, release payouts, manage reimbursements, view all cases including banned reporters. |
| **Admin** | Full control: change roles, ban/unban users, delete users/cases, approve everything, access all admin panels. Cannot delete guest user. Cannot change own role. |
| **Hospital** | Verify reimbursement requests linked to their verified hospital/clinic account. |

**Identity Tiers (0–5):**
- **Tier 0** — Phone only (emergency SOS available)
- **Tier 1** — Registered name (can claim cases, add animals)
- **Tier 2** — Aadhaar verified (can report abuse/conflict, apply for adoption)
- **Tier 3** — Verified organisation (NGO)
- **Tier 4** — Government
- **Tier 5** — Admin

**Tier enforcement rules:**
- Claim rescue case → Tier 1+
- Add animal record → Tier 1+
- Abuse/conflict report → Tier 2+
- Adoption application → Tier 2+
- Payout approval → Tier 4+ (govt/admin)
- Role change → Tier 5 only

---

## 6. The Emergency Response Pipeline (Critical Feature)

This is the **heart of the platform**. Understand it fully before writing any case/response/responder content.

### How It Works:
1. **Emergency reported** → Case created (type: rescue/abuse/etc.) with location, photos, description
2. **Case goes live** → Visible to Tier 1+ responders within radius (configurable service area)
3. **Responder claims** → Creates a `case_responses` record with a **15-minute deadline**
4. **Expired claim** → Case auto-reopens for another responder (no rescue is ever stuck)
5. **Status progression** (with mandatory photo evidence at key stages):
   - `claimed` → `en_route` → `on_scene` → `picked_up` → `at_hospital` → `completed`
   - Or: `abandoned` (case reopens)
6. **Funding triggered** → If medical costs involved, a funding case auto-attaches
7. **Clinic payout** → Only after 3 gates: bills on file, hospital verified, case resolved
8. **Outcome published** → Public outcome posted; ward stats updated

### Status Machine Rules (Do Not Break These):
- Only admins can force status changes; state machine is enforced server-side
- Mandatory photo evidence required for: `picked_up`, `at_hospital`, `completed`
- Abandoning reopens the case; responder's reputation may be affected
- Held-for-review cases (`heldForReview = true`) are excluded from public lists until cleared

---

## 7. Financial Integrity Rules (Write About These Carefully)

**Non-negotiable platform rules:**
- **No individual ever collects money** — all payouts go to verified treating clinics/hospitals only
- **Three-gate approval** for reimbursements: (1) bills/prescriptions uploaded, (2) hospital verifies, (3) case resolved/closed
- **Cooling period**: Payouts > ₹1,00,000 require 24-hour wait after funding case creation
- **Refund window**: Donors can request refund within 30 days only; amounts > ₹1L require admin approval
- **Idempotency**: Donation requests use unique keys to prevent duplicate charges
- **Welfare payments**: Direct UPI to welfare orgs, manually verified by admin (UTR + proof)
- **Receipt numbers**: Unique per welfare group — used for audit and donor trust

**In content:**
- Say "donations fund verified veterinary care" — never "donations go to rescuers"
- Mention audit trails and transparency; the platform publishes outcome data
- Use INR (₹) for all financial references

---

## 8. Animal Privacy & Location Rules

**Animals have a privacy model**, not just "public or private":

| Visibility | Who Sees It |
|------------|-------------|
| `private` | Only the user who created it (and staff) |
| `public_emergency` | Everyone while case is open; hides after resolved |
| `public_abc` | Visible during ABC programme |
| `public_medical` | Visible during medical treatment |
| `public_adoption` | Visible while available for adoption |
| `public_general` | Always visible (e.g., community animals with caretakers) |

**Location privacy:**
- Coordinates are fuzzed by identity tier (`fuzzyLocation` in `lib/geo.ts`)
- Tier 0 users see very rough locations; Tier 5 (admin) sees exact coordinates
- This is to protect caretakers and animals from misuse of location data

---

## 9. Key User Flows to Reference in Content

### Reporting a Case
1. User navigates to `/cases/new` or `/emergency`
2. Selects case type (rescue/abuse/conflict/abc/wildlife/lost_pet)
3. Fills description, uploads evidence photos/videos
4. Sets location (auto-geolocated or manual pin)
5. Submits → case created with `open` status
6. Tier 2+ for abuse/conflict (identity verification enforced)
7. Emergency SOS (`/emergency`) available without account — creates guest case

### Adopting an Animal
1. Browse adoptable animals (`/adopt`)
2. View animal profile → apply
3. Admin/NGO reviews → `pending_review` → `approved`
4. Trial period begins (start/end dates, check-in notes)
5. Outcomes: `adopted`, `rejected`, or `returned` to pool
6. Blacklist enforcement for users with prior failures

### Donating
1. Browse funding cases (`/funding`) or welfare groups (`/community`)
2. Select amount → idempotent payment request
3. Funds held until case is medically verified
4. Payout released only to verified clinic after 3-gate approval
5. Donor receipt generated with unique receipt number

### ABC Programme Flow
1. Community member or caretaker requests ABC for an animal
2. Animal captured → geo-validated event logged
3. Surgery performed at verified centre → medical history updated
4. Animal returned to original location → return event logged
5. Unreturned alerts fire if not returned within expected window

### Reporting Abuse / Cruelty
1. Navigate to `/cruelty` or `/safety`
2. Submit report with evidence (tier 2+ required)
3. Report creates a case of type `abuse`
4. Admin/NGO reviews; outcome published in `/safety/outcomes`
5. Reporter credibility score updated based on outcome

---

## 10. Notification & Real-Time System

- **In-app notifications** stored in `notifications` table; dropdown polls every 30s
- **Push notifications** via Expo (mobile) — token stored in `push_tokens`
- **SMS** via Exotel — for critical alerts (case updates, payout notifications)
- **Email** via Resend — for receipts, password resets, org verification
- **SSE (Server-Sent Events)** at `/api/v1/stream/cases` — real-time case updates for connected clients
  - Uses in-memory subscriber sets in `case-stream.ts`
  - Heartbeat every 15s; stale connections auto-removed
  - Per-user filtering; optional caseId/type filters

---

## 11. Maps & Geography

- **PostGIS** stores all locations as `GEOGRAPHY(POINT, 4326)`
- Frontend uses **Leaflet** (React-Leaflet) with OpenStreetMap tiles
- Key map views:
  - Open cases map (responder dispatch) — `/respond`
  - Animal sightings map — `/animals`
  - City-level ward summary — `/safety`
  - Safe awareness zones with radius circles
- GeoJSON exported for frontend; coordinates decoded to `{ latitude, longitude }`

---

## 12. AI Features Context

The platform has AI-assisted features (referenced in `docs/AI_FEATURES_ROADMAP.md` and `app/api/v1/ai/route.ts`):

- **Visual Signature Matching** — AI extracts facial/body feature vectors from animal photos to match sightings to known animals (stored in `animals.visual_signature` JSONB)
- **Duplicate Detection** — `lib/animal-duplicates.ts` prevents duplicate animal records
- **OCR / Document Parsing** — implied by reimbursement/bill verification flows
- **Content Moderation** — implied by `virus-scan.ts` (ClamAV/VirusTotal) and EXIF stripping on all uploads
- **Species Identification** — implied by wildlife species categories and guidance

**When writing about AI features:**
- Frame as "AI-assisted matching" not "AI is sure"
- Emphasise human verification is always required (vet/hospital/admin)
- Never say "AI identifies the animal" — say "AI suggests a match, verified by caretakers/rescuers"

---

## 13. Admin & Dispatch Panel

Admins and govt users access:
- **Dispatch** (`/dispatch`) — real-time case oversight, reassignment, status enforcement
- **Verifications queue** — NGO and identity tier approvals
- **Reimbursements** — 3-gate approval workflow for volunteer/hospital expenses
- **Partner requests** — approve/reject clinic/store/welfare org registrations
- **User management** — ban/unban, role changes, tier adjustments
- **Ambulance admin** — manage ambulance services and requests
- **Impact & CSR** (`/impact`) — CSR sponsor budgets, ward-level spend, commitment tracking
- **Beta feedback** — review user-submitted feedback

---

## 14. Technology Stack Summary (For Technical Content)

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 3.4 (Material Design 3 inspired) |
| **Backend** | Next.js API Route Handlers (server-side TypeScript) |
| **Database** | PostgreSQL 15+ with PostGIS 3.4+ (Supabase) |
| **Auth** | Custom JWT (HS256 via `jose`) + Supabase Auth session bridge |
| **Cache** | Upstash Redis (rate limiting, session cache) |
| **Maps** | Leaflet / React-Leaflet |
| **Push** | Expo push notifications |
| **SMS** | Exotel |
| **Email** | Resend |
| **Real-time** | SSE (Server-Sent Events) via custom broadcaster |
| **File uploads** | Supabase Storage |
| **Forms** | React Hook Form + Zod |
| **State** | Zustand (auth), TanStack Query (server state) |
| **Testing** | Vitest |

---

## 15. Content Creation Guidelines

### For Marketing / Landing Page Content:
- Lead with the mission: "No rescue is ever stuck."
- Emphasise transparency: "You can see exactly where your money goes."
- Use Indian context: wards, UPI, local animals, community caretakers
- Call out the difference: "We don't let individuals collect money. Funds go straight to verified vets."

### For In-App Microcopy:
- **Emergency flows:** Short, action-oriented, high-contrast. "Claim this case" not "Would you like to claim?"
- **Error messages:** Specific and actionable. "Photo required for this status" not "Invalid input."
- **Empty states:** Compassionate but solution-oriented. "No open cases nearby — expand your service radius."
- **Success messages:** Confirm what happened and what's next. "Case claimed! You have 15 minutes to respond."

### For Educational / Help Content:
- Use plain language; avoid jargon unless explained
- Reference identity tiers in plain terms ("verify your ID to unlock more features")
- Explain financial flows clearly ("your donation funds treatment, not administration")

### For Admin / Documentation Content:
- Precise, technical, reference state machines and approval gates
- Include SQL references where relevant (table names, enum values)
- Link to migration files for schema changes

---

## 16. Important "Do Not" List

| Don't | Why |
|-------|-----|
| Say "stray dog" in formal content | Use "street animal" or "community animal" — more respectful |
| Promise that every case will be resolved | Use "no rescue is ever stuck" — cases auto-reopen, but outcomes depend on many factors |
| Say "AI identifies animals" | AI only suggests matches; human verification is mandatory |
| Mention individual fundraisers collecting money | Platform explicitly prevents this; funds go to verified clinics only |
| Use Western pet industry terms | This is an Indian civic platform — use local context |
| Guarantee adoption outcomes | Trials exist for a reason; outcomes can be "returned to pool" |
| Show exact coordinates for non-staff users | Location is fuzzed by tier; respect the privacy model |
| Bypass the 3-gate payout approval | Financial integrity is a core brand promise |

---

## 17. Key Files for Reference

When writing content that touches specific features, refer to these source files:

| Feature Area | Key Source Files |
|-------------|-----------------|
| Database schema | `database/schema.sql`, `database/migrations/*.sql` |
| API routes | `apps/web/src/app/api/v1/**/route.ts` |
| Auth & identity | `apps/web/src/lib/auth.ts`, `apps/web/src/lib/auth-middleware.ts` |
| Case/response logic | `apps/web/src/app/api/v1/cases/**`, `emergency/**` |
| Funding & payments | `apps/web/src/app/api/v1/funding/**`, `welfare-groups/**`, `welfare-payments/**` |
| Animal logic | `apps/web/src/app/api/v1/animals/**`, `lib/animal-duplicates.ts` |
| Maps & geo | `apps/web/src/components/*Map*.tsx`, `lib/geo.ts` |
| Notifications | `lib/push-notify.ts`, `lib/notify-channels.ts`, `lib/realtime.ts` |
| Admin logic | `apps/web/src/app/api/v1/admin/**` |
| UI components | `apps/web/src/components/ui/` |
| Types | `apps/web/src/types.ts`, `apps/web/src/lib/types.ts` |

---

## 18. Example Content Starters

**Landing page hero:** "Finding Astro connects communities to rescue, treat, and protect street animals. Report an emergency, track a rescue, donate transparently — or become a responder. Because every life deserves a response."

**Case status update:** "Your rescue case #1234 is now at the clinic. Funds have been released to the verified veterinary team. You'll be notified when treatment is complete."

**Donation confirmation:** "Your ₹500 donation to case #1234 has been received. Funds will be disbursed directly to the treating clinic once treatment is complete and verified. You'll receive a receipt and outcome update."

**Adoption message:** "Your trial adoption of Luna (Case #5678) has begun. Check-in dates: [dates]. Remember — this is a commitment. If it doesn't work out, the animal returns to our care pool, no questions asked."

---

*This document was generated from a full codebase audit of Finding Astro. For schema details, refer to `database/schema.sql` (1,694 lines). For API contracts, see `docs/API.md`. For system design, see `docs/SYSTEM_DESIGN.md`.*
