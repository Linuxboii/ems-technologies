# Backend + Auth + Client Portal Data — Design Spec

Date: 2026-06-17

## Goal

Replace the hardcoded data arrays in `src/pages/{Sop,Deliverables,Timeline,Payment}.jsx` with a real Postgres-backed FastAPI service, add login (admin + client roles), a one-time seed route, password change, and role-scoped editing:
admin gets full CRUD on all content, the client gets narrow "acknowledge / done / submit" toggles layered on top of admin-set status.

This is the backend half of a two-part effort. A separate spec covers the Welcome page visual redesign.

## Non-goals

- No multi-tenant support (single client/project, "Project Atlas").
- No Alembic / migration history — schema is created via `Base.metadata.create_all()` at startup.
- No automated test suite (matches existing repo convention — verified manually instead).
- No payment gateway integration — "Pay Now" / Razorpay-Stripe mention on the Payment page stays cosmetic; only status bookkeeping (`submit` / `confirm-paid`) is real.
- No file uploads, no comments/notes on items.
- No redesign of page visuals beyond what's needed to fit auth/edit controls into the existing design system (`.card`, `.btn-primary`, etc.) — full visual treatment is the Welcome-page spec's job.

## Architecture

```
ems-technologies/
├── src/                 existing React app
└── backend/             new FastAPI service
    ├── app/
    │   ├── main.py        FastAPI app, CORS, router mounts, create_all() on startup
    │   ├── db.py          SQLAlchemy engine/session
    │   ├── models.py      ORM models
    │   ├── schemas.py     Pydantic request/response models
    │   ├── auth.py         JWT issue/verify, password hash, role-check dependencies
    │   └── routers/
    │       ├── auth.py        login / logout / me / change-password
    │       ├── seed.py        one-time seed route
    │       ├── admin_users.py admin creates client/admin accounts
    │       ├── sop.py
    │       ├── deliverables.py
    │       ├── timeline.py
    │       └── payments.py
    ├── requirements.txt
    └── .env.example
```

- **Stack:** Python + FastAPI + SQLAlchemy (sync, `psycopg2`) + Pydantic v2 + `passlib[bcrypt]` + `python-jose` (JWT).
- **DB:** Postgres, new database `ems_portal`, connection via `admin` / `Parzival@1477` on `localhost:5432`. Connection string in `backend/.env` (`DATABASE_URL`), not committed — `.env.example` documents the shape.
- **Dev wiring:** backend runs on `:8000`. Vite dev server proxies `/api/*` → `http://localhost:8000` via `server.proxy` in `vite.config.js`. Production reverse-proxy config (nginx routing `/api` to uvicorn) is left to actual server deployment, outside this repo's scope.
- **Why no Alembic:** single project DB, schema known upfront, repo otherwise carries minimal tooling (no TS, no test runner). `create_all()` is idempotent and sufficient for v1; Alembic can be introduced later if the schema needs versioned migrations.

## Data Model

5 tables. Status enums match the values already used in the frontend so existing render logic (badge colors, labels) transfers unchanged.

```
users
  id, email (unique), password_hash, role (admin|client), created_at

sop_steps
  id, order_index, icon_key, title, subtitle, duration,
  details (JSON array of strings), status (pending|active|completed)
  -- admin-only edit. Client: read-only, no toggle (process-stage descriptions,
  -- not client-owned checklist items).

deliverables
  id, order_index, icon_key, title, description,
  status (upcoming|in-progress|completed), date, files (int), progress (nullable int),
  client_acknowledged (bool, default false)        -- client-writable

timeline_phases
  id, order_index, phase_label, title, date_range,
  status (upcoming|active|completed), progress (nullable int)

timeline_items
  id, phase_id (FK -> timeline_phases.id), order_index, label, done (bool)
  -- client-writable: done

payment_installments
  id, order_index, installment_label, label, amount (int, INR), due_date,
  status (upcoming|pending|submitted|paid)
  -- client can move upcoming/pending -> submitted only
  -- admin can set any status, incl. confirming submitted -> paid
```

Design rationale: client never overwrites `deliverables.status` / `sop_steps.status` / `timeline_phases.status` directly — those are the admin's source of truth on real progress. Client actions are additive flags (`client_acknowledged`, `done`, `submitted`) so a client toggle can never silently revert admin-recorded progress.

## API Surface & Permissions

