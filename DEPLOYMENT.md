# 🚀 Deployment Guide — Production Setup

## Overview

Your platform uses a **3-tier deployment** strategy:

| Component | Platform | Why |
|-----------|----------|-----|
| **Web App** | Vercel | Serverless Next.js, auto-scaling, edge caching |
| **Discord Bot** | Render | Persistent WebSocket, always-on |
| **BullMQ Worker** | Render | Background jobs, queue processing |

All three services share:
- **Supabase PostgreSQL** (database)
- **Upstash Redis** (job queue)
- **Supabase Realtime** (live updates)

---

## Prerequisites

### 1. Accounts Needed
- ✅ **GitHub** — Code repository
- ✅ **Vercel** — Web app hosting (free tier)
- ⚠️ **Render** — Bot + worker hosting (free tier)
- ✅ **Supabase** — Database (already set up)
- ⚠️ **Upstash** — Redis (need to create)
- ✅ **Discord** — Bot application (need credentials)

### 2. Credentials Checklist
- [ ] Discord CLIENT_ID, CLIENT_SECRET, BOT_TOKEN
- [ ] Upstash REDIS_URL, REDIS_TOKEN
- [x] Supabase URL, ANON_KEY, SERVICE_ROLE_KEY (already have)

---

## Part 1: Deploy Web App (Vercel)

### Step 1: Connect Repository

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select: `dev-rockstar23/Tournament-Bot`
4. Click **"Import"**

### Step 2: Configure Project

**Project Settings:**
```
Project Name: legendary-esports
Framework Preset: Next.js
Root Directory: esports-platform
Node.js Version: 20.x
```

**Build Settings** (Auto-detected from `vercel.json`):
```
Build Command: pnpm --filter web build
Output Directory: apps/web/.next
Install Command: pnpm install --frozen-lockfile
```

### Step 3: Add Environment Variables

Click **"Environment Variables"** and add these:

#### Supabase (Already Have ✅)
```bash
SUPABASE_URL=https://krpdzczispznbymjxsoe.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...PDe0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...IPc
NEXT_PUBLIC_SUPABASE_URL=https://krpdzczispznbymjxsoe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...PDe0
```

#### Discord (Need to Get)
```bash
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_REDIRECT_URI=https://your-domain.vercel.app/api/auth/callback
```

#### Upstash Redis (Need to Get)
```bash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

#### App Config
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
PAYMENTS_ENABLED=false
```

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Note your deployment URL: `https://tournament-bot-xyz.vercel.app`

### Step 5: Update Discord Redirect URI

1. Go to Discord Developer Portal
2. OAuth2 → Redirects
3. Add: `https://tournament-bot-xyz.vercel.app/api/auth/callback`
4. Save Changes

---

## Part 2: Get Upstash Redis Credentials

### Create Upstash Database

1. Go to https://console.upstash.com
2. Sign up/login (free tier)
3. Click **"Create Database"**
4. Settings:
   ```
   Name: esports-redis
   Type: Regional
   Region: US East (or closest to Supabase)
   Primary: Yes
   ```
5. Click **"Create"**

### Copy Credentials

On the database page, copy:

```bash
UPSTASH_REDIS_REST_URL=https://us1-abc123.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXjaK1234...
```

### Add to Vercel

1. Go to Vercel project → Settings → Environment Variables
2. Add `UPSTASH_REDIS_REST_URL`
3. Add `UPSTASH_REDIS_REST_TOKEN`
4. Redeploy (trigger new deployment)

---

## Part 3: Deploy Discord Bot (Render)

### Step 1: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub (recommended)

### Step 2: Create Background Worker

1. Click **"New +"** → **"Background Worker"**
2. Connect GitHub repository: `dev-rockstar23/Tournament-Bot`

### Step 3: Configure Worker

**Basic Settings:**
```
Name: esports-discord-bot
Region: Ohio (US East) - closest to Supabase
Branch: main
Root Directory: esports-platform
```

