# EMS Portal — Backend, Auth, Frontend Integration & Welcome Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Postgres-backed FastAPI service with cookie-JWT auth and admin/client roles, wire the four React content pages to it, and replace the Welcome page with a warm editorial PDF-replica landing.

**Architecture:** `backend/` FastAPI app (SQLAlchemy sync, Pydantic v2, passlib+jose) exposes `/api/*`; Vite dev-proxies `/api` → `:8000`. React app gains an `AuthContext`, `ProtectedRoute`, `Login`/`Account` pages; the four content pages swap hardcoded arrays for fetches with role-scoped inline controls. The public Welcome page is rewritten as a self-contained, CSS-scoped warm-editorial letter.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0 (sync, psycopg2), Pydantic v2, passlib[bcrypt], python-jose; React 19, react-router-dom 7, Vite 8, lucide-react.

## Global Constraints

- Specs of record: `docs/superpowers/specs/2026-06-17-backend-auth-design.md` and `docs/superpowers/specs/2026-06-18-welcome-page-design.md`. Where this plan and a spec disagree, the spec wins.
- **No automated test suite** (pytest/vitest) — repo convention. Verification is manual: curl smoke tests + browser click-through. Each task ends with explicit verification commands/steps.
- DB: Postgres `ems_portal` on `localhost:5432`, creds from `backend/.env` `DATABASE_URL`. Never commit `.env`; ship `.env.example`.
- Schema via `Base.metadata.create_all()` at startup. No Alembic.
- Auth: JWT (HS256), 7-day expiry, in an httpOnly `SameSite=Lax` cookie named `session`; `secure` flag from `COOKIE_SECURE` env. Frontend never reads the token; all fetches use `credentials: 'include'`.
- Roles: `admin` (full CRUD on all content) and `client` (additive status toggles only — never overwrites admin status fields).
- Status enum string values MUST match the frontend verbatim: SOP `pending|active|completed`; deliverables `upcoming|in-progress|completed`; timeline phases `upcoming|active|completed`; payments `upcoming|pending|submitted|paid`.
- Money stored as integer INR (paise not used): `150000`, `100000`, `100000`, `50000`.
- Welcome page CSS is scoped under `.welcome-letter`; it must NOT alter `:root` tokens or leak fonts into the mono portal pages.
- Frontend error display: inline banner using the server's `{"detail": "..."}`; no toast library.

---

## PART A — Backend service

### Task A1: Backend scaffolding (deps, env, db engine, app boot)

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py` (empty)
- Create: `backend/app/db.py`
- Create: `backend/app/main.py`
- Verify against: existing `backend/.env` (already has DATABASE_URL/JWT_SECRET/ACCESS_TOKEN_EXPIRE_DAYS/COOKIE_SECURE/CORS_ORIGINS)

**Interfaces:**
- Produces: `db.engine`, `db.SessionLocal`, `db.Base`, `db.get_db()` (FastAPI dependency yielding a `Session`); `main.app` (FastAPI instance) with CORS + startup `create_all()`.

- [ ] **Step 1:** Write `backend/requirements.txt`:

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy==2.0.36
psycopg2-binary==2.9.10
pydantic==2.10.4
pydantic[email]
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-dotenv==1.0.1
```

- [ ] **Step 2:** Write `backend/.env.example` (documents shape; no real secrets):

```
DATABASE_URL=postgresql+psycopg2://admin:CHANGEME@localhost:5432/ems_portal
JWT_SECRET=replace-with-a-long-random-string
ACCESS_TOKEN_EXPIRE_DAYS=7
COOKIE_SECURE=false
CORS_ORIGINS=http://localhost:5173
```

- [ ] **Step 3:** Write `backend/app/db.py`:

```python
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 4:** Write `backend/app/main.py` (routers mounted in later tasks — start with none, add imports as each router task lands):

```python
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (ensures models register on Base before create_all)
from .db import Base, engine

load_dotenv()

app = FastAPI(title="EMS Portal API")

origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health():
    return {"status": "ok"}
```

> Note: `from . import models` will fail until Task A2 creates `models.py`. Implement A2 immediately after this step, then boot. (For an isolated boot test before A2, temporarily comment the models import.)

- [ ] **Step 5: Verify** (after A2 lands so models import resolves):

```bash
cd backend && source venv/bin/activate && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# in another shell:
curl -s localhost:8000/api/health
```
Expected: `{"status":"ok"}`. Postgres `ems_portal` DB must exist (`createdb ems_portal` or via the given admin creds) — create it if the connection errors.

- [ ] **Step 6: Commit** `git add backend/requirements.txt backend/.env.example backend/app/__init__.py backend/app/db.py backend/app/main.py && git commit -m "feat(backend): scaffold FastAPI app, db engine, env example"`

---

### Task A2: ORM models (5 content tables + users)

**Files:**
- Create: `backend/app/models.py`

**Interfaces:**
- Produces: `User, SopStep, Deliverable, TimelinePhase, TimelineItem, PaymentInstallment` ORM classes on `db.Base`. Field names below are the canonical contract for schemas/routers/seed.

- [ ] **Step 1:** Write `backend/app/models.py`:

```python
from datetime import datetime, timezone
from sqlalchemy import (
    String, Integer, Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base


def _utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # 'admin' | 'client'
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class SopStep(Base):
    __tablename__ = "sop_steps"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    icon_key: Mapped[str] = mapped_column(String(40), nullable=False, default="FileText")
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subtitle: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    duration: Mapped[str] = mapped_column(String(60), nullable=False, default="")
    details: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending|active|completed


class Deliverable(Base):
    __tablename__ = "deliverables"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    icon_key: Mapped[str] = mapped_column(String(40), nullable=False, default="FileText")
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="upcoming")  # upcoming|in-progress|completed
    date: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    files: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    progress: Mapped[int | None] = mapped_column(Integer, nullable=True)
    client_acknowledged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class TimelinePhase(Base):
    __tablename__ = "timeline_phases"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    phase_label: Mapped[str] = mapped_column(String(60), nullable=False, default="")  # "Sprint 1"
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    date_range: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="upcoming")  # upcoming|active|completed
    progress: Mapped[int | None] = mapped_column(Integer, nullable=True)
    items: Mapped[list["TimelineItem"]] = relationship(
        back_populates="phase", cascade="all, delete-orphan", order_by="TimelineItem.order_index"
    )


class TimelineItem(Base):
    __tablename__ = "timeline_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    phase_id: Mapped[int] = mapped_column(ForeignKey("timeline_phases.id", ondelete="CASCADE"), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    label: Mapped[str] = mapped_column(String(300), nullable=False)
    done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    phase: Mapped["TimelinePhase"] = relationship(back_populates="items")


class PaymentInstallment(Base):
    __tablename__ = "payment_installments"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    installment_label: Mapped[str] = mapped_column(String(20), nullable=False, default="")  # "1st"
    label: Mapped[str] = mapped_column(String(200), nullable=False)  # "Down Payment"
    amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # INR
    due_date: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="upcoming")  # upcoming|pending|submitted|paid
