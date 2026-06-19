# Finding Astro — Application Audit Report

> **Date:** June 2026  
> **Scope:** Full-stack audit of the Finding Astro animal-welfare platform (backend, mobile app, admin dashboard, data layer, infrastructure) with recommendations to mature it into a production-grade system that serves both animal and human welfare.  
> **Method:** Static code review, architecture analysis, dependency inspection, and gap assessment against production-readiness standards.

---

## 1. Executive Summary

**Finding Astro** is a surprisingly deep and well-thought-out **civic animal-welfare platform** built for the Indian context (Chennai/Tamil Nadu). It is organised as a **TypeScript monorepo** with three runtime layers:

| Layer | Tech Stack | State |
|-------|------------|-------|
| **Backend** | Express + TypeScript + PostgreSQL/PostGIS | **Mature** — rich domain logic, strong guardrails |
| **Mobile App** | React Native (Expo) + Redux Toolkit | **Functional** — covers core flows, needs polish |
| **Admin Dashboard** | Next.js (Pages Router) | **Minimal** — basic CRUD, no ops tooling |
| **Data / DB** | PostgreSQL + PostGIS | **Partial** — real seed data, **no schema in repo** |

### Verdict

**The codebase is 60–70 % production-ready.** The backend domain model is the strongest asset — it already implements emergency response, adoption pipelines, identity verification, funding escrow, false-report prevention, and safety/conflict resolution. The biggest blockers are: **(1) missing database schema in source control, (2) no test coverage, (3) simulated/partial integrations (payments, maps, Aadhaar, SMS), and (4) a very thin admin dashboard.**

---

## 2. What Already Works Well (Strengths)

### 2.1 Backend Architecture & Domain Design

- **Clean modular structure:** `route → controller → service → repository` pattern is consistently applied.
- **Geospatial first:** Every core entity (`animals`, `cases`, `sightings`, `abc_events`, `users`) stores `GEOGRAPHY(POINT, 4326)` and uses `ST_DWithin` for radius queries.
- **Identity-tier system:** A well-designed 5-tier trust model (`phone → name → Aadhaar → verified org → govt/admin`) gates sensitive actions. This is a rare production-grade feature for civic tech.
- **False-report prevention:** `false-report-prevention.service.ts` implements burst detection, cluster analysis, credibility scoring, and quarantine logic — critical for abuse/conflict reports.
- **Emergency responder network:** Tiered broadcast radii (3 km → 8 km → 15 km), claim deadlines, abandonment re-broadcast, and active case-load limits (`MAX_ACTIVE_CLAIMS = 3`).
- **Funding & escrow:** Pre-funded treatment pages, donation tracking, reimbursement requests, hospital verification, and payout release — all with role-based controls.
- **Adoption pipeline:** Full lifecycle from application → review → trial → agreement (SHA-256 hashed) → follow-up → blacklist.
- **Safety & coexistence:** "I feel unsafe" mode, behaviour guidance cards, safe awareness zones, QR-code signage, and public trust signals.
- **Wildlife separation:** Entirely separate flow from street dogs, with species-specific guidance and authorised-centre routing.
- **Push notifications:** Expo SDK integration with chunked broadcast.

### 2.2 Security & Guardrails

- **Zod validation** on every route.
- **JWT sessions** with `otp_attempts` lockout after 5 failures.
- **Rate limiting** (`express-rate-limit`) on report endpoints.
- **Helmet + CORS + Compression** standard Express hardening.
- **Environment validation** via Zod schema (`env.ts`) with production warnings.
- **Aadhaar hash salt** (never store raw Aadhaar) — although the actual hashing implementation is not wired to a real UIDAI API.
- **Role-based access control (RBAC)** and tier-based access control (TBAC) enforced in middleware.

### 2.3 Mobile UX (Selected Flows)

- **Zero-friction emergency reporting:** Guest users can report injured animals with just a photo + GPS; no login required.
- **Prominent SOS button** on the home screen (`HomeMapScreen`).
- **Severity selector** with colour-coded urgency (`critical` / `serious` / `stable_needs_care`).
- **Auto-location** with fallback handling.
- **Identity verification screen** is framed positively ("unlock more ways to help") rather than punitively.

