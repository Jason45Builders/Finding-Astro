# Deployment Guide

## Prerequisites

- Vercel account
- Supabase account

## Steps

### 1. Database Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → **New query**
3. Paste contents of `database/schema.sql` and run it
4. Enable PostGIS: `CREATE EXTENSION IF NOT EXISTS postgis;`
5. Create a storage bucket named `media` (public) for file uploads

### 2. Environment Variables

In Vercel project settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

Find these at: Supabase Dashboard → Settings → API

### 3. Deploy

Connect this GitHub repo to Vercel. The framework auto-detects Next.js.

### 4. Post-Deploy

1. Visit your live URL
2. Sign up a test account
3. Seed some partner clinics/helplines via Supabase table editor
