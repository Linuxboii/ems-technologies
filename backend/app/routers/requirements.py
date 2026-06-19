from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_role
from app.db import get_db
from app.models import RequirementSection, Role, User
from app.schemas import (
    RequirementSectionCreate,
    RequirementSectionOut,
    RequirementSectionUpdate,
)

router = APIRouter(prefix="/api/requirements")


@router.get("", response_model=List[RequirementSectionOut])
def list_sections(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return db.query(RequirementSection).order_by(RequirementSection.order_index).all()


@router.post("", response_model=RequirementSectionOut, status_code=201)
def create_section(
    body: RequirementSectionCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    section = RequirementSection(**body.model_dump())
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.put("/{section_id}", response_model=RequirementSectionOut)
def update_section(
    section_id: int,
    body: RequirementSectionUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    section = db.get(RequirementSection, section_id)
    if section is None:
        raise HTTPException(status_code=404, detail="Requirement section not found")
    for key, value in body.model_dump().items():
        setattr(section, key, value)
    db.commit()
    db.refresh(section)
    return section


@router.delete("/{section_id}", status_code=204)
def delete_section(
    section_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    section = db.get(RequirementSection, section_id)
    if section is None:
        raise HTTPException(status_code=404, detail="Requirement section not found")
    db.delete(section)
    db.commit()