### 2.4 Real-World Data Seeding

- `database/seeds/001_chennai_real_data.sql` contains **actual Chennai veterinary clinics** pulled from Google Places API, with real `place_id`s, phone numbers, and 24-hour flags derived from reviews. This shows serious intent toward real-world utility.

---

## 3. Critical Gaps & Blockers

### 3.1 Database Schema Is Missing from Source Control

**Status:** Every `.sql` file in `database/` (including `schema.sql`, `seed.sql`, and all migrations) contains only:

```sql
-- !! SUPERSEDED — DO NOT RUN !!
-- This file has been replaced by the unified Supabase schema files.
-- Run the files in database/supabase/ instead, in numbered order.
```

**Problem:** There is **no `database/supabase/` directory** in the repository. The actual schema exists only in a live Supabase instance. This means:

- **No reproducible builds.** A new developer cannot stand up the database.
- **No schema reviews.** Changes are invisible to git.
- **Migration history is lost.** The numbered stubs (`002_audit_fixes.sql`, `014_identity_verification_tables.sql`, etc.) are empty.
- **Production risk:** If the live Supabase project is lost, the data model is unrecoverable.

**Recommendation:** Immediately export the live schema using `pg_dump --schema-only` (or Supabase CLI `db dump`), commit it to `database/schema.sql`, and adopt a real migration tool (e.g., **Supabase migrations**, **Flyway**, **node-pg-migrate**, or **Prisma Migrate**).

### 3.2 Zero Automated Test Coverage

- **No unit tests** for services or utilities.
- **No integration tests** for API routes.
- **No database tests** for queries or transactions.
- **No E2E tests** for mobile flows.

**Recommendation:** Add **Jest** for the backend and **Detox** or **Maestro** for mobile. Start with auth flow, emergency case creation, responder claim, funding donation, and geospatial queries.

### 3.3 Simulated / Partial Integrations

| Integration | Current State | Gap |
|-------------|---------------|-----|
| **Maps** | Mobile shows text coordinates only; no map view | No `react-native-maps` or MapLibre integration |
| **Payments** | `simulateFailure` flag in donation schema | No real payment gateway (Razorpay / Stripe / PayU) |
| **Aadhaar verification** | UI screens exist; backend env has `AADHAAR_HASH_SALT` | No actual UIDAI API or Digilocker integration |
| **SMS / OTP** | `SMS_PROVIDER=none` by default; mock OTP in dev | No Exotel/Fast2SMS wiring in production |
| **Push notifications** | Expo SDK is installed and coded | `EXPO_ACCESS_TOKEN` optional; fallback to silent failure |
| **R2 / S3 uploads** | Presigned URL logic is complete | Dev mode returns a mock URL that doesn't actually store files |
| **AI / ML** | `ai.service.ts` uses simple token matching + haversine distance | No actual ML model for image matching or duplicate detection |

**Recommendation:** Create an `integrations/` module with adapters (e.g., `RazorpayAdapter`, `ExotelSmsAdapter`, `DigilockerAdapter`) and feature flags so the app can run in "simulated" mode for dev while calling real APIs in production.

### 3.4 Admin Dashboard Is Under-Developed

- Only **4 pages**: login, dashboard, animals, cases (and a stub `abc.tsx`).
- No **case responder assignment** UI.
- No **funding / payout management** UI.
- No **user management** (ban/unban, role upgrades, NGO verification).
- No **ABC tracking** UI beyond a list.
- No **analytics / ward summaries**.
- No **real-time updates** (must refresh to see new cases).
- Inline CSS only; no component library.

**Recommendation:** Migrate to a dedicated admin framework (e.g., **React Admin** or **Refine**) with DataProvider wired to the backend API. Add operational screens: responder dispatch, case timeline, funding audit log, partner verification, and ward-level dashboards.

### 3.5 Missing Observability & Ops Tooling

- **No structured logging aggregation** (logs go to `console` / `logger` but no Loki/CloudWatch/ELK).
- **No health metrics** beyond a simple `/health` DB ping.
- **No APM** (OpenTelemetry, Datadog, New Relic).
- **No error tracking** (Sentry, Bugsnag).
- **No cron jobs** for: expired claim cleanup, escalation re-broadcast, adoption follow-up reminders, inactive responder pruning.
- **No backup strategy** documented.

