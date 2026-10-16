# ✅ Supabase Keys Explained

Your Supabase project: **krpdzczispznbymjxsoe**

## Keys You Have

| Key Name | Value | Usage |
|----------|-------|-------|
| **Anon Key (Public)** | `eyJhbGci...PDe0` | ✅ Safe to expose in browser |
| **Service Role Key** | `eyJhbGci...IPc` | ⚠️ NEVER expose to browser (server-only) |
| **Project ID** | `krpdzczispznbymjxsoe` | Used to build URL |

## Environment Variables Mapping

```bash
# Server-side (API routes, Discord bot, Worker)
SUPABASE_URL=https://krpdzczispznbymjxsoe.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...PDe0          # ✅ Can use anon key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...IPc   # ⚠️ Full admin access

# Client-side (React components in browser)
NEXT_PUBLIC_SUPABASE_URL=https://krpdzczispznbymjxsoe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...PDe0   # ✅ Safe for browser
```

## Key Differences

### 🟢 Anon Key (Public)
- **Purpose**: Client-side database queries
- **Security**: Row-Level Security (RLS) policies enforced
- **Safe to expose**: Yes, included in browser bundles
- **Use for**: React components, public API calls

### 🔴 Service Role Key (Secret)
- **Purpose**: Admin operations, bypass RLS
- **Security**: Full database access, no restrictions
- **Safe to expose**: NO! Server-only
- **Use for**: API routes, Discord bot, Worker background jobs

## Why Duplicate Keys?

In Next.js, environment variables work like this:

1. **Without `NEXT_PUBLIC_` prefix** → Server-side only (API routes, SSR)
2. **With `NEXT_PUBLIC_` prefix** → Exposed to browser (client components)

So you need:
- `SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_URL` (same value)
- `SUPABASE_ANON_KEY` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same value)

## ⚠️ NEVER Expose Service Role Key

```typescript
// ❌ WRONG - Don't use service role in browser
'use client'
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)

// ✅ CORRECT - Use anon key in browser
'use client'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ✅ CORRECT - Use service role on server
// app/api/admin/route.ts
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

## Current Setup

I've created `.env.local` with your Supabase keys pre-filled. Just add:
1. Discord credentials (from discord.com/developers)
2. Upstash Redis credentials (from console.upstash.com)

Then run:
```bash
cd packages/database
pnpm prisma migrate dev
```

## Other Keys You Mentioned

- **Publishable API Key** (`sb_publishable_...`) → Not used in this project (only for Supabase client libraries)
- **Secret Key** (`sb_secret_...`) → Not used in this project

You only need the **Anon Key** and **Service Role Key** (already in `.env.local`).