```

- [ ] **Step 2: Verify:** boot uvicorn (Task A1 Step 5). On startup, `create_all()` runs without error. Then:

```bash
psql "postgresql://admin:Parzival@1477@localhost:5432/ems_portal" -c "\dt"
```
Expected: 6 tables listed (`users`, `sop_steps`, `deliverables`, `timeline_phases`, `timeline_items`, `payment_installments`).

- [ ] **Step 3: Commit** `git add backend/app/models.py && git commit -m "feat(backend): ORM models for users + 5 content tables"`

---

### Task A3: Auth core (hashing, JWT, cookie, role dependencies)

**Files:**
- Create: `backend/app/auth.py`

**Interfaces:**
- Produces:
  - `hash_password(pw: str) -> str`, `verify_password(pw: str, hashed: str) -> bool`
  - `create_token(user_id: int) -> str`, `COOKIE_NAME = "session"`, `set_auth_cookie(resp, token)`, `clear_auth_cookie(resp)`
  - `get_current_user(request, db) -> User` (raises 401), `require_role(role: str)` → dependency (raises 403)

- [ ] **Step 1:** Write `backend/app/auth.py`:

```python
import os
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, Request, Response
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from .db import get_db
from .models import User

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
EXPIRE_DAYS = int(os.environ.get("ACCESS_TOKEN_EXPIRE_DAYS", "7"))
COOKIE_NAME = "session"
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"


def hash_password(pw: str) -> str:
    return _pwd.hash(pw)


def verify_password(pw: str, hashed: str) -> bool:
    return _pwd.verify(pw, hashed)