**Recommendation:** Add Sentry for error tracking, Prometheus metrics for responder throughput / case resolution time, and a cron runner (e.g., **BullMQ** or **node-cron**) for the backend.

### 3.6 No WebSocket / Real-Time Layer

- The emergency broadcast system is **poll-based** (push notifications + client refresh). There is no live location tracking of responders en route, no live case status updates, and no chat between reporter and responder.
- **Recommendation:** Add **Socket.io** or a **WebSocket** layer for live case updates, responder location streaming (opt-in), and a minimal chat channel per case.

### 3.7 Mobile App Polish & Accessibility

- **No offline mode:** If a user is in a low-signal area, they cannot submit a case.
- **No map component:** Users see coordinates as text, not on a map.
- **No deep-link handling:** QR codes generate URLs (`https://findingastro.app/qr/...`) but mobile app is not configured to intercept them.
- **No accessibility labels** on Pressable components.
- **No i18n:** The app is hardcoded in English; Tamil/Hindi are essential for Chennai-scale adoption.

---

## 4. Animal Welfare → Human Welfare Enhancement Roadmap

Finding Astro already recognises that animal welfare and human welfare are intertwined (conflict resolution, safety reports, coexistence education). To fully realise this mission, the platform needs to expand from **"animal-centric with human friction points"** to **"community-centric where animal and human wellbeing are jointly managed."**

### 4.1 Phase 1: Fix the Foundation (Weeks 1–4)

1. **Restore the database schema** to the repo and adopt a migration system.
2. **Add test coverage** for the 5 most critical flows: auth, emergency report, responder claim, funding donation, adoption application.
3. **Wire real integrations** (payments, SMS, maps) behind feature flags.
4. **Add Sentry + structured logging**.

### 4.2 Phase 2: Human Welfare Features (Weeks 5–12)

These features explicitly extend the platform's value to **humans** without diverting from the animal mission:

#### A. Volunteer & Caretaker Mental Health Check-ins
- **Why:** Burnout is the #1 reason volunteers quit animal welfare.
- **Feature:** After a responder completes 3 cases in 7 days, trigger a gentle in-app check-in: *"How are you doing?"* with a link to a free counselling helpline (e.g., iCall, Sangath, or local NGO counsellors).
- **Backend:** Add `volunteer_wellbeing_checks` table; notify NGO admins if a volunteer flags distress.

#### B. Human Medical Incident Linkage (Bite / Scratch / Accident)
- **Why:** The app already logs bite incidents in `safety.service.ts`. It should guide the **human** to medical care.
- **Feature:** When a `bite_incident` or `child_safety` safety report is filed, auto-suggest the nearest **human hospitals** with rabies PEP availability, and optionally surface government compensation schemes for animal-bite victims.
- **Backend:** Extend `partners` table with `human_hospitals` and `pep_available` flags; integrate with `safety_reports` workflow.

#### C. Community Feeding & Nutrition Support
- **Why:** Many community animal caretakers are elderly or low-income humans who feed animals daily.
- **Feature:** A **"Feeding Support"** module where caretakers can request food subsidies, track feeding-point schedules, and receive CSR-matched donations for animal food that also eases their personal financial burden.
- **Backend:** New table `feeding_points` with `caretaker_user_id`, `abc_coverage`, `vaccination_status`, and `monthly_food_cost_inr`. Link to CSR funding.

#### D. Lost Pet → Human Reunification Emotion Support
- **Why:** Losing a pet is a traumatic human event.
- **Feature:** Add a **"Family Support"** flow to the Lost Pet module: automated tips for the first 24 hours, a helpline chatbot, and a post-reunification check-in.
- **Mobile:** A dedicated "Lost Pet Guide" screen with actionable steps (search radius, shelter calls, poster generation).

#### E. Education Hub for Children & Schools
- **Why:** Fear of dogs is learned early; education prevents future conflict.
- **Feature:** Extend `education_content` with `audience = "schools"` and `age_group`. Add a **"School Visit Request"** case type where NGOs can schedule humane-education sessions.
- **Mobile:** A "Kids Mode" or simplified view with animal-safety comics and games.

