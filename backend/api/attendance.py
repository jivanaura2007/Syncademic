from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime
from backend.database.database import get_db
from backend.database.models import User, Subject, AttendanceRecord
from backend.schemas.schemas import AttendanceMark, AttendanceRecordOut
from backend.services.attendance_service import calculate_overall_attendance_summary, calculate_subject_bunk_stats
from backend.core.dependencies import get_current_user

router = APIRouter(prefix="/attendance", tags=["attendance"])

@router.get("", response_model=List[AttendanceRecordOut])
def get_attendance(
    subject_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceRecord).filter(AttendanceRecord.user_id == current_user.id)
    if subject_id:
        query = query.filter(AttendanceRecord.subject_id == subject_id)
    records = query.order_by(AttendanceRecord.date.desc()).all()
    return [
        AttendanceRecordOut(
            id=r.id,
            subjectId=r.subject_id,
            date=r.date,
            timeSlot=r.time_slot,
            status=r.status,
            note=r.note,
            updatedAt=r.updated_at
        )
        for r in records
    ]

@router.post("/mark")
def mark_attendance(
    mark_in: AttendanceMark,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == mark_in.subjectId, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    existing_record = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id == current_user.id,
        AttendanceRecord.subject_id == mark_in.subjectId,
        AttendanceRecord.date == mark_in.date,
        AttendanceRecord.time_slot == mark_in.timeSlot
    ).first()

    prev_status = existing_record.status if existing_record else None
    now_str = datetime.utcnow().isoformat()

    if existing_record:
        existing_record.status = mark_in.status
        if mark_in.note is not None:
            existing_record.note = mark_in.note
        existing_record.updated_at = now_str
        target_record = existing_record
    else:
        new_record = AttendanceRecord(
            id="rec-" + str(uuid.uuid4())[:8],
            user_id=current_user.id,
            subject_id=mark_in.subjectId,
            date=mark_in.date,
            time_slot=mark_in.timeSlot,
            status=mark_in.status,
            note=mark_in.note,
            updated_at=now_str
        )
        db.add(new_record)
        target_record = new_record

    # Authoritative calculation of subject attendance metrics
    delta_attended = 0
    delta_total = 0

    if prev_status is None:
        if mark_in.status == "present":
            delta_attended = 1
            delta_total = 1
        elif mark_in.status == "absent":
            delta_attended = 0
            delta_total = 1
    elif prev_status != mark_in.status:
        if prev_status == "present":
            delta_attended -= 1
            delta_total -= 1
        elif prev_status == "absent":
            delta_total -= 1

        if mark_in.status == "present":
            delta_attended += 1
            delta_total += 1
        elif mark_in.status == "absent":
            delta_total += 1

    if delta_attended != 0 or delta_total != 0:
        new_att = max(0, (subject.attended_classes or 0) + delta_attended)
        new_tot = max(new_att, (subject.total_classes or 0) + delta_total)
        subject.attended_classes = new_att
        subject.total_classes = new_tot

    db.commit()
    db.refresh(target_record)
    db.refresh(subject)

    return {
        "record": {
            "id": target_record.id,
            "subjectId": target_record.subject_id,
            "date": target_record.date,
            "timeSlot": target_record.time_slot,
            "status": target_record.status,
            "note": target_record.note,
            "updatedAt": target_record.updated_at
        },
        "updatedSubject": {
            "id": subject.id,
            "name": subject.name,
            "code": subject.code,
            "attendedClasses": subject.attended_classes,
            "totalClasses": subject.total_classes,
            "targetAttendance": subject.target_attendance
        }
    }

@router.get("/summary")
def get_attendance_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subjects = db.query(Subject).filter(Subject.user_id == current_user.id).all()
    return calculate_overall_attendance_summary(subjects)
