from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.db import get_db
from app.models import (
    Deliverable,
    DeliverableStatus,
    PaymentInstallment,
    PaymentStatus,
    Role,
    SopStatus,
    SopStep,
    TimelineItem,
    TimelinePhase,
    TimelinePhaseStatus,
    User,
)

router = APIRouter()


@router.post("/api/seed", status_code=201)
def seed(db: Session = Depends(get_db)):
    if db.query(User).first() is not None:
        raise HTTPException(status_code=409, detail="Already seeded")

    admin = User(
        email="admin@avlokai.com",
        password_hash=hash_password("admin123"),
        role=Role.admin,
    )
    db.add(admin)

    db.add_all(
        [
            SopStep(
                order_index=0, icon_key="FileText", title="1. Discovery & Briefing",
                subtitle="We align on vision, scope, and goals", duration="Days 1-3",
                details=[
                    "Kickoff call to understand your business objectives",
                    "Define target audience and key messaging",
                    "Scope finalization and resource allocation",
                    "Document all requirements in the project brief",
                ],
                status=SopStatus.completed,
            ),
            SopStep(
                order_index=1, icon_key="MessageSquare", title="2. Strategy & Planning",
                subtitle="Roadmap creation and milestone planning", duration="Days 4-6",
                details=[
                    "Information architecture and sitemap creation",
                    "Content strategy and wireframing",
                    "Tech stack finalization",
                    "MVP scope definition",
                ],
                status=SopStatus.completed,
            ),
            SopStep(
                order_index=2, icon_key="Code", title="3. Design & Development",
                subtitle="Bringing the vision to life", duration="Days 7-28",
                details=[
                    "UI/UX design with 2 revision rounds",
                    "Frontend & backend development in parallel",
                    "Weekly progress demos every Friday",
                    "Internal QA and performance optimization",
                ],
                status=SopStatus.active,
            ),
            SopStep(
                order_index=3, icon_key="Eye", title="4. Review & Revisions",
                subtitle="Your feedback shapes the final product", duration="Days 29-35",
                details=[
                    "Client review of the staging environment",
                    "2 rounds of revision included",
                    "Bug fixes and polish pass",
                    "Content population and final checks",
                ],
                status=SopStatus.pending,
            ),
            SopStep(
                order_index=4, icon_key="Rocket", title="5. Launch & Handover",
                subtitle="Going live with full support", duration="Days 36-42",
                details=[
                    "Final deployment to production",
                    "DNS and domain configuration",
                    "Admin training session (1 hour)",
                    "30 days post-launch support included",
                ],
                status=SopStatus.pending,
            ),
        ]
    )

    db.add_all(
        [
            Deliverable(
                order_index=0, icon_key="Globe", title="Responsive Website",
                description="Fully responsive, cross-browser compatible web application.",
                status=DeliverableStatus.completed, date="Jan 20, 2026", files=24,
            ),
            Deliverable(
                order_index=1, icon_key="Palette", title="Design System & UI Kit",
                description="Complete component library with typography, colors, icons.",
                status=DeliverableStatus.completed, date="Jan 22, 2026", files=8,
            ),
            Deliverable(
                order_index=2, icon_key="Settings", title="Admin Dashboard",
                description="Full-featured admin panel with analytics and user management.",
                status=DeliverableStatus.in_progress, date="Feb 15, 2026", files=16, progress=65,
            ),
            Deliverable(
                order_index=3, icon_key="FileText", title="Technical Documentation",
                description="Comprehensive docs covering architecture, API, deployment.",
                status=DeliverableStatus.in_progress, date="Feb 20, 2026", files=5, progress=30,
            ),
            Deliverable(
                order_index=4, icon_key="Smartphone", title="Mobile App (iOS & Android)",
                description="Cross-platform with push notifications and offline support.",
                status=DeliverableStatus.upcoming, date="Mar 10, 2026", files=12,
            ),
            Deliverable(
                order_index=5, icon_key="BookOpen", title="User Guide & Manual",
                description="End-user documentation with screenshots and video tutorials.",
                status=DeliverableStatus.upcoming, date="Mar 20, 2026", files=3,
            ),
        ]
    )

    sprint1 = TimelinePhase(
        order_index=0, phase_label="Sprint 1", title="Foundation",
        date_range="Jan 15 — Jan 28", status=TimelinePhaseStatus.completed,
    )
    sprint1.items = [
        TimelineItem(order_index=0, label="Project kickoff & onboarding", done=True),
        TimelineItem(order_index=1, label="Requirements finalization", done=True),
        TimelineItem(order_index=2, label="UI/UX wireframes (v1)", done=True),
        TimelineItem(order_index=3, label="Design system setup", done=True),
        TimelineItem(order_index=4, label="Core architecture setup", done=True),
    ]

    sprint2 = TimelinePhase(
        order_index=1, phase_label="Sprint 2", title="Core Build",
        date_range="Jan 29 — Feb 11", status=TimelinePhaseStatus.active, progress=60,
    )
    sprint2.items = [
        TimelineItem(order_index=0, label="Frontend: main pages", done=True),
        TimelineItem(order_index=1, label="Backend: API endpoints", done=True),
        TimelineItem(order_index=2, label="Database schema & migrations", done=False),
        TimelineItem(order_index=3, label="Authentication system", done=False),
        TimelineItem(order_index=4, label="Integration testing", done=False),
    ]

    sprint3 = TimelinePhase(
        order_index=2, phase_label="Sprint 3", title="Feature Complete",
        date_range="Feb 12 — Feb 25", status=TimelinePhaseStatus.upcoming,
    )
    sprint3.items = [
        TimelineItem(order_index=0, label="Admin dashboard", done=False),
        TimelineItem(order_index=1, label="Search & filtering", done=False),
        TimelineItem(order_index=2, label="Notifications system", done=False),
        TimelineItem(order_index=3, label="Performance optimization", done=False),
        TimelineItem(order_index=4, label="Security audit", done=False),
    ]

    sprint4 = TimelinePhase(
        order_index=3, phase_label="Sprint 4", title="Polish & Launch",
        date_range="Feb 26 — Mar 10", status=TimelinePhaseStatus.upcoming,
    )
    sprint4.items = [
        TimelineItem(order_index=0, label="Client review & revisions", done=False),
        TimelineItem(order_index=1, label="QA & bug fixes", done=False),
        TimelineItem(order_index=2, label="Staging deployment", done=False),
        TimelineItem(order_index=3, label="Production launch", done=False),
        TimelineItem(order_index=4, label="Handover & documentation", done=False),
    ]

    db.add_all([sprint1, sprint2, sprint3, sprint4])

    db.add_all(
        [
            PaymentInstallment(
                order_index=0, installment_label="1st", label="Down Payment",
                amount=150000, due_date="Jan 15, 2026", status=PaymentStatus.paid,
            ),
            PaymentInstallment(
                order_index=1, installment_label="2nd", label="Mid-Project Milestone",
                amount=100000, due_date="Feb 10, 2026", status=PaymentStatus.pending,
            ),
            PaymentInstallment(
                order_index=2, installment_label="3rd", label="Pre-Launch Payment",
                amount=100000, due_date="Feb 28, 2026", status=PaymentStatus.upcoming,
            ),
            PaymentInstallment(
                order_index=3, installment_label="4th", label="Final Payment",
                amount=50000, due_date="Mar 10, 2026", status=PaymentStatus.upcoming,
            ),
        ]
    )

    db.commit()
    return {"detail": "Seeded", "admin_email": "admin@avlokai.com"}