#### F. Legal Aid for Humans (Caretakers & Feeders)
- **Why:** Caretakers are often harassed by RWAs or neighbours.
- **Feature:** In the Legal Hub, add a **"Human Rights for Caretakers"** section: template RTIs, complaint letters to police/municipalities, and a pro-bono lawyer directory.
- **Backend:** New table `legal_aid_providers` with `specialization` ("animal feeder harassment", "RWA conflict", "ABC rights").

#### G. Economic Inclusion: Street-Vendor Coexistence Program
- **Why:** Street vendors and hawkers interact with street animals daily; they are the most affected by both positive and negative animal behaviour.
- **Feature:** A **"Vendor Partnership"** tier where vendors can register as "animal-friendly stalls" (receive a QR sticker), get discounts on animal food from pet stores, and report animal health issues in exchange for platform rewards.
- **Backend:** Extend `users` with `occupation = "vendor"`; add `vendor_stalls` table.

### 4.3 Phase 3: Scale & Intelligence (Weeks 13–24)

1. **ML-powered image matching:** Replace the heuristic `ai.service.ts` with an actual visual-embedding model (e.g., CLIP or a fine-tuned ResNet) for lost-pet matching and duplicate detection.
2. **Predictive ABC scheduling:** Use animal presence data and ward summaries to predict where the next ABC cycle is needed.
3. **Open Data API:** Publish anonymised ward-level animal welfare metrics so researchers, municipal corporations, and urban planners can use the data.
4. **Multi-city expansion:** The schema is already city-agnostic (`ward_name`, `city`). Add `city_config` table for per-city partner networks and legal frameworks.

---

## 5. Detailed Technical Recommendations

### 5.1 Database & Migrations

```
database/
  migrations/
    001_init_schema.sql          ← pg_dump --schema-only
    002_add_ward_summary_view.sql
    ...
  seeds/
    001_chennai_real_data.sql     ← keep
    002_education_modules.sql
    ...
  supabase/                       ← if staying on Supabase
    config.toml
```

**Adopt:** Either **Prisma** (for type-safe schema + migrations) or **node-pg-migrate** (for raw SQL control). Given the heavy use of PostGIS and custom types, raw SQL migrations are safer.

### 5.2 Testing Strategy

```
backend/
  src/
    __tests__/
      integration/
        auth.flow.test.ts
        emergency.case.test.ts
        funding.donation.test.ts
      unit/
        geo.utils.test.ts
        false-report-prevention.test.ts
```

Use **Jest** + **supertest** for API integration tests. Spin up a **testcontainers** PostgreSQL instance for each test run.

### 5.3 Integration Adapters (Feature Flags)

Create a clean adapter pattern:

```typescript
// backend/src/integrations/payment/payment.adapter.ts
export interface PaymentAdapter {
  createOrder(amount: number, metadata: object): Promise<{ id: string; url: string }>;
  verifyWebhook(payload: unknown): Promise<boolean>;
}
// implementations: RazorpayAdapter.ts, StripeAdapter.ts, MockPaymentAdapter.ts
```

Do the same for SMS, Aadhaar, and Push notifications.

### 5.4 Mobile Improvements

| Priority | Task | Library / Approach |
|----------|------|-------------------|
| High | Add interactive map | `react-native-maps` or `MapLibre RN` |
| High | Offline case submission | Redux Persist + background sync queue |
| High | Tamil / Hindi i18n | `i18next` + `react-i18next` |
| Medium | Deep-link QR handling | `expo-linking` + `react-navigation` |
| Medium | Accessibility | `accessibilityLabel` on all interactables |
| Low | Dark mode | Theme context |

### 5.5 Admin Dashboard Rebuild

**Recommended stack:** **Refine** (React-based admin framework) or **React Admin** with a custom DataProvider.

**Required screens:**
- **Responder Dispatch:** Real-time map of open cases + available responders; drag-to-assign.
- **Case Timeline:** Visual timeline of events, escalations, and status changes.
- **Funding Audit:** Ledger of all donations, reimbursements, and payouts with receipt links.
- **Partner Verification:** Approve/reject clinic, NGO, and store registrations.
- **Ward Dashboard:** Charts for ABC coverage, vaccination rates, open cases, and response times.
- **Content Management:** Edit behaviour guidance cards, education modules, and legal sections without redeploying.

