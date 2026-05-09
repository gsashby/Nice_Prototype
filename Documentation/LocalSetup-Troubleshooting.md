# Local Setup & Troubleshooting

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | ≥ 20 | `node --version` |
| npm | ≥ 11 | `npm --version` |
| Go | ≥ 1.22 | `go version` |
| Docker Desktop | Latest | `docker info` |

---

## First-time setup (in order)

```bash
# 1. Install all JS dependencies from the repo root
npm install

# 2. Start the database containers
npm run db:up

# 3. Wait ~10 seconds for PostgreSQL to be ready, then run the Go seed tool
cd apps/api
make seed

# 4. Start the Go API (keep this terminal open)
make run

# 5. In a new terminal, set up the frontend env and start Next.js
cp apps/web/.env.local.example apps/web/.env.local   # if this file exists, otherwise create it manually
npm run dev   # from repo root
```

The app should now be available at http://localhost:3000.

---

## Environment files

### `apps/api/.env`

```env
API_PORT=8080
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_trust_center
REDIS_URL=redis://localhost:6379/0
```

If this file is missing, the API falls back to the same defaults — so it will still work against a local Docker DB without the file.

### `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
ANTHROPIC_API_KEY=sk-ant-...
```

- `NEXT_PUBLIC_API_URL` — if missing, the frontend will fail to load any data (all API calls go nowhere).
- `ANTHROPIC_API_KEY` — only required for "Summarize with AI" and "Explain with AI". Without it those buttons return a 500 error. Everything else works.

---

## Common problems and fixes

---

### Pages won't load / blank screen

**Cause 1 — Next.js dev server not started.**
```bash
npm run dev   # from repo root
```

**Cause 2 — Stale `.next` cache** (common after pulling new commits that change config).
```bash
rm -rf apps/web/.next
npm run dev
```

**Cause 3 — Multiple Next.js processes running** after a hard restart or previous crash.
```bash
# Find and kill stale next processes
kill $(ps aux | grep "next dev" | grep -v grep | awk '{print $2}') 2>/dev/null
npm run dev
```

---

### Dashboard shows no data / "Failed to load" error

**Cause 1 — API not running.**
```bash
cd apps/api && make run
```
Confirm it's up: `curl http://localhost:8080/health` should return `{"status":"ok"}`.

**Cause 2 — Database not running.**
```bash
npm run db:up
```
Then restart the API.

**Cause 3 — `NEXT_PUBLIC_API_URL` not set in `.env.local`.**
Create `apps/web/.env.local` with:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```
Then restart the Next.js dev server (env var changes require a restart).

---

### `make seed` fails with "ping database" error

**Cause — Database container not ready yet.**

Wait 10–15 seconds after `npm run db:up` before running `make seed`. The PostgreSQL container takes a moment to initialise on first start.

```bash
# Confirm postgres is healthy before seeding
docker ps | grep aitc_postgres
# Should show (healthy) in the STATUS column
```

---

### API fails to start — "port 8080 already in use"

**Cause — Previous API process still running.**
```bash
lsof -ti:8080 | xargs kill -9
cd apps/api && make run
```

---

### `turbo` fails with "Found an unknown key 'globalDotEnv'"

**Cause — Old `turbo.json` config.**  Turborepo 2.x removed the `globalDotEnv` key. Remove it from `turbo.json`:

```json
// Remove this line if present:
"globalDotEnv": [".env.local"]
```

---

### Search icon overlaps with input text (filter bar)

**Cause — CSS cascade layer issue.** An unlayered `* { padding: 0 }` reset in `globals.css` was overriding Tailwind's `@layer utilities`. Fixed in the codebase by wrapping the reset in `@layer base`:

```css
@layer base {
  * { box-sizing: border-box; padding: 0; margin: 0; }
}
```

If this symptom reappears, check that `globals.css` does not have any unlayered reset rules outside `@layer base`.

---

### "Cannot update a component while rendering a different component" React error

**Cause — Calling a parent state setter directly during a child's render.**  
The symptom is `onTotalChange(total)` being called inside the render of `AuditLogTable`. Fixed by wrapping in a `useEffect`:

```tsx
useEffect(() => {
  if (onTotalChange && total > 0) onTotalChange(total);
}, [total, onTotalChange]);
```

If this appears in a new component, move any parent state calls into a `useEffect`.

---

### "Summarize with AI" / "Explain with AI" returns an error

**Cause 1 — `ANTHROPIC_API_KEY` not set.**  
Add it to `apps/web/.env.local` and restart the Next.js dev server.

**Cause 2 — Invalid or expired key.**  
The error message from the route handler will include the Anthropic API error. Check the browser network tab for the response body from `/api/summarize` or `/api/explain-event`.

---

### Database has no data after `npm run db:up`

**Cause — Docker volume already existed from a previous run, so the init scripts did not re-run.**  
Docker only runs `init/` scripts on a fresh volume. To force a re-initialise:

```bash
npm run db:reset   # wipes volumes and recreates from scratch
# Then re-seed:
cd apps/api && make seed
```

---

### `make seed` inserts duplicate data

The seed tool uses `ON CONFLICT DO NOTHING` for tenants and policies, and `ON CONFLICT (id) DO UPDATE` for models. Running it multiple times is safe — it will not create duplicate records. Audit events do not have a uniqueness constraint, so running `make seed` multiple times will add more event rows each time. Run `npm run db:reset` to start clean.

---

## Useful diagnostic commands

```bash
# Check all running containers and their health
docker ps

# View PostgreSQL logs
docker logs aitc_postgres

# Connect to the database directly
docker exec -it aitc_postgres psql -U postgres -d ai_trust_center

# Count records in each table
docker exec -it aitc_postgres psql -U postgres -d ai_trust_center \
  -c "SELECT 'tenants' AS t, COUNT(*) FROM tenants UNION ALL
      SELECT 'ai_models', COUNT(*) FROM ai_models UNION ALL
      SELECT 'policies', COUNT(*) FROM policies UNION ALL
      SELECT 'audit_events', COUNT(*) FROM audit_events;"

# Test the Go API health
curl http://localhost:8080/health

# Test a live audit log query
curl "http://localhost:8080/api/v1/audit-log?page=1&page_size=5" | jq .

# Check what's listening on key ports
lsof -i :3000   # Next.js
lsof -i :8080   # Go API
lsof -i :5432   # PostgreSQL
```

---

## Resetting to a clean state

```bash
# Stop everything
npm run db:down
kill $(ps aux | grep "next dev\|go run" | grep -v grep | awk '{print $2}') 2>/dev/null

# Wipe Docker volumes and rebuild
npm run db:reset

# Clear Next.js cache
rm -rf apps/web/.next

# Re-seed and restart
cd apps/api && make seed && make run &
cd ../.. && npm run dev
```