def create_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + timedelta(days=EXPIRE_DAYS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def set_auth_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(
        COOKIE_NAME, token, httponly=True, samesite="lax",
        secure=COOKIE_SECURE, max_age=EXPIRE_DAYS * 86400, path="/",
    )


def clear_auth_cookie(resp: Response) -> None:
    resp.delete_cookie(COOKIE_NAME, path="/")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid session")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(role: str):
    def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role != role:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return _dep
```

- [ ] **Step 2: Verify:** `cd backend && source venv/bin/activate && python -c "from app.auth import hash_password, verify_password; h=hash_password('x'); print(verify_password('x',h), verify_password('y',h))"`
Expected: `True False`

- [ ] **Step 3: Commit** `git add backend/app/auth.py && git commit -m "feat(backend): auth core — bcrypt, JWT cookie, role deps"`

---

### Task A4: Pydantic schemas

**Files:**
- Create: `backend/app/schemas.py`

**Interfaces:**
- Produces request/response models used by all routers. All response models set `model_config = ConfigDict(from_attributes=True)`.

- [ ] **Step 1:** Write `backend/app/schemas.py`:

```python
from pydantic import BaseModel, ConfigDict, EmailStr


class _ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- auth ---
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str

class UserOut(_ORM):
    id: int
    email: EmailStr
    role: str

class CreateUserIn(BaseModel):
    email: EmailStr
    password: str
    role: str  # 'admin' | 'client'


# --- sop ---
class SopIn(BaseModel):
    order_index: int = 0
    icon_key: str = "FileText"
    title: str
    subtitle: str = ""
    duration: str = ""
    details: list[str] = []
    status: str = "pending"

class SopOut(_ORM):
    id: int
    order_index: int
    icon_key: str
    title: str
    subtitle: str
    duration: str
    details: list[str]
    status: str


# --- deliverables ---
class DeliverableIn(BaseModel):
    order_index: int = 0
    icon_key: str = "FileText"
    title: str
    description: str = ""
    status: str = "upcoming"
    date: str = ""
    files: int = 0
    progress: int | None = None

class DeliverableOut(_ORM):
    id: int
    order_index: int
    icon_key: str
    title: str
    description: str
    status: str
    date: str
    files: int
    progress: int | None
    client_acknowledged: bool


# --- timeline ---
class TimelineItemIn(BaseModel):
    phase_id: int
    order_index: int = 0
    label: str

class TimelineItemOut(_ORM):
    id: int
    phase_id: int
    order_index: int
    label: str
    done: bool

class TimelinePhaseIn(BaseModel):
    order_index: int = 0
    phase_label: str = ""
    title: str
    date_range: str = ""
    status: str = "upcoming"
    progress: int | None = None

class TimelinePhaseOut(_ORM):
    id: int
    order_index: int
    phase_label: str
    title: str
    date_range: str
    status: str
    progress: int | None
    items: list[TimelineItemOut]

class DoneIn(BaseModel):
    done: bool


# --- payments ---
class PaymentIn(BaseModel):
    order_index: int = 0
    installment_label: str = ""
    label: str
    amount: int = 0
    due_date: str = ""
    status: str = "upcoming"

class PaymentOut(_ORM):
    id: int
    order_index: int
    installment_label: str
    label: str
    amount: int
    due_date: str
    status: str
```

- [ ] **Step 2: Verify:** `cd backend && source venv/bin/activate && python -c "import app.schemas as s; print(s.SopOut.__name__, s.PaymentOut.__name__)"`
Expected: `SopOut PaymentOut`

- [ ] **Step 3: Commit** `git add backend/app/schemas.py && git commit -m "feat(backend): pydantic schemas"`

---

### Task A5: Auth router (login / logout / me / change-password)

**Files:**
- Create: `backend/app/routers/__init__.py` (empty)
- Create: `backend/app/routers/auth.py`
- Modify: `backend/app/main.py` (mount router)

**Interfaces:**
- Consumes: `auth.*`, `schemas.LoginIn/ChangePasswordIn/UserOut`, `db.get_db`.
- Produces: `router` mounted at prefix `/api/auth`.

- [ ] **Step 1:** Write `backend/app/routers/auth.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db import get_db
from ..models import User
from ..schemas import LoginIn, ChangePasswordIn, UserOut
from ..auth import (
    verify_password, hash_password, create_token,
    set_auth_cookie, clear_auth_cookie, get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    set_auth_cookie(response, create_token(user.id))
    return user


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/change-password")
def change_password(body: ChangePasswordIn, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}
```

- [ ] **Step 2:** In `backend/app/main.py`, add after the CORS block: `from .routers import auth as auth_router` (top with other imports) and `app.include_router(auth_router.router)` after middleware setup.

- [ ] **Step 3: Verify** (needs a user — run after Task A6 seed, or temporarily test post-seed). Defer full curl to A6 Step verify. For now confirm boot has the routes:

```bash
curl -s localhost:8000/openapi.json | python -c "import sys,json; print([p for p in json.load(sys.stdin)['paths'] if '/auth' in p])"
```
Expected: includes `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/change-password`.

- [ ] **Step 4: Commit** `git add backend/app/routers/__init__.py backend/app/routers/auth.py backend/app/main.py && git commit -m "feat(backend): auth router"`

---

### Task A6: Seed router (one-time content + admin bootstrap)

**Files:**
- Create: `backend/app/routers/seed.py`
- Modify: `backend/app/main.py` (mount)

**Interfaces:**
- Consumes: all models, `auth.hash_password`, `db.get_db`.
- Produces: `POST /api/seed` — 409 if any user exists; else inserts admin + all demo content. Seed admin: `admin@avlokai.com` / `admin123`.

- [ ] **Step 1:** Write `backend/app/routers/seed.py` (data transcribed verbatim from the current hardcoded pages):

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db import get_db
from ..models import (
    User, SopStep, Deliverable, TimelinePhase, TimelineItem, PaymentInstallment
)
from ..auth import hash_password

router = APIRouter(prefix="/api", tags=["seed"])

SOP = [
    dict(order_index=0, icon_key="FileText", title="1. Discovery & Briefing",
         subtitle="We align on vision, scope, and goals", duration="Days 1-3",
         details=["Kickoff call to understand your business objectives",
                  "Define target audience and key messaging",
                  "Scope finalization and resource allocation",
                  "Document all requirements in the project brief"], status="completed"),
    dict(order_index=1, icon_key="MessageSquare", title="2. Strategy & Planning",
         subtitle="Roadmap creation and milestone planning", duration="Days 4-6",
         details=["Information architecture and sitemap creation",
                  "Content strategy and wireframing",
                  "Tech stack finalization", "MVP scope definition"], status="completed"),
    dict(order_index=2, icon_key="Code", title="3. Design & Development",
         subtitle="Bringing the vision to life", duration="Days 7-28",
         details=["UI/UX design with 2 revision rounds",
                  "Frontend & backend development in parallel",
                  "Weekly progress demos every Friday",
                  "Internal QA and performance optimization"], status="active"),
    dict(order_index=3, icon_key="Eye", title="4. Review & Revisions",
         subtitle="Your feedback shapes the final product", duration="Days 29-35",
         details=["Client review of the staging environment",
                  "2 rounds of revision included", "Bug fixes and polish pass",
                  "Content population and final checks"], status="pending"),
    dict(order_index=4, icon_key="Rocket", title="5. Launch & Handover",
         subtitle="Going live with full support", duration="Days 36-42",
         details=["Final deployment to production", "DNS and domain configuration",
                  "Admin training session (1 hour)",
                  "30 days post-launch support included"], status="pending"),
]

DELIVERABLES = [
    dict(order_index=0, icon_key="Globe", title="Responsive Website",
         description="Fully responsive, cross-browser compatible web application.",
         status="completed", date="Jan 20, 2026", files=24, progress=None),
    dict(order_index=1, icon_key="Palette", title="Design System & UI Kit",
         description="Complete component library with typography, colors, icons.",
         status="completed", date="Jan 22, 2026", files=8, progress=None),
    dict(order_index=2, icon_key="Settings", title="Admin Dashboard",
         description="Full-featured admin panel with analytics and user management.",
         status="in-progress", date="Feb 15, 2026", files=16, progress=65),
    dict(order_index=3, icon_key="FileText", title="Technical Documentation",
         description="Comprehensive docs covering architecture, API, deployment.",
         status="in-progress", date="Feb 20, 2026", files=5, progress=30),
    dict(order_index=4, icon_key="Smartphone", title="Mobile App (iOS & Android)",
         description="Cross-platform with push notifications and offline support.",
         status="upcoming", date="Mar 10, 2026", files=12, progress=None),
    dict(order_index=5, icon_key="BookOpen", title="User Guide & Manual",
         description="End-user documentation with screenshots and video tutorials.",
         status="upcoming", date="Mar 20, 2026", files=3, progress=None),
]

PHASES = [
    dict(order_index=0, phase_label="Sprint 1", title="Foundation",
         date_range="Jan 15 — Jan 28", status="completed", progress=None,
         items=["Project kickoff & onboarding", "Requirements finalization",
                "UI/UX wireframes (v1)", "Design system setup", "Core architecture setup"],
         done=[True, True, True, True, True]),
    dict(order_index=1, phase_label="Sprint 2", title="Core Build",
         date_range="Jan 29 — Feb 11", status="active", progress=60,
         items=["Frontend: main pages", "Backend: API endpoints",
                "Database schema & migrations", "Authentication system", "Integration testing"],
         done=[True, True, False, False, False]),
    dict(order_index=2, phase_label="Sprint 3", title="Feature Complete",
         date_range="Feb 12 — Feb 25", status="upcoming", progress=None,
         items=["Admin dashboard", "Search & filtering", "Notifications system",
                "Performance optimization", "Security audit"],
         done=[False, False, False, False, False]),
    dict(order_index=3, phase_label="Sprint 4", title="Polish & Launch",
         date_range="Feb 26 — Mar 10", status="upcoming", progress=None,
         items=["Client review & revisions", "QA & bug fixes", "Staging deployment",
                "Production launch", "Handover & documentation"],
         done=[False, False, False, False, False]),
]

PAYMENTS = [
    dict(order_index=0, installment_label="1st", label="Down Payment",
         amount=150000, due_date="Jan 15, 2026", status="paid"),
    dict(order_index=1, installment_label="2nd", label="Mid-Project Milestone",
         amount=100000, due_date="Feb 10, 2026", status="pending"),
    dict(order_index=2, installment_label="3rd", label="Pre-Launch Payment",
         amount=100000, due_date="Feb 28, 2026", status="upcoming"),
    dict(order_index=3, installment_label="4th", label="Final Payment",
         amount=50000, due_date="Mar 10, 2026", status="upcoming"),
]


@router.post("/seed")
def seed(db: Session = Depends(get_db)):
    if db.scalar(select(User).limit(1)):
        raise HTTPException(status_code=409, detail="Already seeded")
    db.add(User(email="admin@avlokai.com", password_hash=hash_password("admin123"), role="admin"))
    for s in SOP:
        db.add(SopStep(**s))
    for d in DELIVERABLES:
        db.add(Deliverable(**d))
    for p in PAYMENTS:
        db.add(PaymentInstallment(**p))
    for ph in PHASES:
        items, dones = ph.pop("items"), ph.pop("done")
        phase = TimelinePhase(**ph)
        phase.items = [TimelineItem(order_index=i, label=lbl, done=dn)
                       for i, (lbl, dn) in enumerate(zip(items, dones))]
        db.add(phase)
    db.commit()
    return {"ok": True, "admin": "admin@avlokai.com"}
```

- [ ] **Step 2:** Mount in `main.py`: `from .routers import seed as seed_router` and `app.include_router(seed_router.router)`.

- [ ] **Step 3: Verify:**

```bash
curl -s -X POST localhost:8000/api/seed                       # -> {"ok":true,"admin":"admin@avlokai.com"}
curl -s -X POST localhost:8000/api/seed                       # -> 409 {"detail":"Already seeded"}
# login + capture cookie:
curl -s -c /tmp/c.txt -X POST localhost:8000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@avlokai.com","password":"admin123"}'    # -> {"id":1,"email":...,"role":"admin"}
curl -s -b /tmp/c.txt localhost:8000/api/auth/me              # -> same user
```

- [ ] **Step 4: Commit** `git add backend/app/routers/seed.py backend/app/main.py && git commit -m "feat(backend): one-time seed route + auth smoke verified"`

---

### Task A7: Admin user management router

**Files:**
- Create: `backend/app/routers/admin_users.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `require_role("admin")`, `schemas.CreateUserIn/UserOut`.
- Produces: `POST /api/admin/users` (admin-only) → creates client/admin account.

- [ ] **Step 1:** Write `backend/app/routers/admin_users.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db import get_db
from ..models import User
from ..schemas import CreateUserIn, UserOut
from ..auth import require_role, hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/users", response_model=UserOut)
def create_user(body: CreateUserIn, db: Session = Depends(get_db),
                _admin: User = Depends(require_role("admin"))):
    if body.role not in ("admin", "client"):
        raise HTTPException(status_code=422, detail="role must be 'admin' or 'client'")
    if db.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(status_code=409, detail="Email already exists")
    user = User(email=body.email, password_hash=hash_password(body.password), role=body.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

- [ ] **Step 2:** Mount in `main.py`: `from .routers import admin_users` + `app.include_router(admin_users.router)`.

- [ ] **Step 3: Verify** (admin cookie from A6):

```bash
curl -s -b /tmp/c.txt -X POST localhost:8000/api/admin/users -H 'Content-Type: application/json' \
  -d '{"email":"vikram@client.com","password":"client123","role":"client"}'   # -> client user
# logged-out call must 401:
curl -s -X POST localhost:8000/api/admin/users -H 'Content-Type: application/json' \
  -d '{"email":"x@y.com","password":"p","role":"client"}'                      # -> 401
```

- [ ] **Step 4: Commit** `git add backend/app/routers/admin_users.py backend/app/main.py && git commit -m "feat(backend): admin user creation route"`

---

### Task A8: SOP router (admin CRUD, all-roles read)

**Files:**
- Create: `backend/app/routers/sop.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `get_current_user`, `require_role("admin")`, `schemas.SopIn/SopOut`.
- Produces: `GET /api/sop` (any auth), `POST /api/sop` `PUT /api/sop/{id}` `DELETE /api/sop/{id}` (admin).

- [ ] **Step 1:** Write `backend/app/routers/sop.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db import get_db
from ..models import SopStep, User
from ..schemas import SopIn, SopOut
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/api/sop", tags=["sop"])


@router.get("", response_model=list[SopOut])
def list_sop(db: Session = Depends(get_db), _u: User = Depends(get_current_user)):
    return db.scalars(select(SopStep).order_by(SopStep.order_index)).all()


@router.post("", response_model=SopOut)
def create_sop(body: SopIn, db: Session = Depends(get_db), _a: User = Depends(require_role("admin"))):
    step = SopStep(**body.model_dump())
    db.add(step); db.commit(); db.refresh(step)
    return step


@router.put("/{step_id}", response_model=SopOut)
def update_sop(step_id: int, body: SopIn, db: Session = Depends(get_db),
               _a: User = Depends(require_role("admin"))):
    step = db.get(SopStep, step_id)
    if not step:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump().items():
        setattr(step, k, v)
    db.commit(); db.refresh(step)
    return step


@router.delete("/{step_id}")
def delete_sop(step_id: int, db: Session = Depends(get_db), _a: User = Depends(require_role("admin"))):
    step = db.get(SopStep, step_id)
    if not step:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(step); db.commit()
    return {"ok": True}
```

- [ ] **Step 2:** Mount in `main.py`: `from .routers import sop` + `app.include_router(sop.router)`.

- [ ] **Step 3: Verify:**

```bash
curl -s -b /tmp/c.txt localhost:8000/api/sop | python -c "import sys,json; print(len(json.load(sys.stdin)))"   # -> 5
curl -s -b /tmp/c.txt -X PUT localhost:8000/api/sop/1 -H 'Content-Type: application/json' \
  -d '{"title":"1. Discovery & Briefing","subtitle":"x","duration":"Days 1-3","details":["a"],"status":"completed","icon_key":"FileText","order_index":0}'  # -> updated
```

- [ ] **Step 4: Commit** `git add backend/app/routers/sop.py backend/app/main.py && git commit -m "feat(backend): SOP router"`

---

### Task A9: Deliverables router (admin CRUD + client acknowledge)

**Files:**
- Create: `backend/app/routers/deliverables.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces: `GET /api/deliverables` (any auth); `POST` / `PUT /{id}` / `DELETE /{id}` (admin); `PATCH /api/deliverables/{id}/acknowledge` (client) → `client_acknowledged=True`.

- [ ] **Step 1:** Write `backend/app/routers/deliverables.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db import get_db
from ..models import Deliverable, User
from ..schemas import DeliverableIn, DeliverableOut
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/api/deliverables", tags=["deliverables"])


@router.get("", response_model=list[DeliverableOut])
def list_items(db: Session = Depends(get_db), _u: User = Depends(get_current_user)):
    return db.scalars(select(Deliverable).order_by(Deliverable.order_index)).all()


@router.post("", response_model=DeliverableOut)
def create_item(body: DeliverableIn, db: Session = Depends(get_db), _a: User = Depends(require_role("admin"))):
    item = Deliverable(**body.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return item


@router.put("/{item_id}", response_model=DeliverableOut)
def update_item(item_id: int, body: DeliverableIn, db: Session = Depends(get_db),
                _a: User = Depends(require_role("admin"))):
    item = db.get(Deliverable, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    db.commit(); db.refresh(item)
    return item


@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db), _a: User = Depends(require_role("admin"))):
    item = db.get(Deliverable, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item); db.commit()
    return {"ok": True}


@router.patch("/{item_id}/acknowledge", response_model=DeliverableOut)
def acknowledge(item_id: int, db: Session = Depends(get_db), _c: User = Depends(require_role("client"))):
    item = db.get(Deliverable, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    item.client_acknowledged = True
    db.commit(); db.refresh(item)
    return item
```

- [ ] **Step 2:** Mount in `main.py`.

- [ ] **Step 3: Verify:**

```bash
curl -s -b /tmp/c.txt localhost:8000/api/deliverables | python -c "import sys,json; print(len(json.load(sys.stdin)))"  # -> 6
# client cookie:
curl -s -c /tmp/cl.txt -X POST localhost:8000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"vikram@client.com","password":"client123"}' >/dev/null
curl -s -b /tmp/cl.txt -X PATCH localhost:8000/api/deliverables/1/acknowledge | grep -o '"client_acknowledged":true'  # match
curl -s -b /tmp/c.txt  -X PATCH localhost:8000/api/deliverables/1/acknowledge   # admin -> 403
```

- [ ] **Step 4: Commit** `git add backend/app/routers/deliverables.py backend/app/main.py && git commit -m "feat(backend): deliverables router + client acknowledge"`

---

### Task A10: Timeline router (phases + nested items, client done-toggle)

**Files:**
- Create: `backend/app/routers/timeline.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces:
  - `GET /api/timeline` (any auth) → phases with nested `items`.
  - `POST /api/timeline/phases` `PUT /api/timeline/phases/{id}` `DELETE /api/timeline/phases/{id}` (admin).
  - `POST /api/timeline/items` `PUT /api/timeline/items/{id}` `DELETE /api/timeline/items/{id}` (admin).
  - `PATCH /api/timeline/items/{id}/done` body `{done: bool}` (client or admin).

- [ ] **Step 1:** Write `backend/app/routers/timeline.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db import get_db
from ..models import TimelinePhase, TimelineItem, User
from ..schemas import TimelinePhaseIn, TimelinePhaseOut, TimelineItemIn, TimelineItemOut, DoneIn
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/api/timeline", tags=["timeline"])


@router.get("", response_model=list[TimelinePhaseOut])
def list_timeline(db: Session = Depends(get_db), _u: User = Depends(get_current_user)):
    return db.scalars(select(TimelinePhase).order_by(TimelinePhase.order_index)).all()


@router.post("/phases", response_model=TimelinePhaseOut)
def create_phase(body: TimelinePhaseIn, db: Session = Depends(get_db), _a: User = Depends(require_role("admin"))):
    phase = TimelinePhase(**body.model_dump())
    db.add(phase); db.commit(); db.refresh(phase)
    return phase


@router.put("/phases/{phase_id}", response_model=TimelinePhaseOut)
def update_phase(phase_id: int, body: TimelinePhaseIn, db: Session = Depends(get_db),
                 _a: User = Depends(require_role("admin"))):
    phase = db.get(TimelinePhase, phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump().items():
        setattr(phase, k, v)
    db.commit(); db.refresh(phase)
    return phase


@router.delete("/phases/{phase_id}")
def delete_phase(phase_id: int, db: Session = Depends(get_db), _a: User = Depends(require_role("admin"))):
    phase = db.get(TimelinePhase, phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(phase); db.commit()
    return {"ok": True}


@router.post("/items", response_model=TimelineItemOut)
def create_item(body: TimelineItemIn, db: Session = Depends(get_db), _a: User = Depends(require_role("admin"))):
    if not db.get(TimelinePhase, body.phase_id):
        raise HTTPException(status_code=404, detail="Phase not found")
    item = TimelineItem(**body.model_dump(), done=False)
    db.add(item); db.commit(); db.refresh(item)
    return item


@router.put("/items/{item_id}", response_model=TimelineItemOut)
def update_item(item_id: int, body: TimelineItemIn, db: Session = Depends(get_db),
                _a: User = Depends(require_role("admin"))):
    item = db.get(TimelineItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    item.phase_id = body.phase_id
    item.order_index = body.order_index
    item.label = body.label
    db.commit(); db.refresh(item)
    return item


@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db), _a: User = Depends(require_role("admin"))):
    item = db.get(TimelineItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item); db.commit()
    return {"ok": True}


@router.patch("/items/{item_id}/done", response_model=TimelineItemOut)
def set_done(item_id: int, body: DoneIn, db: Session = Depends(get_db),
             _u: User = Depends(get_current_user)):  # client OR admin
    item = db.get(TimelineItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    item.done = body.done
    db.commit(); db.refresh(item)
    return item
```

- [ ] **Step 2:** Mount in `main.py`.

- [ ] **Step 3: Verify:**

```bash
curl -s -b /tmp/c.txt localhost:8000/api/timeline | python -c "import sys,json; d=json.load(sys.stdin); print(len(d), len(d[0]['items']))"  # -> 4 5
curl -s -b /tmp/cl.txt -X PATCH localhost:8000/api/timeline/items/6/done -H 'Content-Type: application/json' -d '{"done":true}' | grep -o '"done":true'  # match
```

- [ ] **Step 4: Commit** `git add backend/app/routers/timeline.py backend/app/main.py && git commit -m "feat(backend): timeline router (phases/items/done)"`

---

### Task A11: Payments router (admin CRUD, client submit, admin confirm-paid)

**Files:**
- Create: `backend/app/routers/payments.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces:
  - `GET /api/payments` (any auth); `POST` / `PUT /{id}` / `DELETE /{id}` (admin).
  - `PATCH /api/payments/{id}/submit` (client) — only `upcoming|pending` → `submitted`.
  - `PATCH /api/payments/{id}/confirm-paid` (admin) — only `submitted` → `paid`.

- [ ] **Step 1:** Write `backend/app/routers/payments.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db import get_db
from ..models import PaymentInstallment, User
from ..schemas import PaymentIn, PaymentOut
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.get("", response_model=list[PaymentOut])
def list_payments(db: Session = Depends(get_db), _u: User = Depends(get_current_user)):
    return db.scalars(select(PaymentInstallment).order_by(PaymentInstallment.order_index)).all()


@router.post("", response_model=PaymentOut)
def create_payment(body: PaymentIn, db: Session = Depends(get_db), _a: User = Depends(require_role("admin"))):
    item = PaymentInstallment(**body.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return item


@router.put("/{pid}", response_model=PaymentOut)
def update_payment(pid: int, body: PaymentIn, db: Session = Depends(get_db),
                   _a: User = Depends(require_role("admin"))):
    item = db.get(PaymentInstallment, pid)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    db.commit(); db.refresh(item)
    return item


@router.delete("/{pid}")
def delete_payment(pid: int, db: Session = Depends(get_db), _a: User = Depends(require_role("admin"))):
    item = db.get(PaymentInstallment, pid)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item); db.commit()
    return {"ok": True}


@router.patch("/{pid}/submit", response_model=PaymentOut)
def submit(pid: int, db: Session = Depends(get_db), _c: User = Depends(require_role("client"))):
    item = db.get(PaymentInstallment, pid)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    if item.status not in ("upcoming", "pending"):
        raise HTTPException(status_code=409, detail="Only upcoming/pending can be submitted")
    item.status = "submitted"
    db.commit(); db.refresh(item)
    return item


@router.patch("/{pid}/confirm-paid", response_model=PaymentOut)
def confirm_paid(pid: int, db: Session = Depends(get_db), _a: User = Depends(require_role("admin"))):
    item = db.get(PaymentInstallment, pid)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    if item.status != "submitted":
        raise HTTPException(status_code=409, detail="Only submitted can be confirmed paid")
    item.status = "paid"
    db.commit(); db.refresh(item)
    return item
```

- [ ] **Step 2:** Mount in `main.py`.

- [ ] **Step 3: Verify:**

```bash
curl -s -b /tmp/cl.txt -X PATCH localhost:8000/api/payments/2/submit | grep -o '"status":"submitted"'      # match
curl -s -b /tmp/c.txt  -X PATCH localhost:8000/api/payments/2/confirm-paid | grep -o '"status":"paid"'      # match
curl -s -b /tmp/cl.txt -X PATCH localhost:8000/api/payments/1/submit                                        # paid -> 409
```

- [ ] **Step 4: Commit** `git add backend/app/routers/payments.py backend/app/main.py && git commit -m "feat(backend): payments router (submit/confirm-paid)"`

---

## PART B — Frontend integration (inner pages keep mono Swiss theme)

### Task B1: Vite proxy + API client wrapper

**Files:**
- Modify: `vite.config.js`
- Create: `src/api/client.js`

**Interfaces:**
- Produces: `apiGet/apiPost/apiPut/apiPatch/apiDelete(path, body?)` → parsed JSON; throws `ApiError {status, detail}` on non-2xx. All requests `credentials: 'include'`, base `/api`.

- [ ] **Step 1:** In `vite.config.js`, add a `proxy` under `server`:

```js
server: {
  host: '0.0.0.0',
  port: 5173,
  allowedHosts: ['vm806993434.tailfacbb3.ts.net'],
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true },
  },
},
```

- [ ] **Step 2:** Write `src/api/client.js`:

```js
export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `Request failed (${status})`);
    this.status = status;
    this.detail = detail;
  }
}

async function request(method, path, body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, opts);
  let data = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    const detail = data && typeof data === 'object' ? data.detail : data;
    throw new ApiError(res.status, detail);
  }
  return data;
}

export const apiGet = (p) => request('GET', p);
export const apiPost = (p, b) => request('POST', p, b);
export const apiPut = (p, b) => request('PUT', p, b);
export const apiPatch = (p, b) => request('PATCH', p, b);
export const apiDelete = (p) => request('DELETE', p);
```

- [ ] **Step 3: Verify:** `npm run dev` (with backend running). In browser console at `http://localhost:5173`:
`fetch('/api/health').then(r=>r.json()).then(console.log)` → `{status:'ok'}` (proxy works).

- [ ] **Step 4: Commit** `git add vite.config.js src/api/client.js && git commit -m "feat(web): vite /api proxy + fetch client"`

---

### Task B2: Auth context

**Files:**
- Create: `src/context/AuthContext.jsx`

**Interfaces:**
- Consumes: `apiGet/apiPost`.
- Produces: `AuthProvider`, `useAuth()` → `{ user, loading, login(email,pw), logout(), changePassword(oldPw,newPw), refresh() }`. `user` is `{id,email,role}` or `null`.

- [ ] **Step 1:** Write `src/context/AuthContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await apiGet('/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email, password) => {
    const me = await apiPost('/auth/login', { email, password });
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    await apiPost('/auth/logout');
    setUser(null);
  }, []);

  const changePassword = useCallback(
    (old_password, new_password) => apiPost('/auth/change-password', { old_password, new_password }),
    [],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify:** type-check by importing in App (next task). No standalone test. Commit with B3.

- [ ] **Step 3: Commit** `git add src/context/AuthContext.jsx && git commit -m "feat(web): auth context"`

---

### Task B3: Routing — AuthProvider, ProtectedRoute, Login, Account, Navbar

**Files:**
- Create: `src/components/ProtectedRoute.jsx`
- Create: `src/pages/Login.jsx`
- Create: `src/pages/Account.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Navbar.jsx`

**Interfaces:**
- Consumes: `useAuth`.
- Produces: `<ProtectedRoute>` (redirects to `/login` when `!user` after loading); routes `/login`, `/account`; guarded `/sop /deliverables /timeline /payment`.

- [ ] **Step 1:** Write `src/components/ProtectedRoute.jsx`:

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="page-section" style={{ paddingTop: 140, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
```

- [ ] **Step 2:** Write `src/pages/Login.jsx` (uses existing mono classes only):

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      await login(email, password);
      navigate('/sop', { replace: true });
    } catch (err) {
      setError(err.detail || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-section" style={{ paddingTop: 140 }}>
      <div className="page-container" style={{ maxWidth: 400, margin: '0 auto' }}>
        <div className="section-label">Client Portal</div>
        <h2 className="section-title" style={{ marginBottom: 24 }}>Sign in</h2>
        {error && (
          <div className="card" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}
        <form onSubmit={onSubmit}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }} htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} className="input" style={inputStyle} />
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, margin: '16px 0 6px' }} htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" required value={password}
            onChange={(e) => setPassword(e.target.value)} className="input" style={inputStyle} />
          <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 24, width: '100%', justifyContent: 'center' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', fontSize: 15, fontFamily: 'inherit',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
  background: 'var(--color-bg)', color: 'var(--color-text)',
};
```

- [ ] **Step 3:** Write `src/pages/Account.jsx`:

```jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const inputStyle = {
  width: '100%', padding: '10px 12px', fontSize: 15, fontFamily: 'inherit',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
  background: 'var(--color-bg)', color: 'var(--color-text)',
};

export default function Account() {
  const { user, changePassword } = useAuth();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null); setError(null); setBusy(true);
    try {
      await changePassword(oldPw, newPw);
      setMsg('Password updated.');
      setOldPw(''); setNewPw('');
    } catch (err) {
      setError(err.detail || 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-section" style={{ paddingTop: 140 }}>
      <div className="page-container" style={{ maxWidth: 400, margin: '0 auto' }}>
        <div className="section-label">Account</div>
        <h2 className="section-title" style={{ marginBottom: 8 }}>Settings</h2>
        <p style={{ fontSize: 14, marginBottom: 24 }}>{user?.email} · {user?.role}</p>
        {msg && <div className="card" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', marginBottom: 16, fontSize: 14 }}>{msg}</div>}
        {error && <div className="card" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <form onSubmit={onSubmit}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }} htmlFor="old">Current password</label>
          <input id="old" type="password" autoComplete="current-password" required value={oldPw} onChange={(e) => setOldPw(e.target.value)} style={inputStyle} />
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, margin: '16px 0 6px' }} htmlFor="new">New password</label>
          <input id="new" type="password" autoComplete="new-password" required value={newPw} onChange={(e) => setNewPw(e.target.value)} style={inputStyle} />
          <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 24, width: '100%', justifyContent: 'center' }}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4:** Rewrite `src/App.jsx` to add `AuthProvider`, `/login`, `/account`, and wrap the four content routes in `ProtectedRoute`:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Welcome from './pages/Welcome';
