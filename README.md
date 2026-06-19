# Finding Astro

Finding Astro is a citizen platform for animal welfare and accountability. It combines a geospatial backend, a React Native mobile app, and a Next.js admin dashboard to support animal memory records, lost-and-found matching, rescue and abuse case management, ABC tracking, conflict resolution, and citizen notifications.

## Monorepo Structure

- `backend`: Express + TypeScript API with PostgreSQL and PostGIS
- `apps/mobile`: React Native mobile client
- `apps/admin-dashboard`: Next.js admin dashboard
- `database`: schema and seed scripts
- `infra`: Docker and Nginx configuration
- `docs`: API, system design, and database references

## Core Capabilities

- Animal memory system with duplicate detection and geo search
- Lost and found reporting with match suggestions
- Rescue, abuse, conflict, and lost-pet case workflows
- ABC request and tracking flow with geo-return validation
- OTP authentication with JWT sessions
- Event notifications
- Legal knowledge hub

## Quick Start

1. Start PostgreSQL with PostGIS:

```bash
docker compose up -d db
```

2. Apply schema and seed data:

```bash
sh ./scripts/seed.sh
```

3. Install dependencies:

```bash
npm install
```

4. Run the services you need:

```bash
npm run dev:backend
npm run dev:dashboard
npm run dev:mobile
```

## Environment

Root `.env` provides local development defaults for Docker and service startup. `backend/.env` contains runtime values consumed by the API. Update `JWT_SECRET`, database credentials, and CORS origin before production deployment.

## API Base URL

- Local backend: `http://localhost:4000/api/v1`
- Health check: `http://localhost:4000/health`

## Production Notes

- Use a managed PostgreSQL instance with PostGIS enabled
- Rotate `JWT_SECRET`
- Replace mock OTP delivery with a real SMS provider
- Point mobile and dashboard clients at the deployed backend URL
