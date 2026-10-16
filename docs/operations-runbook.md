# Operations Runbook — Legendary Esports Platform

## 1. Deployment Steps

### Vercel (Web App)

1. Go to [vercel.com](https://vercel.com) and create a new project.
2. Import the repository (`dev-rockstar23/Tournament-Bot`).
3. Set the root directory to `esports-platform` (or configure via `vercel.json` at repo root).
4. Set the following environment variables in the Vercel project settings:

   | Variable | Description |
   |---|---|
   | `DATABASE_URL` | PostgreSQL connection string from Supabase |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
   | `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
   | `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
   | `DISCORD_CLIENT_ID` | Discord OAuth application client ID |
   | `DISCORD_CLIENT_SECRET` | Discord OAuth application client secret |
   | `NEXT_PUBLIC_APP_URL` | Public URL of the deployed web app |
   | `PAYMENTS_ENABLED` | Set to `false` to disable payment flows |

5. Click **Deploy**. Vercel uses `infrastructure/deployment/vercel.json` for build settings automatically when placed at the project root, or configure them manually in the dashboard.

### Render (Discord Bot + BullMQ Worker)

1. Go to [render.com](https://render.com) and click **New → Blueprint**.
2. Connect your GitHub repository and point Render to `infrastructure/deployment/render.yaml`.
3. Render will detect both background worker services (`discord-bot` and `bullmq-worker`).
4. For each service, set the following environment variables (marked `sync: false` in the YAML — you must supply them manually):

   | Variable | Description |
   |---|---|
   | `DISCORD_BOT_TOKEN` | Bot token from Discord Developer Portal |
   | `SUPABASE_URL` | Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
   | `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
   | `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

5. `NODE_ENV` and `PAYMENTS_ENABLED` are set automatically by the YAML.
6. Click **Apply** to deploy both services.

---

## 2. Re-enqueue Failed Outbox Events

If outbox events get stuck in `FAILED` status, run this SQL to reset them to `PENDING` so the worker picks them up again:

```sql
UPDATE "OutboxEvent"
SET status = 'PENDING', "updatedAt" = NOW()
WHERE status = 'FAILED'
  AND "createdAt" > NOW() - INTERVAL '24 hours';
```

Run this via the **Supabase SQL Editor** (Dashboard → SQL Editor) or via `psql` with your `DATABASE_URL`. Only events from the last 24 hours are re-enqueued to avoid reprocessing stale data.

---

## 3. Check Integration Health

```
GET /api/health
```

No authentication required. Returns a JSON body:

```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "outboxBacklog": 0
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Field explanations:**

- `status` — Overall system health:
  - `"ok"` — All systems operational.
  - `"degraded"` — Redis is unreachable OR more than 10 outbox events are stuck (older than 2 minutes). The app is functional but some background processing may be delayed.
  - `"down"` — The database is unreachable. The app cannot serve most requests. HTTP status 503 is returned.
- `checks.database` — `"ok"` if `SELECT 1` succeeds, `"error"` if it throws.
- `checks.redis` — `"ok"` if `PING` succeeds against Upstash Redis, `"error"` if it throws.
- `checks.outboxBacklog` — Count of `PENDING` outbox events older than 2 minutes. A high number means the BullMQ worker may be down or lagging.
- `timestamp` — ISO 8601 time the health check ran.

HTTP status codes: `200` for `ok` or `degraded`, `503` for `down`.

---

## 4. Rotate Discord Bot Token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and select your bot application.
2. Navigate to **Bot** → **Token** → click **Reset Token**.
3. Copy the new token.
4. Go to [render.com](https://render.com) → select the `discord-bot` service → **Environment**.
5. Update `DISCORD_BOT_TOKEN` with the new token and save.
6. Render will automatically redeploy the `discord-bot` service with the new token.
7. Repeat steps 4–6 for the `bullmq-worker` service if it also uses the bot token.

---

## 5. Supabase Backup Restoration

1. Go to the [Supabase Dashboard](https://app.supabase.com) and select your project.
2. Navigate to **Settings** → **Backups**.
3. Choose the backup point you want to restore from (daily backups are available on Pro plan; point-in-time recovery on higher plans).
4. Click **Restore** and confirm.
5. The restore process triggers approximately **5 minutes of downtime**. Plan accordingly and notify users in advance.
6. After restoration, verify the database is reachable via `GET /api/health` before routing traffic back.

---

## 6. Alert Response Table

| Alert | Trigger Condition | Severity | Response Steps |
|---|---|---|---|
| Failed outbox events | `outboxBacklog > 10` for > 5 min | Warning | Run the re-enqueue SQL from Section 2; check worker logs in Render |
| Overdue jobs | BullMQ queue depth > 100 for > 10 min | Warning | Inspect queue via Redis CLI; restart `bullmq-worker` service in Render |
| Discord API spikes | HTTP 429 responses from Discord | Warning | Rate-limit backoff is automatic; check logs for sustained 429s over > 10 min |
| Worker crash | Render service restarts > 3 in 5 min | Critical | Check Render logs; verify env vars are set correctly; redeploy if config changed |
| Database down | `/api/health` returns `status: "down"` | Critical | Check Supabase dashboard status; verify `DATABASE_URL` env var in all services |
