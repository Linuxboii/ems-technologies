from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import hash_password, require_role
from app.db import get_db
from app.models import Role, User
from app.schemas import CreateUserRequest, UserOut

router = APIRouter(prefix="/api/admin")


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(
    body: CreateUserRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(Role.admin)),
):
    if db.query(User).filter(User.email == body.email).first() is not None:
        raise HTTPException(status_code=409, detail="Email already in use")
    user = User(email=body.email, password_hash=hash_password(body.password), role=body.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
