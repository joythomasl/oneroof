"""Area/district endpoints backed by the shared Person 5 database."""

from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.area import AreaCreate, AreaOut, AreaUpdate
from app.models.database_records import AreaRecord
from app.models.events import EventType
from app.services.redis_service import redis_service

router = APIRouter(prefix="/areas", tags=["Areas"])


@router.post("/", response_model=AreaOut, status_code=status.HTTP_201_CREATED)
def create_area(payload: AreaCreate, db: Session = Depends(get_db)):
    area = AreaRecord(**payload.model_dump(mode="json"))
    db.add(area)
    try:
        db.commit()
        db.refresh(area)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="District code already exists") from exc
    return area


@router.get("/", response_model=List[AreaOut])
def list_areas(db: Session = Depends(get_db)):
    return db.query(AreaRecord).order_by(AreaRecord.name).all()


@router.get("/{area_id}", response_model=AreaOut)
def get_area(area_id: int, db: Session = Depends(get_db)):
    area = db.get(AreaRecord, area_id)
    if area is None:
        raise HTTPException(status_code=404, detail="Area not found")
    return area


@router.patch("/{area_id}", response_model=AreaOut)
def update_area(
    area_id: int,
    payload: AreaUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    area = db.get(AreaRecord, area_id)
    if area is None:
        raise HTTPException(status_code=404, detail="Area not found")
    changes = payload.model_dump(exclude_unset=True, mode="json")
    for field, value in changes.items():
        setattr(area, field, value)
    db.commit()
    db.refresh(area)
    background_tasks.add_task(
        redis_service.publish_event,
        EventType.AREA_UPDATED.value,
        None,
        {"area_id": area.id, "changed_fields": sorted(changes)},
    )
    return area
