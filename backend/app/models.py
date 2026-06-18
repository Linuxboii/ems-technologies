import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db import Base


class Role(str, enum.Enum):
    admin = "admin"
    client = "client"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(SAEnum(Role), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SopStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    completed = "completed"


class SopStep(Base):
    __tablename__ = "sop_steps"

    id = Column(Integer, primary_key=True)
    order_index = Column(Integer, nullable=False)
    icon_key = Column(String, nullable=False)
    title = Column(String, nullable=False)
    subtitle = Column(String, nullable=False)
    duration = Column(String, nullable=False)
    details = Column(JSON, nullable=False, default=list)
    status = Column(SAEnum(SopStatus), nullable=False, default=SopStatus.pending)


class DeliverableStatus(str, enum.Enum):
    upcoming = "upcoming"
    in_progress = "in-progress"
    completed = "completed"


class Deliverable(Base):
    __tablename__ = "deliverables"

    id = Column(Integer, primary_key=True)
    order_index = Column(Integer, nullable=False)
    icon_key = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(SAEnum(DeliverableStatus), nullable=False, default=DeliverableStatus.upcoming)
    date = Column(String, nullable=False)
    files = Column(Integer, nullable=False, default=0)
    progress = Column(Integer, nullable=True)
    client_acknowledged = Column(Boolean, nullable=False, default=False)


class TimelinePhaseStatus(str, enum.Enum):
    upcoming = "upcoming"
    active = "active"
    completed = "completed"


class TimelinePhase(Base):
    __tablename__ = "timeline_phases"

    id = Column(Integer, primary_key=True)
    order_index = Column(Integer, nullable=False)
    phase_label = Column(String, nullable=False)
    title = Column(String, nullable=False)
    date_range = Column(String, nullable=False)
    status = Column(SAEnum(TimelinePhaseStatus), nullable=False, default=TimelinePhaseStatus.upcoming)
    progress = Column(Integer, nullable=True)

    items = relationship(
        "TimelineItem",
        back_populates="phase",
        order_by="TimelineItem.order_index",
        cascade="all, delete-orphan",
    )


class TimelineItem(Base):
    __tablename__ = "timeline_items"

    id = Column(Integer, primary_key=True)
    phase_id = Column(Integer, ForeignKey("timeline_phases.id"), nullable=False)
    order_index = Column(Integer, nullable=False)
    label = Column(String, nullable=False)
    done = Column(Boolean, nullable=False, default=False)

    phase = relationship("TimelinePhase", back_populates="items")


class PaymentStatus(str, enum.Enum):
    upcoming = "upcoming"
    pending = "pending"
    submitted = "submitted"
    paid = "paid"


class PaymentInstallment(Base):
    __tablename__ = "payment_installments"

    id = Column(Integer, primary_key=True)
    order_index = Column(Integer, nullable=False)
    installment_label = Column(String, nullable=False)
    label = Column(String, nullable=False)
    amount = Column(Integer, nullable=False)
    due_date = Column(String, nullable=False)
    status = Column(SAEnum(PaymentStatus), nullable=False, default=PaymentStatus.upcoming)
