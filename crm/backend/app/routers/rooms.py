from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User, UserRole
from app.models.room import Room
from app.schemas.room import RoomCreate, RoomUpdate, RoomOut
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/rooms", tags=["rooms"])

AdminOrTeacher = require_roles(UserRole.admin, UserRole.teacher, module="rooms")


@router.get("", response_model=List[RoomOut])
def list_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Room).filter(Room.is_active == True).order_by(Room.name).all()


@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def create_room(
    body: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    room = Room(**body.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.put("/{room_id}", response_model=RoomOut)
def update_room(
    room_id: int,
    body: RoomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Xona topilmadi")
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(room, key, value)
    db.commit()
    db.refresh(room)
    return room


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin, module="rooms")),
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Xona topilmadi")
    room.is_active = False
    db.commit()
