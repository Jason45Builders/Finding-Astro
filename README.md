# Finding Astro

Civic animal welfare platform for Chennai — deployed on **one Vercel project** with **one Supabase project**.

**Stack:** Next.js 15 (web + API routes), Supabase (Auth + Database + Storage + PostGIS)

## Quick Start (local)

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp apps/web/.env.local.example apps/web/.env.local

# 3. Start dev server
npm --workspace apps/web run dev
# → http://localhost:3000
# → API at http://localhost:3000/api/v1/*
```

## Deploy to Vercel + Supabase

### 1. Supabase (one project)

1. Go to [supabase.com](https://supabase.com), create a project
2. In **SQL Editor**, paste and run the contents of `supabase/migrations/20260626105700_initial_schema.sql`
3. In **Storage**, create a bucket named `finding-astro-media` (set to Public)
4. From **Settings → API**, note down:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. From **Settings → API → Service Role**, copy `SUPABASE_SERVICE_ROLE_KEY`

### 2. Vercel (one project)

1. Go to [vercel.com/new](https://vercel.com/new), import this repo
2. **Root Directory:** `apps/web`
3. Framework: **Next.js** (auto-detected)
4. Add these three environment variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ← your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ← Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ← Supabase service role key (server-only) |
| `JWT_SECRET` | run `openssl rand -hex 32` and paste output |
| `DATABASE_URL` | Supabase Postgres URI (Settings → Database → Connection String → URI format) |
| `CORS_ORIGIN` | `https://your-project.vercel.app` |
| `NODE_ENV` | `production` |

5. Deploy

### 3. After first deploy

- Your frontend is live at `https://your-project.vercel.app`
- API is at `https://your-project.vercel.app/api/v1/*`
- Update `CORS_ORIGIN` to include the actual Vercel URL and redeploy

## Admin Dashboard

The admin dashboard lives at `apps/admin-dashboard/`. Deploy it as a **second Vercel project** with root directory `apps/admin-dashboard` and env var:
- `NEXT_PUBLIC_API_BASE_URL` = `https://your-main-project.vercel.app/api/v1`

## Mobile

The Expo app at `apps/mobile/` uses `NEXT_PUBLIC_API_BASE_URL` from EAS build profiles (see `apps/mobile/eas.json`).

## Architecture

Everything runs in **one Vercel project**:

```
vercel project (apps/web root)
├── Next.js pages  →  http://your-app.vercel.app/
├── Next.js API routes  →  /api/v1/auth/*, /api/v1/animals/*, ...
│                            backed by Supabase (service role key, bypasses RLS)
└── Supabase Storage  →  file uploads (replaces old Cloudflare R2)
        └── Bucket: finding-astro-media (public)

Supabase project (database)
├── PostgreSQL 15 + PostGIS 3.4
├── 53 tables, enums, views, triggers
└── Auth (optional — currently using JWT)
```

## File Uploads

The old Express backend used Cloudflare R2 (AWS S3 SDK). It now uses **Supabase Storage** (bucket: `finding-astro-media`). Upload flow:

1. Client sends file to `POST /api/v1/media/presign`
2. API route uploads to Supabase Storage and returns public URL
3. File is accessible at `https://<project>.supabase.co/storage/v1/object/public/finding-astro-media/...`

No presigned-URL dance needed — direct upload via server-side service role key.

## Environment Variables

### Required (Vercel)

| Variable | Used In | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + API | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + API | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | API only | Supabase service role (bypasses RLS) |
| `JWT_SECRET` | API only | Generate with `openssl rand -hex 32` |
| `DATABASE_URL` | API only | Supabase Postgres connection URI |
| `CORS_ORIGIN` | API only | Your Vercel domain |

## Local Development

Run the dev server which serves both the web app and API routes:

```bash
npm --workspace apps/web run dev
```

## Project Structure

| Path | Description |
|------|-------------|
| `apps/web/app/api/v1/` | All backend API routes (Next.js Serverless) |
| `apps/web/app/` | Next.js App Router pages |
| `apps/web/lib/` | Supabase clients, JWT, auth middleware |
| `supabase/migrations/` | Database schema (53 tables + PostGIS) |
| `apps/admin-dashboard/` | Admin panel (separate Vercel deployment) |
| `apps/mobile/` | Expo React Native app |

## Switching Back to the Old Express Backend

The old Express backend is archived. To restore it, check the git history before the migration commit.
