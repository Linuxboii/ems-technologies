# VPS Deployment — EMS Portal

Bring-up order on a fresh VPS. The Postgres database is provisioned **here on the
VPS** — never on a dev machine.

## 1. Environment
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env`:
- `DATABASE_URL` — `postgresql+psycopg2://admin:<urlencoded-password>@localhost:5432/ems_portal`
  (URL-encode special chars in the password, e.g. `@` → `%40`).
- `JWT_SECRET` — a long random string, e.g. `python -c "import secrets; print(secrets.token_hex(32))"`.
- `ACCESS_TOKEN_EXPIRE_DAYS` — `7`.
- `COOKIE_SECURE` — `true` (served over https behind nginx).
- `CORS_ORIGINS` — the deployed frontend origin (comma-separated if several).

## 2. Provision the database
```bash
sudo -u postgres bash backend/scripts/setup_db.sh
```
Idempotent. Reads `DB_NAME`/`DB_USER`/`DB_PASSWORD` env overrides; defaults match
`.env.example`. Make sure `DB_PASSWORD` matches the password in `DATABASE_URL`.

## 3. Python deps
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 4. Run the API
```bash
# from backend/, with venv active:
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Tables are created automatically on startup (`Base.metadata.create_all`). For a
service, run uvicorn under systemd/supervisor; nginx reverse-proxies `/api` → `:8000`.

## 5. Seed once
```bash
curl -s -X POST https://<host>/api/seed
```
Creates the admin account `admin@avlokai.com` / `admin123` and loads the initial
SOP / deliverables / timeline / payment content. Returns `409` if already seeded.
**Change the admin password** immediately via `POST /api/auth/change-password`
(logged in as admin) or by logging in and using the Account page.

## 6. Create the client account
As admin (cookie from `/api/auth/login`):
```bash
curl -s -b cookie.txt -X POST https://<host>/api/admin/users \
  -H 'Content-Type: application/json' \
  -d '{"email":"vikram@client.com","password":"<set>","role":"client"}'
```

## 7. Frontend
```bash
npm install
npm run build        # outputs dist/
```
Serve `dist/` via nginx; nginx routes `/api/*` to uvicorn on `:8000` (this replaces
the Vite dev proxy, which only applies to `npm run dev`).

## Notes
- `backend/.env` is gitignored — never commit real secrets.
- No Alembic; schema is created idempotently at startup. For schema changes after
  data exists, manage migrations manually.