**Build Settings:**
```
Build Command: pnpm install && pnpm --filter discord-bot build
Start Command: node apps/discord-bot/dist/index.js
```

**Instance Type:**
```
Free
```

### Step 4: Add Environment Variables

Click **"Environment"** tab and add:

```bash
# Discord
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token

# Supabase
SUPABASE_URL=https://krpdzczispznbymjxsoe.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...PDe0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...IPc

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://us1-abc123.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXjaK1234...

# App
NODE_ENV=production
```

### Step 5: Deploy

1. Click **"Create Background Worker"**
2. Wait for build (3-5 minutes)
3. Check logs: Should see `✅ Bot logged in as YourBotName#1234`

---

## Part 4: Deploy BullMQ Worker (Render)

### Step 1: Create Second Background Worker

1. Click **"New +"** → **"Background Worker"**
2. Select same repository: `dev-rockstar23/Tournament-Bot`

### Step 2: Configure Worker

**Basic Settings:**
```
Name: esports-worker
Region: Ohio (US East)
Branch: main
Root Directory: esports-platform
```

**Build Settings:**
```
Build Command: pnpm install && pnpm --filter worker build
Start Command: node apps/worker/dist/index.js
```

**Instance Type:**
```
Free
```

### Step 3: Add Environment Variables

Same as Discord bot (copy from bot):

```bash
DISCORD_BOT_TOKEN=your_bot_token
SUPABASE_URL=https://krpdzczispznbymjxsoe.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...PDe0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...IPc
UPSTASH_REDIS_REST_URL=https://us1-abc123.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXjaK1234...
NODE_ENV=production
```

### Step 4: Deploy

1. Click **"Create Background Worker"**
2. Wait for build (3-5 minutes)
3. Check logs: Should see `✅ Worker connected to Redis`

---

## Part 5: Run Database Migrations

### Option A: From Local Machine

```bash
cd packages/database
pnpm prisma migrate deploy
```

### Option B: From Render Shell

1. Go to Render → esports-worker → Shell tab
2. Run:
   ```bash
   cd packages/database
   npx prisma migrate deploy
   ```

---

## Part 6: Verify Deployment

### Test Web App

1. Visit: `https://your-domain.vercel.app`
2. Click **"Login with Discord"**
3. Authorize application
4. Select a Discord server
5. Should see server dashboard

### Test Discord Bot