import SopPage from './pages/Sop';
import DeliverablesPage from './pages/Deliverables';
import TimelinePage from './pages/Timeline';
import PaymentPage from './pages/Payment';
import Login from './pages/Login';
import Account from './pages/Account';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/sop" element={<ProtectedRoute><SopPage /></ProtectedRoute>} />
            <Route path="/deliverables" element={<ProtectedRoute><DeliverablesPage /></ProtectedRoute>} />
            <Route path="/timeline" element={<ProtectedRoute><TimelinePage /></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          </Routes>
        </main>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5:** Update `src/components/Navbar.jsx` — read `useAuth()`; when `user`, show email + a Logout button and an Account link; when not, show a Login link. Read the existing file first and follow its markup/classes; add only these conditional nav items (do not restyle the navbar). Logout calls `logout()` then navigates to `/`.

- [ ] **Step 6: Verify:** `npm run dev`. Visit `/sop` while logged out → redirected to `/login`. Log in as admin → lands on `/sop`. Navbar shows email + Logout. `/account` change-password round-trips (set it back). Logout returns to `/` and `/sop` redirects again.

- [ ] **Step 7: Commit** `git add src/components/ProtectedRoute.jsx src/pages/Login.jsx src/pages/Account.jsx src/App.jsx src/components/Navbar.jsx && git commit -m "feat(web): auth provider, protected routes, login/account, navbar auth"`

---

### Task B4: SOP page — fetch + admin edit/add/delete

**Files:**
- Modify: `src/pages/Sop.jsx`

**Interfaces:**
- Consumes: `apiGet('/sop')`, `apiPost/apiPut/apiDelete('/sop'...)`, `useAuth()`.
- Icon mapping: build an `ICONS` map `{ FileText, MessageSquare, Code, Eye, Rocket, ... }` from lucide-react keyed by `icon_key`; fallback `FileText`.

- [ ] **Step 1:** Replace the hardcoded `steps` array with state loaded via `useEffect` → `apiGet('/sop')`. Keep the existing accordion/visual markup but drive `step.icon` from `ICONS[step.icon_key] ?? FileText` rendered as `<Icon size={20} />`. Add `loading`/`error` state: show a centered "Loading…" and an inline error `card` (danger border) using `err.detail`.
- [ ] **Step 2:** Add a derived overall-progress percentage from the loaded steps (completed / total × 100) replacing the hardcoded `40%`, so it reflects real data.
- [ ] **Step 3:** When `user.role === 'admin'`, render inline controls on each step card (an "Edit" and "Delete" `btn-secondary`, and an "Add step" button above the list). Edit opens a simple inline form (reuse `inputStyle` pattern from Login) editing `title, subtitle, duration, status, details` (details as one textarea, newline-split to array) and `icon_key`; Save → `apiPut('/sop/'+id, payload)` then refresh list; Delete → confirm() then `apiDelete`. Add → `apiPost('/sop', payload)`. No client controls on SOP (read-only for client, per spec).
- [ ] **Step 4: Verify:** As admin on `/sop`: list loads from API (5 steps); edit a step title and save → persists across reload; add a step → appears; delete it → gone. As client: steps visible, no edit/add/delete buttons.
- [ ] **Step 5: Commit** `git add src/pages/Sop.jsx && git commit -m "feat(web): SOP page wired to API with admin CRUD"`

---

### Task B5: Deliverables page — fetch + admin CRUD + client acknowledge

**Files:**
- Modify: `src/pages/Deliverables.jsx`

**Interfaces:**
- Consumes: `apiGet('/deliverables')`, admin `apiPost/apiPut/apiDelete`, client `apiPatch('/deliverables/'+id+'/acknowledge')`.
- Icon map keys used: `Globe, Palette, Settings, FileText, Smartphone, BookOpen` (+ fallback).

- [ ] **Step 1:** Load deliverables via `useEffect`; keep card grid markup, drive icon from `icon_key`. Derive the 4 summary stats (Total / Delivered / In Progress / Upcoming) from loaded data instead of hardcoded counts. Add loading/error states.
- [ ] **Step 2:** Admin controls per card: Edit (inline form over `title, description, status, date, files, progress, icon_key`), Delete (confirm), and an "Add deliverable" button. Wire to `apiPost/apiPut/apiDelete` then refresh.
- [ ] **Step 3:** Client control per card: an "Acknowledge" `btn-secondary` shown when `user.role === 'client'` and `!item.client_acknowledged`; on click `apiPatch(.../acknowledge)` then refresh. When acknowledged, show a small "Acknowledged ✓" badge (lucide `Check`, not emoji) using `badge-success`.
- [ ] **Step 4: Verify:** Admin: CRUD persists. Client: Acknowledge button toggles to "Acknowledged" and persists across reload; no edit/delete for client.
- [ ] **Step 5: Commit** `git add src/pages/Deliverables.jsx && git commit -m "feat(web): deliverables wired to API (admin CRUD + client acknowledge)"`

---

### Task B6: Timeline page — fetch + admin CRUD + client/admin done toggle

**Files:**
- Modify: `src/pages/Timeline.jsx`

**Interfaces:**
- Consumes: `apiGet('/timeline')` (phases with `items`); admin phase/item CRUD; `apiPatch('/timeline/items/'+id+'/done', {done})` (client or admin).

- [ ] **Step 1:** Load phases via `useEffect`. Keep sprint-card markup; the top "week bar" may be derived loosely or kept static visually (it is decorative) — drive the sprint cards and their items from API data. Add loading/error states.
- [ ] **Step 2:** Make each item row's check toggle interactive: clicking the circle/checkbox calls `apiPatch('/timeline/items/'+item.id+'/done', { done: !item.done })` then updates local state. Allowed for both client and admin (gate the control on `user` present). Keep the CheckCircle/Circle visual.
- [ ] **Step 3:** Admin-only: phase Edit/Delete + "Add phase"; item Add/Edit/Delete within a phase. Wire to the `/timeline/phases` and `/timeline/items` endpoints; refresh after each.
- [ ] **Step 4: Verify:** Client toggles an item done → persists across reload. Admin adds a phase + item, edits, deletes → persists. Client cannot see phase/item add/delete controls.
- [ ] **Step 5: Commit** `git add src/pages/Timeline.jsx && git commit -m "feat(web): timeline wired to API (done toggle + admin CRUD)"`

---

### Task B7: Payment page — fetch + admin CRUD + client submit + admin confirm-paid

**Files:**
- Modify: `src/pages/Payment.jsx`

**Interfaces:**
- Consumes: `apiGet('/payments')`; admin `apiPost/apiPut/apiDelete`; client `apiPatch('/payments/'+id+'/submit')`; admin `apiPatch('/payments/'+id+'/confirm-paid')`.
- Amount formatting: `'₹' + amount.toLocaleString('en-IN')`.

- [ ] **Step 1:** Load installments via `useEffect`. Derive `totalPaid` (sum of `paid`), `totalDue` (sum all), progress %, and "next payment" (first `pending`) from API data — replacing hardcoded constants. Render amounts via `toLocaleString('en-IN')`. Add loading/error states. Add a `submitted` status rendering in the schedule table (badge using `badge-info`/warning styling, label "Submitted").
- [ ] **Step 2:** Client controls: on a row with status `upcoming|pending`, show a "Mark as paid / I've paid" `btn-secondary` → `apiPatch(.../submit)` then refresh (status → submitted). Keep the cosmetic "Pay Now" button as-is (non-functional per spec).
- [ ] **Step 3:** Admin controls: per-row Edit (form over `installment_label, label, amount, due_date, status`), Delete, "Add installment"; plus on a `submitted` row a "Confirm paid" `btn-primary` → `apiPatch(.../confirm-paid)` (status → paid). Wire + refresh.
- [ ] **Step 4: Verify:** Client submits a pending installment → shows "Submitted", persists. Admin confirms it → "Paid", progress/total update. Admin CRUD persists. Client cannot edit/delete or confirm-paid.
- [ ] **Step 5: Commit** `git add src/pages/Payment.jsx && git commit -m "feat(web): payments wired to API (submit + confirm-paid + admin CRUD)"`

---

## PART C — Welcome page (warm editorial replica, scoped)

### Task C1: Welcome scoped styles (fonts, tokens, layout, motion, responsive)

**Files:**
- Create: `src/pages/Welcome.css`
- Pre-check: `ls src/assets` for an existing Avlokai logo mark; if none, the wordmark is rendered in type (no fabricated raster).

**Interfaces:**
- Produces: all classes under `.welcome-letter` namespace. Defines `--w-*` custom properties on `.welcome-letter` only. Includes the scoped Google Fonts `@import` and a `prefers-reduced-motion` block.

- [ ] **Step 1:** Write `src/pages/Welcome.css`. Top of file:

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Caveat:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.welcome-letter {
  --w-bg: #faf7f0;
  --w-paper: #fbf9f3;
  --w-ink: #1a1714;
  --w-ink-soft: #5c554c;
  --w-muted: #9a9186;
  --w-accent: #c1502e;
  --w-accent-soft: #e8d9cf;
  --w-line: #e3ddd0;

  background: var(--w-bg);
  color: var(--w-ink);
  min-height: 100vh;
  width: 100%;
  font-family: 'EB Garamond', Georgia, serif;
  position: relative;
  padding: 48px 24px 64px;
}
```

- [ ] **Step 2:** Add (still in `Welcome.css`) classes for each section, all prefixed `.welcome-letter`:
  - `.wl-frame` corner brackets — four absolutely-positioned L-shapes (`::before/::after` or 4 spans) in `--w-accent-soft`, inset ~24px; `aria-hidden` element.
  - `.wl-paper` — `max-width: 960px; margin: 0 auto;`.
  - `.wl-topbar` — flex space-between; left logo/wordmark block, right mono note; wordmark `.wl-brand` with italic accent "Ai".
  - `.wl-mono` — `font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--w-muted);`.
  - `.wl-kicker` — `font-family: 'Caveat'; font-size: 1.9rem; color: var(--w-accent);`.
  - `.wl-headline` — `font-family: 'Playfair Display'; font-weight: 700; line-height: 1.05; font-size: clamp(2.4rem, 7vw, 4.2rem);` with `.wl-headline em { color: var(--w-accent); font-style: italic; }`.
  - `.wl-lede` — italic EB Garamond, `font-size: clamp(1.05rem, 2vw, 1.35rem); color: var(--w-ink-soft); max-width: 30em;`.
  - `.wl-rule` — 1px `--w-line` full width; `.wl-diamond` small terracotta square rotated 45deg before it.
  - `.wl-body p` — `font-size: 1.18rem; line-height: 1.75; color: var(--w-ink-soft); max-width: 60ch;` with `.wl-body strong { color: var(--w-ink); }`.
  - `.wl-dropcap::first-letter` — `float: left; font-family: 'Playfair Display'; font-size: 3.6em; line-height: 0.8; padding: 6px 10px 0 0; color: var(--w-accent);`.
  - `.wl-cards` — `display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;`; `.wl-card` — `background: var(--w-paper); border: 1px solid var(--w-accent-soft); border-radius: 4px; padding: 24px; transition: border-color 250ms ease;` hover → `border-color: var(--w-accent)`. `.wl-card h3` Playfair 600. `.wl-card .wl-no` mono accent label.
  - `.wl-sign` block; `.wl-signature` — `font-family: 'Caveat'; font-weight: 700; font-size: 3.2rem; color: var(--w-ink);`.
  - `.wl-seal` — circular dashed border (`--w-accent-soft`) badge, mono text, ~120px.
  - `.wl-footer` — top border `--w-line`; `.wl-ps` Caveat; mono strip.
  - `.wl-cta` — accent link, inline-flex with arrow; `.wl-cta:hover svg { transform: translateX(4px); }`; visible `:focus-visible` outline (2px `--w-accent`).
  - `.wl-contact` — accent mono email/site line.

- [ ] **Step 3:** Add reveal + reduced-motion at the bottom:

```css
.welcome-letter .wl-reveal {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 480ms ease-out, transform 480ms ease-out;
}
.welcome-letter .wl-reveal.is-visible {
  opacity: 1;
  transform: none;
}

