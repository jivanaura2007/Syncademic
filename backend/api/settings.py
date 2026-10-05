from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Dict, Any
from backend.database.database import get_db
from backend.database.models import User, Subject, AttendanceRecord, TimetableSlot, ReplacementDay, FacultyLeave, AcademicNote, AcademicEvent
from backend.core.dependencies import get_current_user
from backend.api.auth import get_user_full_state

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/state")
def get_full_state(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_user_full_state(current_user, db)

@router.put("/ai")
def update_ai_settings(
    ai_settings: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user)
):
    return ai_settings

@router.put("/onedrive")
def update_onedrive_settings(
    onedrive_settings: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user)
):
    return onedrive_settings

@router.put("/semester-dates")
def update_semester_dates(
    dates: Dict[str, str] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if "startDate" in dates:
        current_user.semester_start_date = dates["startDate"]
    if "endDate" in dates:
        current_user.semester_end_date = dates["endDate"]
    db.commit()
    return {
        "semesterStartDate": current_user.semester_start_date,
        "semesterEndDate": current_user.semester_end_date
    }

@router.post("/reset")
def reset_workspace(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Clear all user records
    db.query(Subject).filter(Subject.user_id == current_user.id).delete()
    db.query(AttendanceRecord).filter(AttendanceRecord.user_id == current_user.id).delete()
    db.query(TimetableSlot).filter(TimetableSlot.user_id == current_user.id).delete()
    db.query(ReplacementDay).filter(ReplacementDay.user_id == current_user.id).delete()
    db.query(FacultyLeave).filter(FacultyLeave.user_id == current_user.id).delete()
    db.query(AcademicNote).filter(AcademicNote.user_id == current_user.id).delete()
    db.query(AcademicEvent).filter(AcademicEvent.user_id == current_user.id).delete()

    # Re-seed verified standard subjects
    sub1 = Subject(id="sub-cs401", user_id=current_user.id, name="Database Management Systems", code="CS401", faculty="Dr. R. K. Sharma", credits=4, target_attendance=75, attended_classes=22, total_classes=26, color="#007FFF", room="LT-4")
    sub2 = Subject(id="sub-cs402", user_id=current_user.id, name="Operating Systems & Concurrency", code="CS402", faculty="Prof. A. N. Murthy", credits=4, target_attendance=75, attended_classes=19, total_classes=24, color="#10B981", room="LT-2")
    sub3 = Subject(id="sub-cs403", user_id=current_user.id, name="Computer Networks & Protocols", code="CS403", faculty="Dr. Meenakshi S.", credits=3, target_attendance=75, attended_classes=14, total_classes=20, color="#F59E0B", room="Room 204")
    sub4 = Subject(id="sub-cs404", user_id=current_user.id, name="Design & Analysis of Algorithms", code="CS404", faculty="Dr. Sanjay Verma", credits=4, target_attendance=75, attended_classes=12, total_classes=22, color="#EF4444", room="Audi-B")
    sub5 = Subject(id="sub-cs405", user_id=current_user.id, name="Theory of Computation", code="CS405", faculty="Prof. K. G. Sen", credits=3, target_attendance=75, attended_classes=16, total_classes=18, color="#8B5CF6", room="Room 108")
    
    db.add_all([sub1, sub2, sub3, sub4, sub5])
    db.commit()

    state = get_user_full_state(current_user, db)
    return {"message": "Workspace reset to verified default semester data", "state": state}

@router.post("/import")
def import_workspace(
    data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Invalid workspace JSON data payload")

    # Clear and re-populate
    db.query(Subject).filter(Subject.user_id == current_user.id).delete()
    db.query(AttendanceRecord).filter(AttendanceRecord.user_id == current_user.id).delete()
    db.query(TimetableSlot).filter(TimetableSlot.user_id == current_user.id).delete()
    db.query(ReplacementDay).filter(ReplacementDay.user_id == current_user.id).delete()
    db.query(FacultyLeave).filter(FacultyLeave.user_id == current_user.id).delete()
    db.query(AcademicNote).filter(AcademicNote.user_id == current_user.id).delete()
    db.query(AcademicEvent).filter(AcademicEvent.user_id == current_user.id).delete()

    if "subjects" in data and isinstance(data["subjects"], list):
        for s in data["subjects"]:
            db.add(Subject(
                id=s.get("id", "sub-" + str(uuid.uuid4())[:8]),
                user_id=current_user.id,
                name=s.get("name", "Untitled"),
                code=s.get("code", "SUB"),
                faculty=s.get("faculty", "Faculty Member"),
                credits=s.get("credits", 3),
                target_attendance=s.get("targetAttendance", 75),
                attended_classes=s.get("attendedClasses", 0),
                total_classes=s.get("totalClasses", 0),
                color=s.get("color", "#007FFF"),
                room=s.get("room", "Room 301")
            ))

    db.commit()
    state = get_user_full_state(current_user, db)
    return {"message": "Workspace imported successfully", "state": state}
