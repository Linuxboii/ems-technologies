from typing import List, Optional

from pydantic import BaseModel, EmailStr

from app.models import (
    DeliverableStatus,
    PaymentStatus,
    Role,
    SopStatus,
    TimelinePhaseStatus,
)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: Role

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    role: Role


class SopStepOut(BaseModel):
    id: int
    order_index: int
    icon_key: str
    title: str
    subtitle: str
    duration: str
    details: List[str]
    status: SopStatus

    class Config:
        from_attributes = True


class SopStepCreate(BaseModel):
    order_index: int
    icon_key: str
    title: str
    subtitle: str
    duration: str
    details: List[str]
    status: SopStatus = SopStatus.pending


class SopStepUpdate(SopStepCreate):
    pass


class DeliverableOut(BaseModel):
    id: int
    order_index: int
    icon_key: str
    title: str
    description: str
    status: DeliverableStatus
    date: str
    files: int
    progress: Optional[int] = None
    client_acknowledged: bool

    class Config:
        from_attributes = True


class DeliverableCreate(BaseModel):
    order_index: int
    icon_key: str
    title: str
    description: str
    status: DeliverableStatus = DeliverableStatus.upcoming
    date: str
    files: int = 0
    progress: Optional[int] = None


class DeliverableUpdate(DeliverableCreate):
    pass


class TimelineItemOut(BaseModel):
    id: int
    order_index: int
    label: str
    done: bool

    class Config:
        from_attributes = True


class TimelineItemCreate(BaseModel):
    phase_id: int
    order_index: int
    label: str
    done: bool = False


class TimelineItemUpdate(BaseModel):
    order_index: int
    label: str
    done: bool


class TimelineItemDoneUpdate(BaseModel):
    done: bool


class TimelinePhaseOut(BaseModel):
    id: int
    order_index: int
    phase_label: str
    title: str
    date_range: str
    status: TimelinePhaseStatus
    progress: Optional[int] = None
    items: List[TimelineItemOut] = []

    class Config:
        from_attributes = True


class TimelinePhaseCreate(BaseModel):
    order_index: int
    phase_label: str
    title: str
    date_range: str
    status: TimelinePhaseStatus = TimelinePhaseStatus.upcoming
    progress: Optional[int] = None


class TimelinePhaseUpdate(TimelinePhaseCreate):
    pass


class PaymentOut(BaseModel):
    id: int
    order_index: int
    installment_label: str
    label: str
    amount: int
    due_date: str
    status: PaymentStatus

    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    order_index: int
    installment_label: str
    label: str
    amount: int
    due_date: str
    status: PaymentStatus = PaymentStatus.upcoming


class PaymentUpdate(PaymentCreate):
    pass
