from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid
from backend.database.database import get_db
from backend.database.models import User, TimetableSlot, ReplacementDay, FacultyLeave
from backend.schemas.schemas import (
    TimetableSlotCreate, TimetableSlotOut,
    ReplacementDayCreate, ReplacementDayOut,
    FacultyLeaveCreate, FacultyLeaveOut
)
from backend.core.dependencies import get_current_user

router = APIRouter(prefix="/timetable", tags=["timetable"])

@router.get("")
def get_timetable(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    slots = db.query(TimetableSlot).filter(TimetableSlot.user_id == current_user.id).all()
    replacement_days = db.query(ReplacementDay).filter(ReplacementDay.user_id == current_user.id).all()
    faculty_leaves = db.query(FacultyLeave).filter(FacultyLeave.user_id == current_user.id).all()

    return {
        "slots": [
            {
                "id": s.id,
                "day": s.day,
                "startTime": s.start_time,
                "endTime": s.end_time,
                "subjectId": s.subject_id,
                "room": s.room,
                "type": s.type
            }
            for s in slots
        ],
        "replacementDays": [
            {"id": r.id, "date": r.date, "dayToFollow": r.day_to_follow, "reason": r.reason}
            for r in replacement_days
        ],
        "facultyLeaves": [
            {"id": f.id, "facultyName": f.faculty_name, "subjectId": f.subject_id, "date": f.date, "reason": f.reason}
            for f in faculty_leaves
        ],
        "holidays": []
    }

@router.post("/slot", response_model=TimetableSlotOut, status_code=status.HTTP_201_CREATED)
def add_slot(
    slot_in: TimetableSlotCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_slot = TimetableSlot(
        id="tt-" + str(uuid.uuid4())[:8],
        user_id=current_user.id,
        day=slot_in.day,
        start_time=slot_in.startTime,
        end_time=slot_in.endTime,
        subject_id=slot_in.subjectId,
        room=slot_in.room or "Room 301",
        type=slot_in.type or "lecture"
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)

    return TimetableSlotOut(
        id=new_slot.id,
        day=new_slot.day,
        startTime=new_slot.start_time,
        endTime=new_slot.end_time,
        subjectId=new_slot.subject_id,
        room=new_slot.room,
        type=new_slot.type
    )

@router.delete("/slot/{slot_id}")
def delete_slot(
    slot_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    slot = db.query(TimetableSlot).filter(TimetableSlot.id == slot_id, TimetableSlot.user_id == current_user.id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    db.delete(slot)
    db.commit()
    return {"message": "Timetable slot deleted successfully", "slotId": slot_id}

@router.post("/replacement-day", response_model=ReplacementDayOut)
def add_replacement_day(
    rep_in: ReplacementDayCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Remove existing for same date
    db.query(ReplacementDay).filter(
        ReplacementDay.user_id == current_user.id,
        ReplacementDay.date == rep_in.date
    ).delete()

    new_rep = ReplacementDay(
        id="rep-" + str(uuid.uuid4())[:8],
        user_id=current_user.id,
        date=rep_in.date,
        day_to_follow=rep_in.dayToFollow,
        reason=rep_in.reason
    )
    db.add(new_rep)
    db.commit()
    db.refresh(new_rep)

    return ReplacementDayOut(
        id=new_rep.id,
        date=new_rep.date,
        dayToFollow=new_rep.day_to_follow,
        reason=new_rep.reason
    )

@router.delete("/replacement-day/{rep_id}")
def delete_replacement_day(
    rep_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rep = db.query(ReplacementDay).filter(ReplacementDay.id == rep_id, ReplacementDay.user_id == current_user.id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Replacement day not found")
    db.delete(rep)
    db.commit()
    return {"message": "Replacement day deleted", "id": rep_id}

@router.post("/faculty-leave", response_model=FacultyLeaveOut)
def add_faculty_leave(
    leave_in: FacultyLeaveCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_leave = FacultyLeave(
        id="fl-" + str(uuid.uuid4())[:8],
        user_id=current_user.id,
        faculty_name=leave_in.facultyName,
        subject_id=leave_in.subjectId,
        date=leave_in.date,
        reason=leave_in.reason
    )
    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)

    return FacultyLeaveOut(
        id=new_leave.id,
        facultyName=new_leave.faculty_name,
        subjectId=new_leave.subject_id,
        date=new_leave.date,
        reason=new_leave.reason
    )

@router.delete("/faculty-leave/{leave_id}")
def delete_faculty_leave(
    leave_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    leave = db.query(FacultyLeave).filter(FacultyLeave.id == leave_id, FacultyLeave.user_id == current_user.id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Faculty leave record not found")
    db.delete(leave)
    db.commit()
    return {"message": "Faculty leave record deleted", "id": leave_id}
