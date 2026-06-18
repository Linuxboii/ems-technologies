from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_role
from app.db import get_db
from app.models import Role, SopStep, User
from app.schemas import SopStepCreate, SopStepOut, SopStepUpdate

router = APIRouter(prefix="/api/sop")


@router.get("", response_model=List[SopStepOut])
def list_steps(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return db.query(SopStep).order_by(SopStep.order_index).all()


@router.post("", response_model=SopStepOut, status_code=201)
def create_step(
    body: SopStepCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    step = SopStep(**body.model_dump())
    db.add(step)
    db.commit()
    db.refresh(step)
    return step


@router.put("/{step_id}", response_model=SopStepOut)
def update_step(
    step_id: int,
    body: SopStepUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    step = db.get(SopStep, step_id)
    if step is None:
        raise HTTPException(status_code=404, detail="SoP step not found")
    for key, value in body.model_dump().items():
        setattr(step, key, value)
    db.commit()
    db.refresh(step)
    return step


@router.delete("/{step_id}", status_code=204)
def delete_step(
    step_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    step = db.get(SopStep, step_id)
    if step is None:
        raise HTTPException(status_code=404, detail="SoP step not found")
    db.delete(step)
    db.commit()
