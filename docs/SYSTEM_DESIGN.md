# System Design

Finding Astro is organized as a monorepo with three runtime layers.

## Backend

- Express API in TypeScript
- PostgreSQL with PostGIS for location-aware search
- Clean flow of `route -> controller -> service -> repository`
- JWT-based stateless authentication

## Mobile

- React Native client for citizens and field workers
- Redux Toolkit for shared state
- Fetch-based service layer for API access

## Admin Dashboard

- Next.js pages router
- Client-side data fetching against the backend API
- OTP login with token persisted to `localStorage`

## Key Domain Flows

- Animals are stored with geo coordinates and optional photo gallery data
- Lost-pet matching compares nearby sightings with animal profiles
- Cases track rescue, abuse, conflict, lost-pet, and ABC operations
- ABC events preserve the capture-to-return journey and geo validation state
- Notifications are emitted for auth, case, animal, ABC, and conflict events
