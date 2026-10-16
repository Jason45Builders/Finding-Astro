# UI Refinement — Working Blueprint

**Branch:** `ui-refinement`  
**Production branch:** `Working` (do not modify or merge without explicit approval)  
**Status:** In progress  
**Product goal:** Make the first screen help people take useful animal-welfare action, not merely look active.

## Product decision

Evolve the current dashboard into a **Home activity hub**, rather than replacing it with a social feed. Keep the existing dashboard's working shortcuts, personal cases, collectives, impact, and nearby-animal discovery. Add a compact, trustworthy stream of actionable updates above or alongside those tools.

The home screen should answer, in this order:
1. Is there an urgent animal-welfare situation I can safely help with?
2. Is there an update or action required on a case I reported, follow, or have been assigned?
3. What useful local welfare activity or community information can I act on?
4. How do I quickly report, find help, adopt/foster, or reach my existing tools?

## Principles and non-goals

- **Action before activity:** every feed item should explain what changed and offer a clear next step.
- **Urgency is not engagement:** emergency priority and relevance outrank likes, comments, and generic recency.
- **No invented activity:** do not create fake events, filler cards, fake counts, or placeholder feed items.
- **Privacy by default:** expose only public/open cases or records the authenticated user is permitted to see. Never leak reporter contact details, private location details, internal notes, or restricted organization data.
- **Useful with sparse data:** show an honest empty state and existing quick actions when there are no updates.
- **No destructive redesign:** preserve working dashboard capabilities and existing route destinations.
- **Accessible and calm:** keyboard-accessible filters, clear loading/error/retry states, meaningful timestamps, and no automatic feed reordering while someone is reading.
- **Mobile-first:** critical actions and urgent cases must be usable on a narrow screen.
- **Location is optional:** never require geolocation just to view Home; ask permission only when a location-dependent feature is explicitly invoked.
- **No unnecessary infrastructure:** reuse current authenticated APIs and domain models. Do not add tables, subscriptions, or dependencies unless existing capabilities cannot meet a verified requirement.

## Proposed Home information architecture

1. **Urgent near you** — open high-priority rescue cases, only where visibility and relevance are established. Label this as nearby only when a reliable user-selected/current location is available; otherwise label it “Open urgent cases.”
2. **Your activity** — the user's own/assigned case changes and actionable work, using existing access rules.
3. **Community & welfare updates** — real, published stories or verified initiatives only when the source's published/visibility state is known and safe to expose.
4. **Quick actions** — Report SOS, Browse Animals, Find a Vet, My Cases (preserve current working actions).
5. **Your dashboard** — retain collectives, impact, recent cases, profile/reputation, and nearby-animal discovery.

Feed filters should be introduced only for categories with real data: All, Emergencies, My cases, Community. Do not show filter categories that are empty by design or unsupported by actual sources.

## Feed item contract

Every item should have:
- stable source ID and type;
- human-readable title and concise summary;
- source creation/update timestamp;
- urgency/category only when grounded in stored data;
- an internal application destination that is valid for the current role;
- an explicit visibility rule applied server-side.

The API must use a deterministic sort (urgency first where justified, then timestamp) and a bounded page size. Never fetch unbounded tables or trust a client-supplied user ID for authorization.

## Implementation phases

### Phase 0 — Baseline and design guardrails
- Inspect current dashboard, authenticated case API, app navigation, and existing stories/notification APIs.
- Confirm available schemas and existing visibility rules before combining sources.
- Record files changed and tests/results in the tracker.

### Phase 1 — Useful, safe activity feed MVP
- Add a server-side authenticated feed endpoint that composes only existing, permission-filtered records.
- Start with a source only when its model and destination are confirmed; open rescue cases are the initial candidate.
- Keep personal case visibility aligned with existing case API rules.
- Add loading, retry, error, empty, refresh, and category filter states.
- Do not add polling/realtime unless the existing backend supports it and the experience benefits.

### Phase 2 — Home integration
- Introduce the activity hub without removing existing dashboard sections.
- Keep quick actions visible near the top.
- Show “Updated at” and a manual refresh control.
- Announce refresh/new-item status accessibly; do not auto-insert/reorder items while a user is reading.
- Preserve all existing navigation and dashboard capabilities.

### Phase 3 — Additional verified sources
- Add community stories, adoption/foster, verified drives, and case status changes only after verifying schemas, publication state, permissions, and valid destination routes.
- Avoid duplicate records where notifications already cover the same event.
- Role-tailor staff/NGO operational queues instead of showing citizens' data to them or vice versa.

### Phase 4 — Verification
- Typecheck, lint relevant files, run targeted tests, and build if available.
- Review role/permission and data-leak scenarios, sparse/empty data, stale data, API failure, narrow viewport, keyboard navigation, and screen-reader announcements.
- Verify the deployed preview before proposing merge to `Working`.

## Acceptance criteria (product usefulness, not appearance)

- A signed-in user can reach core actions without scrolling through a feed.
- No fake, stale-looking, duplicate, or unauthorized items are shown.
- Each item has a real source and a useful destination.
- API failures do not hide the rest of Home; the user can retry.
- Empty feed explains that there are no new updates and offers a meaningful next action.
- Manual refresh does not unexpectedly move content under the user's cursor.
- Existing profile, case list, collectives, nearby animal and impact sections continue to work.
- No production branch edits or merges happen without explicit user approval.

## Research notes

This direction follows established UX patterns:
- Nielsen Norman Group's dashboard guidance emphasizes quick at-a-glance information users can act on: https://www.nngroup.com/articles/dashboards-preattentive/
- Activity-feed patterns should retain context, action links, filters, and manageable pagination: https://uxpatterns.dev/patterns/social/activity-feed
- GOV.UK notification guidance recommends using high-priority notifications sparingly: https://design-system.service.gov.uk/components/notification-banner/
- WCAG 2.2 guidance covers controls for qualifying auto-updating content: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide

These are design inputs, not evidence that a specific feature exists in this repository. Implementation must be based on verified application schemas and permissions.