@media (max-width: 767px) {
  .welcome-letter .wl-cards { grid-template-columns: 1fr; }
  .welcome-letter .wl-topbar { flex-direction: column; gap: 16px; align-items: flex-start; }
  .welcome-letter .wl-frame { display: none; }
  .welcome-letter .wl-seal { position: static; margin-top: 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .welcome-letter .wl-reveal { opacity: 1; transform: none; transition: none; }
  .welcome-letter .wl-cta svg { transition: none; }
}
```

- [ ] **Step 4: Verify:** file imported in C2; defer visual check to C2.
- [ ] **Step 5: Commit** with C2.

---

### Task C2: Welcome page component (PDF replica + motion + CTA)

**Files:**
- Rewrite: `src/pages/Welcome.jsx`
- Reference: `src/hooks/useScrollReveal.js` (read it; reuse if it toggles an `is-visible`/visible class on scroll — otherwise use the simple on-mount reveal below).

**Interfaces:**
- Consumes: `Welcome.css`, `react-router-dom` `Link`, lucide-react (`ArrowRight`, `Sparkle` or `Sparkles`).
- Public route — renders without auth.

- [ ] **Step 1:** Read `src/hooks/useScrollReveal.js` to learn its API. If it returns a ref + visibility or adds a class on intersection, use it for `.wl-reveal` blocks. Otherwise implement reveal by adding `is-visible` to all `.wl-reveal` after mount with a staggered `setTimeout` (respecting that CSS handles reduced-motion).

- [ ] **Step 2:** Rewrite `src/pages/Welcome.jsx` reproducing the PDF top-to-bottom, root element `<div className="welcome-letter">`. Structure (exact copy text from `avlokai.pdf`):
  - `.wl-frame` (aria-hidden) corner brackets.
  - `.wl-paper` wrapper containing:
    - `.wl-topbar`: left `.wl-brand` "Avlok" + `<em>Ai</em>` and `.wl-mono` "SEE MORE · KNOW MORE · DO MORE"; right `.wl-mono` two lines "A LITTLE NOTE / FOR MR. VIKRAM".
    - `.wl-kicker` "a warm hello —".
    - `<h1 className="wl-headline">Welcome aboard,<br/><em>Mr. Vikram.</em></h1>`.
    - `.wl-lede` "We're genuinely glad to be working together, and looking forward to everything we'll build from here."
    - `.wl-diamond` + `.wl-rule`.
    - `.wl-body`: para 1 with `.wl-dropcap` ("It is **genuinely great** to have you with us — … impatient to show you."), para 2 ("From here on, you're not a ticket number … **Mr. Vikram**, … 11pm \"what if we tried…\" message."), para 3 ("We build things that help you **see more, know more, and do more**. Consider this the front door — … walked in.").
    - `.wl-cards` with three `.wl-card`: `NO. 01` "Warmth first" / "Real people, real replies. You'll always know a human is on the other end."; `NO. 02` "Craft, not corners" / "We sweat the details so the work feels considered — never rushed, never generic."; `NO. 03` "In it together" / "Your wins are our wins. We're partners in this, not just a vendor on a list."
    - `.wl-sign`: "Here's to a great one together," (italic) → `.wl-signature` "Sushanth" → `.wl-mono` "SUSHANTH K" → italic "Founder · Avlokai" → `.wl-contact` "sushanth@avlokai.com · avlokai.com".
    - `.wl-seal` (aria-hidden): "AvlokAi / 2026" + "GLAD YOU'RE HERE".
    - `.wl-footer`: `.wl-rule`; `.wl-ps` "P.S. — seriously, *welcome aboard.*" + lucide `Sparkle`; `.wl-mono` "WELCOME · AVLOKAI · 2026".
    - `.wl-cta`: `<Link to="/login" className="wl-cta">Enter your portal <ArrowRight size={18} /></Link>` placed near the P.S.
  - Wrap the major blocks (kicker, headline, lede, body, cards, sign) in `.wl-reveal` and apply staggered visibility per Step 1.

- [ ] **Step 3: Verify:** `npm run dev`, open `/` at 1440 / 768 / 375:
  - Visual matches `avlokai.pdf`: cream bg, Playfair headline with terracotta "Mr. Vikram.", Caveat kicker/signature, 3 cards, seal, footer.
  - Reveals play once on load; with OS "reduce motion" on, content is static.
  - `Enter your portal →` navigates to `/login`; arrow nudges on hover; focus ring visible on Tab.
  - Navigate `/` → `/sop` (after login) and back: confirm in devtools that `--w-*` vars and Playfair/Caveat fonts are NOT applied on `/sop` (warm theme isolated). No horizontal scroll at 375px.

- [ ] **Step 4: Commit** `git add src/pages/Welcome.jsx src/pages/Welcome.css && git commit -m "feat(web): warm editorial Welcome page (PDF replica, scoped, motion)"`

---

## Final integration verification (manual)

- [ ] Fresh boot: backend up, `npm run dev` up, DB has data (seeded once).
- [ ] Public `/` renders the letter without login; `Enter your portal →` → `/login`.
- [ ] Login as `admin@avlokai.com / admin123`: all four pages load real data; full CRUD works on each; data persists across reload.
- [ ] Create client via `POST /api/admin/users` (or an admin UI affordance if added); log in as client: read all pages; acknowledge a deliverable; toggle a timeline item done; submit a pending payment. Confirm client sees no admin CRUD controls and admin-only endpoints return 403.
- [ ] Logout → protected pages redirect to `/login`.
- [ ] Confirm warm theme never leaks into mono pages and mono tokens are unchanged in `src/index.css`.
```