1. Invite bot to your Discord server:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
   ```
2. In Discord, run: `/server setup`
3. Bot should respond with setup wizard

### Test Worker

1. Create a tournament (website or Discord)
2. Check Render worker logs
3. Should see: `Processing outbox event: TOURNAMENT_PUBLISHED`

### Test Real-Time Updates

1. Open tournament page on website
2. In Discord, update tournament status
3. Website should update automatically (no refresh needed)

---

## Part 7: Custom Domain (Optional)

### Add Custom Domain to Vercel

1. Go to Vercel project → Settings → Domains
2. Add your domain: `tournaments.yourdomain.com`
3. Add DNS records (Vercel provides instructions)

### Update Environment Variables

1. Vercel → Settings → Environment Variables
2. Update:
   ```bash
   NEXT_PUBLIC_APP_URL=https://tournaments.yourdomain.com
   DISCORD_REDIRECT_URI=https://tournaments.yourdomain.com/api/auth/callback
   ```
3. Redeploy

### Update Discord Application

1. Discord Developer Portal → OAuth2
2. Add new redirect:
   ```
   https://tournaments.yourdomain.com/api/auth/callback
   ```

---

## Monitoring & Logs

### Vercel (Web App)

**View Logs:**
1. Project → Deployments → Latest → View Logs
2. Real-time request logs
3. Build logs

**Analytics:**
1. Project → Analytics
2. Request counts, response times
3. Error rates

### Render (Bot + Worker)

**View Logs:**
1. Service → Logs tab
2. Real-time stdout/stderr
3. Filter by time range

**Metrics:**
1. Service → Metrics tab
2. CPU, memory usage
3. Restart history

### Supabase (Database)

**View Logs:**
1. Project → Database → Logs
2. Query logs
3. Connection stats

**Table Editor:**
1. Project → Table Editor
2. View data directly
3. Run SQL queries

---

## Troubleshooting

### "Invalid OAuth2 redirect_uri"

**Cause:** Discord redirect URI doesn't match Vercel domain

**Fix:**
1. Check Vercel deployment URL
2. Update Discord redirect URI to match exactly
3. Update `DISCORD_REDIRECT_URI` env var in Vercel
4. Redeploy

### Bot Offline / Not Responding

**Cause:** Bot crashed or invalid token

**Fix:**
1. Check Render logs for errors
2. Verify `DISCORD_BOT_TOKEN` is correct
3. Check bot intents are enabled in Discord portal
4. Restart Render service

### "Database connection failed"

**Cause:** Invalid Supabase credentials or IP whitelist

**Fix:**
1. Verify `SUPABASE_URL` is correct
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Check Supabase → Settings → API → Connection pooling
4. Ensure no IP restrictions (Vercel/Render IPs change)

### Worker Not Processing Jobs

**Cause:** Redis connection failed or queue not registered

**Fix:**
1. Check Render worker logs
2. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Check Upstash dashboard for connection errors
4. Restart worker service

### "Next.js Build Failed"

**Cause:** Missing environment variables during build

**Fix:**
1. Check Vercel build logs
2. Ensure all `NEXT_PUBLIC_*` vars are set before build
3. TypeScript errors (should have been caught locally)
4. Clear build cache and redeploy

---

## Cost Breakdown (Free Tier)

| Service | Free Tier Limits | Upgrade Needed When |
|---------|-----------------|---------------------|
| **Vercel** | 100GB bandwidth, unlimited deployments | >100GB traffic/month |
| **Render** | 750 hours/month (2 services = 375h each) | Need 24/7 uptime for both |
| **Supabase** | 500MB database, 1GB storage, 50k realtime messages | >500MB data or >50k events/month |
| **Upstash** | 10k commands/day | >10k Redis ops/day |

**Expected Traffic (Small Platform):**
- 100 active users/day
- 10 tournaments/day
- Stay within free tier ✅

**When to Upgrade:**
- Render: $7/month per service (always-on)
- Supabase: $25/month (Pro tier)
- Upstash: $10/month (10k-100k commands)
- Vercel: Usually stays free (generous limits)

---

## Deployment Checklist

### Pre-Deployment
- [x] Code pushed to GitHub
- [x] `vercel.json` in repo root
- [ ] Discord application created
- [ ] Upstash Redis created

### Vercel Deployment
- [ ] Repository connected
- [ ] Environment variables added
- [ ] First deployment successful
- [ ] Discord redirect URI updated

### Render Deployment
- [ ] Discord bot service created
- [ ] Worker service created
- [ ] Both services show "Running"
- [ ] Logs show successful connections

### Database
- [ ] Migrations deployed
- [ ] Sample data added (optional)
- [ ] Backup configured (optional)

### Testing
- [ ] Login with Discord works
- [ ] Bot responds to commands
- [ ] Tournaments can be created
- [ ] Real-time updates work
- [ ] OBS overlay displays

---

## 🎉 You're Live!

Your esports tournament platform is now running in production:

- **Web App**: `https://your-domain.vercel.app`
- **Discord Bot**: Online in your server
- **Background Jobs**: Processing in real-time
- **Database**: Supabase managed
- **Redis**: Upstash managed

**Next Steps:**
1. Invite users to your Discord server
2. Run `/server setup` to configure
3. Create your first tournament
4. Share with your community!

**Need Help?**
- Check logs in Vercel/Render dashboards
- Review error messages in browser console
- Check Discord Developer Portal for OAuth issues
- Review database logs in Supabase

---

**Deployed with ❤️ using Kiro AI**