```
Auth
  POST /api/auth/login            {email,password} -> sets httpOnly JWT cookie, returns user
  POST /api/auth/logout           clears cookie
  GET  /api/auth/me               current user, or 401
  POST /api/auth/change-password  {old_password,new_password}   any logged-in user

Seed
  POST /api/seed
    No auth required. Returns 409 if any row exists in `users`.
    Otherwise: create_all() tables, insert admin@avlokai.com / admin123 (role=admin),
    insert the current hardcoded demo content (sop/deliverables/timeline/payments)
    as the portal's starting rows.

Admin user management
  POST /api/admin/users   {email, password, role}   admin-only — creates the client account
                                                       (or another admin) post-seed

Content — all GET routes require any authenticated role
  GET    /api/sop
  POST/PUT/DELETE /api/sop/{id}                          admin-only

  GET    /api/deliverables
  POST/PUT/DELETE /api/deliverables/{id}                  admin-only
  PATCH  /api/deliverables/{id}/acknowledge                client-only -> client_acknowledged=true

  GET    /api/timeline                                    phases with nested items
  POST/PUT/DELETE /api/timeline/phases/{id}
  POST/PUT/DELETE /api/timeline/items/{id}                 admin-only
  PATCH  /api/timeline/items/{id}/done   {done: bool}      client or admin

  GET    /api/payments
  POST/PUT/DELETE /api/payments/{id}                       admin-only
  PATCH  /api/payments/{id}/submit                         client-only, pending/upcoming -> submitted
  PATCH  /api/payments/{id}/confirm-paid                   admin-only, submitted -> paid
```

Role enforcement via FastAPI dependencies reading the JWT cookie: `Depends(get_current_user)` for any authenticated role, `Depends(require_role("admin"))` / `require_role("client")` for role-scoped routes. Violations return 401 (no/invalid session) or 403 (wrong role).

## Auth Details

- JWT signed with `JWT_SECRET` env var, 7-day expiry, stored in an httpOnly, `SameSite=Lax` cookie.
- Cookie `secure` flag controlled by `COOKIE_SECURE` env var (`false` in dev over http, `true` in prod behind https).
- Passwords hashed with bcrypt via `passlib`.
- Frontend never reads/stores the token — all requests use `fetch(..., {credentials: 'include'})`; the browser handles the cookie.

## Frontend Integration

- `src/api/client.js` — thin fetch wrapper: base URL `/api`, `credentials: 'include'`, throws an `ApiError` with the server's `detail` message on non-2xx.
- `src/context/AuthContext.jsx` — holds `user`, exposes `login()`, `logout()`, `changePassword()`; calls `GET /api/auth/me` on mount to restore session state.
- `src/pages/Login.jsx` (`/login`) — built from existing tokens/classes (`.card`, `.btn-primary`, `.page-container`); no new visual language here, that's the Welcome-page spec's scope.
- `src/pages/Account.jsx` (`/account`) — change-password form, available to both roles.
- `ProtectedRoute` wrapper added in `App.jsx` — guards `/sop`, `/deliverables`, `/timeline`, `/payment`; redirects to `/login` if no session. `/` (Welcome) stays public.
- The 4 content pages: hardcoded arrays replaced with `useEffect`-driven fetch + loading/error state. Inline admin controls (edit/add/delete, gated on `user.role === 'admin'`) and client controls (acknowledge/done/submit buttons, gated on `user.role === 'client'`) added using existing `.btn-secondary` / `.badge` styling.
- `Navbar.jsx` — shows logged-in user's email + Logout when authenticated, Login link otherwise.

## Error Handling

FastAPI's default `{"detail": "..."}` JSON shape on 4xx/5xx is used as-is (no custom error envelope). The frontend `api/client.js` wrapper surfaces `detail` in a small inline error banner on the page that made the failed call — no toast library added.

## Testing

Repo has no automated test suite today (per existing `CLAUDE.md`) and this addition stays consistent with that — no pytest/vitest introduced. Verification is manual:
- curl smoke tests for every endpoint (documented as steps in the implementation plan): seed, login as admin, login as client, full CRUD as admin, role-scoped PATCHes as client, confirm 403 when client hits an admin-only route.
- Manual click-through in the browser: login/logout, password change, admin inline-edit on each of the 4 pages, client toggle actions, route protection redirect when logged out.

## Open Items Resolved During Brainstorming

- Stack: Python + FastAPI (not Node).
- DB: new `ems_portal` Postgres DB on localhost, using given `admin`/`Parzival@1477` creds.
- Repo layout: `backend/` folder in the same repo.
- Auth: JWT in httpOnly cookie (not localStorage).
- Roles: two — admin (full edit) and client (status-toggle only).
- Tenancy: single client/project, no multi-tenant schema.
- Seed: one-time, no secret key — blocked once any user exists.
- Client account: admin creates it manually post-seed via `POST /api/admin/users` (not pre-seeded).
- Admin editing UX: inline on existing pages, no separate `/admin` dashboard.
- Page access: `/sop`, `/deliverables`, `/timeline`, `/payment` require login once backed by real data.
