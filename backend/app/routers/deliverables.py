from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_role
from app.db import get_db
from app.models import Deliverable, Role, User
from app.schemas import DeliverableCreate, DeliverableOut, DeliverableUpdate

router = APIRouter(prefix="/api/deliverables")


@router.get("", response_model=List[DeliverableOut])
def list_deliverables(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return db.query(Deliverable).order_by(Deliverable.order_index).all()


@router.post("", response_model=DeliverableOut, status_code=201)
def create_deliverable(
    body: DeliverableCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    item = Deliverable(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=DeliverableOut)
def update_deliverable(
    item_id: int,
    body: DeliverableUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    item = db.get(Deliverable, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    for key, value in body.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_deliverable(
    item_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    item = db.get(Deliverable, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    db.delete(item)
    db.commit()


@router.patch("/{item_id}/acknowledge", response_model=DeliverableOut)
def acknowledge_deliverable(
    item_id: int,
    db: Session = Depends(get_db),
    _client: User = Depends(require_role(Role.client)),
):
    item = db.get(Deliverable, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    item.client_acknowledged = True
    db.commit()
    db.refresh(item)
    return item