### 5.6 Security Hardening

- **Secrets management:** Move `JWT_SECRET`, `AADHAAR_HASH_SALT`, and `R2_SECRET_ACCESS_KEY` out of `.env` files and into a secrets manager (AWS Secrets Manager, Azure Key Vault, or 1Password for dev).
- **SQL injection audit:** While `pg` uses parameterized queries, audit all dynamic SQL concatenation (e.g., `WHERE ${conditions.join(" AND ")}`) for safe parameterisation.
- **CSP & security headers:** Review Helmet configuration for mobile API usage; ensure `contentSecurityPolicy` does not block the Expo dev client.
- **Input sanitisation:** Add maximum length limits on `description` and `notes` fields to prevent storage abuse.
- **Audit logging:** The app sets PostgreSQL session variables (`app.current_user_id`) but does not appear to have a full audit trail table for all mutations. Add `audit_logs` with JSONB diffs.

### 5.7 Performance & Scalability

- **Database connection pooling:** Already configured (`max: 20`, `connectionTimeoutMillis: 5_000`). Monitor pool exhaustion under load.
- **Query optimisation:** `ST_DWithin` with `GEOGRAPHY` is correct, but ensure GIST indexes exist on all geospatial columns. Add `EXPLAIN ANALYZE` checks to CI.
- **Pagination:** The `animal` and `case` list endpoints default to `limit = 100` but do not appear to support cursor-based pagination. Add `cursor` / `offset` pagination for large datasets.
- **Caching:** No Redis or in-memory cache is used. Add **Redis** for:
  - OTP rate limiting (currently DB-backed).
  - Responder candidate lists (short TTL).
  - Partner directory lookups.
- **CDN:** R2 is already configured for media. Ensure images are served with `Cache-Control` headers and use WebP/AVIF conversion.

### 5.8 DevOps & Deployment

- **CI/CD:** No `.github/workflows` or GitLab CI files are present. Add:
  - Lint (`eslint` + `prettier`).
  - Type check (`tsc --noEmit`).
  - Integration tests against Postgres in Docker.
  - Mobile build via **EAS** (Expo Application Services).
- **Docker:** The `docker-compose.yml` is present but the backend `Dockerfile` is referenced (`infra/docker/Dockerfile.backend`) but not inspected in this audit. Ensure it uses a multi-stage build and runs as a non-root user.
- **Environment parity:** `START_DEV.bat` creates a `.env` with a hardcoded `JWT_SECRET`. Dev scripts must never use production-like secrets.

---

## 6. Conclusion & Next Steps

Finding Astro is **not a toy project.** It is a sophisticated civic-tech platform with production-grade backend logic, real-world data, and a genuine understanding of the Indian animal-welfare ecosystem. The biggest risk is that the **data layer is invisible to source control** and the **integrations are mostly simulated** — which means the app cannot currently survive a team handoff or a production launch.

### Immediate Action Items (This Week)

1. **Export and commit the database schema.** This is the single most critical task.
2. **Set up Jest + supertest** and write tests for `auth.service.ts`, `emergency-response.service.ts`, and `funding.service.ts`.
3. **Create a `integrations/` folder** with a `MockPaymentAdapter` and a `RazorpayAdapter` stub behind a feature flag.
4. **Add Sentry** to the backend and mobile app.

### 90-Day Goal

- All critical flows have automated tests.
- Payments, SMS, and maps are wired to real providers in staging.
- Admin dashboard can assign responders and release payouts.
- Mobile app has an interactive map and offline submission queue.
- Tamil language support is live.

### 12-Month Vision

Finding Astro becomes a **community welfare platform** where:
- **Animals** get emergency care, ABC surgery, adoption, and lost-pet recovery.
- **Humans** get mental-health support, legal aid, coexistence education, economic inclusion (vendor/feeding programs), and human-medical linkage for bite incidents.
- **Cities** get open data on animal populations, ABC coverage, and conflict hotspots to inform urban planning.

The codebase is already closer to this vision than most projects at this stage. With disciplined engineering on the foundation, it can become a reference implementation for civic animal-welfare tech globally.

---

*Report generated by Kimi Work — June 2026*
