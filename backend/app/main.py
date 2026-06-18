import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app import models  # noqa: F401  registers models on Base before create_all
from app.db import Base, engine
from app.routers import seed
from app.routers import auth
from app.routers import admin_users
from app.routers import sop
from app.routers import deliverables
from app.routers import timeline
from app.routers import payments

app = FastAPI(title="EMS Technologies Portal API")

origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


app.include_router(seed.router)
app.include_router(auth.router)
app.include_router(admin_users.router)
app.include_router(sop.router)
app.include_router(deliverables.router)
app.include_router(timeline.router)
app.include_router(payments.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
