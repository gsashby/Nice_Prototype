# Security & Authentication

This document describes the current security posture of the prototype, what is intentionally absent, and what would need to be in place before production use.

---

## Current state (prototype only)

### No authentication

There is no login, session, token, or identity layer of any kind. Any request to the Go API or Next.js frontend succeeds without credentials.

The Go API uses a `tenant_id` query parameter to scope database queries, defaulting to the seed tenant UUID (`00000000-0000-0000-0000-000000000001`). This provides data isolation between tenants only if callers are trusted — there is no enforcement.

### No authorisation (RBAC)

All users see all data. There are no roles, permissions, or access policies applied to API endpoints or UI routes.

### API key security

The Anthropic API key (`ANTHROPIC_API_KEY`) is the only credential in use. It is handled correctly for a prototype:

- Stored in `apps/web/.env.local` (gitignored — never committed)
- Consumed only in Next.js server-side route handlers (`/api/summarize`, `/api/explain-event`)
- Never bundled into client-side JavaScript
- Never sent to the Go API

The Go API has no secrets of its own. Database credentials (`postgres:postgres`) are hardcoded defaults suitable only for local Docker.

### CORS

The Go API allows CORS from origins listed in `ALLOWED_ORIGINS` (default: `http://localhost:3000`). This is configured via Fiber's built-in CORS middleware. For production this value must be restricted to the actual frontend domain.

### No HTTPS

All local traffic is plain HTTP. There is no TLS termination, certificate management, or HSTS.

### No input sanitisation beyond parameterised queries

The Go API uses pgx parameterised queries (`$1`, `$2`, …) throughout — SQL injection is not possible via the API layer. However, there is no validation on free-text fields beyond the `severity` enum check on `POST /api/v1/policies`. The `search` filter is passed directly to an `ILIKE` pattern, which is safe from injection but could be used to enumerate data.

### No rate limiting

Any client can make unlimited requests to any endpoint. There is no throttling, IP-based limiting, or abuse detection.

---

## What needs to be added before production

### 1. Authentication

| Option | Notes |
|---|---|
| **NICE CXone SSO** | Most appropriate for the target environment — integrate via SAML 2.0 or OIDC against the CXone identity provider |
| **Auth0 / Clerk / Cognito** | SaaS identity providers; fast to integrate with Next.js via their SDKs |
| **Custom JWT** | Go API validates a signed JWT on each request; Next.js middleware passes the token through |

The recommended pattern for this stack:
- Next.js middleware (`middleware.ts`) intercepts unauthenticated requests and redirects to login
- Authenticated session stored as an encrypted cookie (Next.js `iron-session` or similar)
- Every API request from Next.js to the Go API includes a bearer token in the `Authorization` header
- Go API middleware validates the token before any handler runs

### 2. Authorisation (RBAC)

Suggested roles for a governance platform:

| Role | Access |
|---|---|
| **Viewer** | Read-only access to all dashboards and audit log |
| **Analyst** | Viewer + NLQ, export, and drill-down features |
| **Policy Admin** | Analyst + create/toggle policies |
| **Tenant Admin** | Policy Admin + manage users and tenant settings |

Implementation: roles stored in a `users` table (linked to `tenant_id`), checked in the Go API middleware before handler execution.

### 3. Tenant isolation enforcement

Currently `tenant_id` is a query parameter — any caller can request data from any tenant. In production:
- `tenant_id` must be derived from the authenticated user's JWT claims, not from a query parameter
- The Go API must reject any request where the claimed tenant ID does not match the authenticated user's tenant

### 4. Secret management

| Secret | Current | Production |
|---|---|---|
| `ANTHROPIC_API_KEY` | `.env.local` (local only) | AWS Secrets Manager / Vault / GCP Secret Manager |
| `DATABASE_URL` | `.env` with default credentials | Secrets manager; rotate credentials regularly |
| JWT signing key | N/A | Secrets manager; RS256 asymmetric key pair |

### 5. HTTPS / TLS

All traffic in production must be encrypted. Typical setup:
- TLS termination at a load balancer or reverse proxy (nginx, AWS ALB, Cloudflare)
- Go API and Next.js serve on plain HTTP behind the terminator
- HSTS header set on the frontend

### 6. API hardening

| Item | Action |
|---|---|
| Rate limiting | Add Fiber rate limiter middleware; stricter limits on auth endpoints |
| Request size limits | Fiber's default is 4MB; audit log exports could be large — enforce a reasonable limit |
| CORS locked down | Set `ALLOWED_ORIGINS` to the exact production frontend URL |
| Audit log of admin actions | Policy creates/toggles should be logged to `audit_events` or a separate admin log |
| `search` field limits | Cap length at ~200 chars to prevent abuse of the ILIKE query |

### 7. Anthropic API key rotation

The key used in `apps/web/.env.local` should be rotated regularly and revoked if the repository is ever made public. Check via: `git log --all --full-history -- "**/.env*"` to confirm it has never been committed.

---

## Security properties that are already correct

| Property | How |
|---|---|
| Anthropic key never reaches the browser | Next.js server-side route handlers; key is not prefixed `NEXT_PUBLIC_` |
| SQL injection not possible | pgx parameterised queries throughout the Go API |
| XSS — React escapes by default | No `dangerouslySetInnerHTML` usage; all dynamic content rendered via JSX |
| Sensitive data not committed | `.env.local` is in `.gitignore`; seed data uses synthetic UUIDs |
| Database defaults isolated | Docker postgres uses a named volume and is not exposed beyond localhost |

---

## Summary checklist for production readiness

- [ ] Authentication layer (SSO or JWT)
- [ ] RBAC middleware in Go API
- [ ] `tenant_id` derived from JWT, not query param
- [ ] All secrets moved to a secrets manager
- [ ] HTTPS / TLS termination
- [ ] Rate limiting on all API endpoints
- [ ] CORS restricted to production domain
- [ ] Database credentials rotated from defaults
- [ ] Anthropic API key rotated and stored in secrets manager
- [ ] Audit log of admin actions (policy changes, user management)
