from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
import json
from backend.database.database import get_db
from backend.database.models import User, Subject, TimetableSlot, AcademicNote, AcademicEvent
from backend.schemas.schemas import UserRegister, UserLogin, ProfileUpdate
from backend.core.security import hash_password, verify_password, create_access_token
from backend.core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

def get_user_full_state(user: User, db: Session):
    """Serializes the user's full workspace state for frontend reactive hydration"""
    subjects = db.query(Subject).filter(Subject.user_id == user.id).all()
    timetable_slots = db.query(TimetableSlot).filter(TimetableSlot.user_id == user.id).all()
    notes = db.query(AcademicNote).filter(AcademicNote.user_id == user.id).all()
    events = db.query(AcademicEvent).filter(AcademicEvent.user_id == user.id).all()
    attendance_records = [
        {
            "id": r.id,
            "subjectId": r.subject_id,
            "date": r.date,
            "timeSlot": r.time_slot,
            "status": r.status,
            "note": r.note,
            "updatedAt": r.updated_at
        }
        for r in user.attendance_records
    ]

    return {
        "isAuthenticated": True,
        "profile": {
            "name": user.name,
            "email": user.email,
            "university": user.university,
            "department": user.department,
            "semester": user.semester,
            "section": user.section,
            "rollNumber": user.roll_number,
            "attendanceThreshold": user.attendance_threshold,
            "semesterStartDate": user.semester_start_date,
            "semesterEndDate": user.semester_end_date
        },
        "subjects": [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "faculty": s.faculty,
                "credits": s.credits,
                "targetAttendance": s.target_attendance,
                "attendedClasses": s.attended_classes,
                "totalClasses": s.total_classes,
                "color": s.color,
                "room": s.room
            }
            for s in subjects
        ],
        "attendanceRecords": attendance_records,
        "timetableSlots": [
            {
                "id": t.id,
                "day": t.day,
                "startTime": t.start_time,
                "endTime": t.end_time,
                "subjectId": t.subject_id,
                "room": t.room,
                "type": t.type
            }
            for t in timetable_slots
        ],
        "replacementDays": [
            {"id": r.id, "date": r.date, "dayToFollow": r.day_to_follow, "reason": r.reason}
            for r in user.replacement_days
        ],
        "facultyLeaves": [
            {"id": f.id, "facultyName": f.faculty_name, "subjectId": f.subject_id, "date": f.date, "reason": f.reason}
            for f in user.faculty_leaves
        ],
        "holidays": [],
        "notes": [
            {
                "id": n.id,
                "title": n.title,
                "subjectId": n.subject_id,
                "category": n.category,
                "content": n.content,
                "onedriveLink": n.onedrive_link,
                "fileType": n.file_type,
                "tags": json.loads(n.tags) if n.tags else [],
                "createdAt": n.created_at,
                "updatedAt": n.updated_at
            }
            for n in notes
        ],
        "events": [
            {
                "id": e.id,
                "title": e.title,
                "date": e.date,
                "endDate": e.end_date,
                "time": e.time,
                "type": e.type,
                "subjectId": e.subject_id,
                "description": e.description,
                "priority": e.priority,
                "completed": e.completed
            }
            for e in events
        ],
        "aiSettings": {
            "provider": "gemini",
            "model": "gemini-2.5-flash"
        },
        "oneDriveSettings": {
            "connected": False,
            "rootFolder": "Syncademic Vault"
        }
    }

@router.post("/register")
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_user = User(
        id="usr-" + str(uuid.uuid4())[:8],
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        name=user_in.name,
        university=user_in.university or "Institute of Technology",
        department=user_in.department or "Computer Science & Engineering",
        semester=user_in.semester or 4
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id)
    state = get_user_full_state(new_user, db)

    return {
        "token": token,
        "user": {"id": new_user.id, "email": new_user.email, "name": new_user.name},
        "state": state
    }

@router.post("/login")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user.id)
    state = get_user_full_state(user, db)

    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "name": user.name},
        "state": state
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    state = get_user_full_state(current_user, db)
    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "university": current_user.university
        },
        "state": state
    }

@router.put("/profile")
def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile_data.name:
        current_user.name = profile_data.name
    if profile_data.university:
        current_user.university = profile_data.university
    if profile_data.department:
        current_user.department = profile_data.department
    if profile_data.semester:
        current_user.semester = profile_data.semester
    if profile_data.section:
        current_user.section = profile_data.section
    if profile_data.rollNumber:
        current_user.roll_number = profile_data.rollNumber
    if profile_data.attendanceThreshold:
        current_user.attendance_threshold = profile_data.attendanceThreshold
    if profile_data.semesterStartDate:
        current_user.semester_start_date = profile_data.semesterStartDate
    if profile_data.semesterEndDate:
        current_user.semester_end_date = profile_data.semesterEndDate

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Profile updated successfully",
        "profile": {
            "name": current_user.name,
            "email": current_user.email,
            "university": current_user.university,
            "department": current_user.department,
            "semester": current_user.semester,
            "section": current_user.section,
            "rollNumber": current_user.roll_number,
            "attendanceThreshold": current_user.attendance_threshold,
            "semesterStartDate": current_user.semester_start_date,
            "semesterEndDate": current_user.semester_end_date
        }
    }
