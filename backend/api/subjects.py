from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid
from backend.database.database import get_db
from backend.database.models import User, Subject, AttendanceRecord, TimetableSlot, AcademicNote, AcademicEvent
from backend.schemas.schemas import SubjectCreate, SubjectUpdate, SubjectOut
from backend.core.dependencies import get_current_user

router = APIRouter(prefix="/subjects", tags=["subjects"])

@router.get("", response_model=List[SubjectOut])
def get_subjects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subjects = db.query(Subject).filter(Subject.user_id == current_user.id).all()
    return [
        SubjectOut(
            id=s.id,
            name=s.name,
            code=s.code,
            faculty=s.faculty,
            credits=s.credits,
            targetAttendance=s.target_attendance,
            attendedClasses=s.attended_classes,
            totalClasses=s.total_classes,
            color=s.color,
            room=s.room
        )
        for s in subjects
    ]

@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject_in: SubjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_subject = Subject(
        id="sub-" + str(uuid.uuid4())[:8],
        user_id=current_user.id,
        name=subject_in.name,
        code=subject_in.code,
        faculty=subject_in.faculty or "Faculty Member",
        credits=subject_in.credits or 3,
        target_attendance=subject_in.targetAttendance or 75,
        attended_classes=subject_in.attendedClasses or 0,
        total_classes=subject_in.totalClasses or 0,
        color=subject_in.color or "#007FFF",
        room=subject_in.room or "Room 301"
    )
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)

    return SubjectOut(
        id=new_subject.id,
        name=new_subject.name,
        code=new_subject.code,
        faculty=new_subject.faculty,
        credits=new_subject.credits,
        targetAttendance=new_subject.target_attendance,
        attendedClasses=new_subject.attended_classes,
        totalClasses=new_subject.total_classes,
        color=new_subject.color,
        room=new_subject.room
    )

@router.put("/{subject_id}", response_model=SubjectOut)
def update_subject(
    subject_id: str,
    subject_update: SubjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found or unauthorized")

    if subject_update.name is not None:
        subject.name = subject_update.name
    if subject_update.code is not None:
        subject.code = subject_update.code
    if subject_update.faculty is not None:
        subject.faculty = subject_update.faculty
    if subject_update.credits is not None:
        subject.credits = subject_update.credits
    if subject_update.targetAttendance is not None:
        subject.target_attendance = subject_update.targetAttendance
    if subject_update.attendedClasses is not None:
        subject.attended_classes = subject_update.attendedClasses
    if subject_update.totalClasses is not None:
        subject.total_classes = subject_update.totalClasses
    if subject_update.color is not None:
        subject.color = subject_update.color
    if subject_update.room is not None:
        subject.room = subject_update.room

    db.commit()
    db.refresh(subject)

    return SubjectOut(
        id=subject.id,
        name=subject.name,
        code=subject.code,
        faculty=subject.faculty,
        credits=subject.credits,
        targetAttendance=subject.target_attendance,
        attendedClasses=subject.attended_classes,
        totalClasses=subject.total_classes,
        color=subject.color,
        room=subject.room
    )

@router.delete("/{subject_id}")
def delete_subject(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found or unauthorized")

    # Cascade delete associated records
    db.query(AttendanceRecord).filter(AttendanceRecord.subject_id == subject_id, AttendanceRecord.user_id == current_user.id).delete()
    db.query(TimetableSlot).filter(TimetableSlot.subject_id == subject_id, TimetableSlot.user_id == current_user.id).delete()
    db.query(AcademicNote).filter(AcademicNote.subject_id == subject_id, AcademicNote.user_id == current_user.id).delete()
    db.query(AcademicEvent).filter(AcademicEvent.subject_id == subject_id, AcademicEvent.user_id == current_user.id).delete()

    db.delete(subject)
    db.commit()

    return {"message": "Subject deleted successfully", "subjectId": subject_id}
