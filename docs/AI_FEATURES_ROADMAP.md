# Finding Astro — AI Features Roadmap

> **Status:** Deferred. Backend infrastructure is ready. This document defines what to build when AI services are prioritised.
> All AI features are additive — the platform works fully without them. AI is used only where it creates measurable value.

---

## Why AI in Finding Astro

The platform generates three types of data that AI can work with:

- **Photos** — animal profiles, evidence uploads, ABC ear-notch records
- **Location sequences** — case GPS points, ABC capture/return routes, sighting history
- **Text** — case descriptions, NGO notes, safety reports, medical records

AI solves problems that are impossible or impractical to solve manually at scale.

---

## Module 1 — Lost Pet Photo Matching (M8)

**Problem:** A lost dog and a found dog might be the same animal. Matching is currently manual.

**Solution:** When a "found animal" photo is uploaded, run it against the database of "lost pet" photos.

**Implementation plan:**

```
User uploads photo of found animal
       ↓
Backend calls /ai/match-animal
       ↓
AI service returns: [{ animalId, confidence, matchReason }]
       ↓
If confidence > 0.80 → auto-alert both parties
If confidence 0.60–0.80 → show as "possible match" in UI
If confidence < 0.60 → no match
       ↓
Human confirms → case closed as "reunited"
```

**API endpoint to build:**
```
POST /ai/lost-pet-match
Body: { photoUrl: string, reportType: "lost" | "found" }
Returns: { matches: [{ animalId, confidence, animalName, photoUrl }] }
```

**Model:** Use a pre-trained image embedding model (e.g. CLIP, or a fine-tuned ResNet on dog/cat datasets). Compare embeddings with cosine similarity. No need to train from scratch.

**Data needed:** At minimum 500+ animal profile photos to make matching useful.

---

## Module 2 — Duplicate Community Dog Detection (M10 / ABC)

**Problem:** The same street dog may be registered multiple times under different names or by different NGOs, leading to duplicate ABC records or treatment billing.

**Solution:** When a new animal is registered, compare its photo against existing animals in the same geographic zone.

**Implementation plan:**

```
NGO registers new animal with photo
       ↓
Backend calls /ai/check-duplicate
       ↓
AI compares photo embedding against animals within 2km radius
       ↓
Returns potential duplicates with confidence scores
       ↓
NGO reviews and merges or confirms as new animal
```

**API endpoint to build:**
```
POST /ai/check-duplicate
Body: { photoUrl: string, latitude: number, longitude: number, radiusKm: number }
Returns: { potentialDuplicates: [{ animalId, confidence, distanceMetres }] }
```

---

## Module 3 — Previously Sterilised Dog Recognition (ABC)

**Problem:** ABC teams occasionally capture dogs that have already been sterilised but whose ear-notch is not visible or whose records are not found.

**Solution:** Before surgery, scan the dog's photo against the ABC-sterilised animals database.

**Implementation plan:**

```
ABC team scans captured dog photo via mobile app
       ↓
/ai/abc-identity-check called
       ↓
Returns: already_sterilised (high confidence) → release without surgery
         possibly_sterilised (medium confidence) → manual vet check
         new_animal (low confidence) → proceed with ABC
```

This prevents unnecessary surgeries and protects animal welfare.

**API endpoint to build:**
```
POST /ai/abc-identity-check
Body: { photoUrl: string, wardName: string }
Returns: { sterilisedStatus: "confirmed" | "possible" | "new", confidence: number, matchedAnimalId?: string }
```

---

## Module 4 — Case Categorisation and Priority Assistance (M1)

**Problem:** Emergency case descriptions vary widely in quality. A citizen might write "dog not moving near temple" — the system needs to assess urgency without human review.

**Solution:** NLP classifier that reads case description and suggests category + priority.

**Implementation plan:**

```
Citizen submits emergency report with text description
       ↓
/ai/categorise-case called (async, non-blocking)
       ↓
Returns: { suggestedPriority: "high" | "medium" | "low", suggestedType: string, confidence: number, reasoning: string }
       ↓
If AI confidence > 0.85 AND suggests "high priority" → override to high
Otherwise → use as hint, human/NGO can adjust
```

