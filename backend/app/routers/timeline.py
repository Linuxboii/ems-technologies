from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_role
from app.db import get_db
from app.models import Role, TimelineItem, TimelinePhase, User
from app.schemas import (
    TimelineItemCreate,
    TimelineItemDoneUpdate,
    TimelineItemOut,
    TimelineItemUpdate,
    TimelinePhaseCreate,
    TimelinePhaseOut,
    TimelinePhaseUpdate,
)

router = APIRouter(prefix="/api/timeline")


@router.get("", response_model=List[TimelinePhaseOut])
def list_phases(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return db.query(TimelinePhase).order_by(TimelinePhase.order_index).all()


@router.post("/phases", response_model=TimelinePhaseOut, status_code=201)
def create_phase(
    body: TimelinePhaseCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    phase = TimelinePhase(**body.model_dump())
    db.add(phase)
    db.commit()
    db.refresh(phase)
    return phase


@router.put("/phases/{phase_id}", response_model=TimelinePhaseOut)
def update_phase(
    phase_id: int,
    body: TimelinePhaseUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    phase = db.get(TimelinePhase, phase_id)
    if phase is None:
        raise HTTPException(status_code=404, detail="Timeline phase not found")
    for key, value in body.model_dump().items():
        setattr(phase, key, value)
    db.commit()
    db.refresh(phase)
    return phase


@router.delete("/phases/{phase_id}", status_code=204)
def delete_phase(
    phase_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    phase = db.get(TimelinePhase, phase_id)
    if phase is None:
        raise HTTPException(status_code=404, detail="Timeline phase not found")
    db.delete(phase)
    db.commit()


@router.post("/items", response_model=TimelineItemOut, status_code=201)
def create_item(
    body: TimelineItemCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    phase = db.get(TimelinePhase, body.phase_id)
    if phase is None:
        raise HTTPException(status_code=404, detail="Timeline phase not found")
    item = TimelineItem(
        phase_id=body.phase_id,
        order_index=body.order_index,
        label=body.label,
        done=body.done,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/items/{item_id}", response_model=TimelineItemOut)
def update_item(
    item_id: int,
    body: TimelineItemUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    item = db.get(TimelineItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Timeline item not found")
    item.order_index = body.order_index
    item.label = body.label
    item.done = body.done
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    item = db.get(TimelineItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Timeline item not found")
    db.delete(item)
    db.commit()


@router.patch("/items/{item_id}/done", response_model=TimelineItemOut)
def set_item_done(
    item_id: int,
    body: TimelineItemDoneUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    item = db.get(TimelineItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Timeline item not found")
    item.done = body.done
    db.commit()
    db.refresh(item)
    return item
