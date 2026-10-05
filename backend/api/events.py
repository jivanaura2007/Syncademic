from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid
from backend.database.database import get_db
from backend.database.models import User, AcademicEvent
from backend.schemas.schemas import EventCreate, EventUpdate, EventOut
from backend.core.dependencies import get_current_user

router = APIRouter(prefix="/events", tags=["events"])

@router.get("", response_model=List[EventOut])
def get_events(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = db.query(AcademicEvent).filter(AcademicEvent.user_id == current_user.id).order_by(AcademicEvent.date.asc()).all()
    return [
        EventOut(
            id=e.id,
            title=e.title,
            date=e.date,
            endDate=e.end_date,
            time=e.time,
            type=e.type,
            subjectId=e.subject_id,
            description=e.description,
            priority=e.priority,
            completed=e.completed
        )
        for e in events
    ]

@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    event_in: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_event = AcademicEvent(
        id="ev-" + str(uuid.uuid4())[:8],
        user_id=current_user.id,
        title=event_in.title,
        date=event_in.date,
        end_date=event_in.endDate,
        time=event_in.time,
        type=event_in.type or "assignment",
        subject_id=event_in.subjectId,
        description=event_in.description,
        priority=event_in.priority or "medium",
        completed=event_in.completed or False
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    return EventOut(
        id=new_event.id,
        title=new_event.title,
        date=new_event.date,
        endDate=new_event.end_date,
        time=new_event.time,
        type=new_event.type,
        subjectId=new_event.subject_id,
        description=new_event.description,
        priority=new_event.priority,
        completed=new_event.completed
    )

@router.put("/{event_id}", response_model=EventOut)
def update_event(
    event_id: str,
    event_update: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(AcademicEvent).filter(AcademicEvent.id == event_id, AcademicEvent.user_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event_update.title is not None:
        event.title = event_update.title
    if event_update.date is not None:
        event.date = event_update.date
    if event_update.endDate is not None:
        event.end_date = event_update.endDate
    if event_update.time is not None:
        event.time = event_update.time
    if event_update.type is not None:
        event.type = event_update.type
    if event_update.subjectId is not None:
        event.subject_id = event_update.subjectId
    if event_update.description is not None:
        event.description = event_update.description
    if event_update.priority is not None:
        event.priority = event_update.priority
    if event_update.completed is not None:
        event.completed = event_update.completed

    db.commit()
    db.refresh(event)

    return EventOut(
        id=event.id,
        title=event.title,
        date=event.date,
        endDate=event.end_date,
        time=event.time,
        type=event.type,
        subjectId=event.subject_id,
        description=event.description,
        priority=event.priority,
        completed=event.completed
    )

@router.delete("/{event_id}")
def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(AcademicEvent).filter(AcademicEvent.id == event_id, AcademicEvent.user_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return {"message": "Event deleted successfully", "eventId": event_id}
