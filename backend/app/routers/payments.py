from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_role
from app.db import get_db
from app.models import PaymentInstallment, PaymentStatus, Role, User
from app.schemas import PaymentCreate, PaymentOut, PaymentUpdate

router = APIRouter(prefix="/api/payments")


@router.get("", response_model=List[PaymentOut])
def list_payments(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return db.query(PaymentInstallment).order_by(PaymentInstallment.order_index).all()


@router.post("", response_model=PaymentOut, status_code=201)
def create_payment(
    body: PaymentCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    item = PaymentInstallment(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=PaymentOut)
def update_payment(
    item_id: int,
    body: PaymentUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    item = db.get(PaymentInstallment, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Payment installment not found")
    for key, value in body.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_payment(
    item_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    item = db.get(PaymentInstallment, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Payment installment not found")
    db.delete(item)
    db.commit()


@router.patch("/{item_id}/submit", response_model=PaymentOut)
def submit_payment(
    item_id: int,
    db: Session = Depends(get_db),
    _client: User = Depends(require_role(Role.client)),
):
    item = db.get(PaymentInstallment, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Payment installment not found")
    if item.status not in (PaymentStatus.upcoming, PaymentStatus.pending):
        raise HTTPException(status_code=400, detail="Payment cannot be submitted from its current status")
    item.status = PaymentStatus.submitted
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}/confirm-paid", response_model=PaymentOut)
def confirm_paid(
    item_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    item = db.get(PaymentInstallment, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Payment installment not found")
    if item.status != PaymentStatus.submitted:
        raise HTTPException(status_code=400, detail="Payment must be submitted before it can be confirmed paid")
    item.status = PaymentStatus.paid
    db.commit()
    db.refresh(item)
    return item