**Important:** AI should assist, not replace. Final priority can always be overridden by NGOs and admins.

**Training data:** Use existing case descriptions labelled by NGO staff. Even 200–300 labelled examples produce a useful classifier with a small fine-tuned model.

---

## Module 5 — Duplicate Report Detection (M23)

**Problem:** A single injured dog might generate 5–10 reports from different citizens, flooding responder queues.

**Solution:** Cluster reports that are geographically and temporally similar, and merge them automatically.

**Implementation plan:**

```
New case comes in
       ↓
/ai/duplicate-check runs
       ↓
Check: same location (within 200m), same time window (within 2 hours), similar description
       ↓
If likely duplicate → attach to existing case, don't create new one
       ↓
Original reporter gets "Your report has been linked to an existing case" notification
```

This is largely geometric/NLP, not deep learning. A DBSCAN clustering approach on location + time + text embedding works well.

---

## Module 6 — Analytics for Planning (M24)

**Problem:** Ward supervisors need to know where to focus ABC efforts next month, not just see raw data.

**Solution:** Predictive recommendations based on coverage trends, population estimates, and seasonal patterns.

**Examples of AI-generated insights:**

```
"Ward 42 has 78% ABC coverage. Based on birth rate data, coverage will drop below 70% 
within 4 months without another catch cycle."

"Bite incident reports in Ward 15 have increased 34% over 90 days. 
Recommend priority welfare check in this area."

"Current ABC pace in Zone 5 is insufficient to reach the 70% target before monsoon.
Recommended: increase clinic capacity by 2 slots/week."
```

**Implementation:** Time-series forecasting (Prophet or similar) on ward-level metrics, with anomaly detection on safety report frequency.

---

## Infrastructure Requirements

Before building any AI feature:

1. **Photo storage consistency** — all animal photos must be stored in R2/S3 with consistent CDN URLs. Currently using `media` module — this is ready.

2. **Embedding service** — a small Python microservice that accepts a photo URL and returns a 512-dim embedding vector. Store embeddings in the database alongside animal records.

3. **Vector similarity search** — either pgvector extension in Supabase (supported on paid plans), or a lightweight in-memory FAISS index for smaller deployments.

4. **Rate limiting** — AI calls must be rate-limited per user to prevent abuse. The false report prevention system already flags burst behavior.

5. **Audit trail** — every AI decision must be logged: what was input, what was returned, what confidence, and whether a human overrode it.

---

## Database additions needed

```sql
-- Animal embeddings (run once pgvector is enabled)
ALTER TABLE animals ADD COLUMN IF NOT EXISTS photo_embedding vector(512);
CREATE INDEX IF NOT EXISTS animals_embedding_idx ON animals USING ivfflat (photo_embedding vector_cosine_ops);

-- AI decision audit log
CREATE TABLE IF NOT EXISTS ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type TEXT NOT NULL, -- 'lost_pet_match', 'duplicate_check', 'case_priority', etc.
  input_data JSONB,
  output_data JSONB,
  confidence NUMERIC(4,3),
  was_overridden BOOLEAN DEFAULT FALSE,
  override_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## What NOT to build with AI

- **Do not** use AI to decide whether a cruelty case is valid. Human NGO review is mandatory.
- **Do not** use AI to approve or reject adoption applications. Screening requires human judgment.
- **Do not** use AI to release funding payouts. Verification requires a hospital account holder.
- **Do not** expose AI confidence scores to citizens. They should only see "possible match found" not "83.2% similarity."

---

## Recommended build order

| Priority | Module | Value | Complexity |
|---|---|---|---|
| 1 | Duplicate report detection | Immediate operational value | Low (geometric + text) |
| 2 | Case categorisation | Reduces NGO workload | Medium |
| 3 | Lost pet photo matching | High citizen impact | Medium |
| 4 | Duplicate dog detection | ABC accuracy | High |
| 5 | Sterilised dog recognition | Welfare protection | High |
| 6 | Analytics forecasting | Government value | High |

---

*Document maintained by: Finding Astro core team*
*Last updated: June 2026*
*Status: Awaiting AI infrastructure setup*
