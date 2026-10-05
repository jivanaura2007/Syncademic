from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.database.database import engine, Base, SessionLocal
from backend.database.models import User, Subject, TimetableSlot, AcademicNote, AcademicEvent
from backend.core.security import hash_password
from backend.api import auth, subjects, attendance, timetable, notes, events, settings as settings_api, ai
import json

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API Routers under /api
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(subjects.router, prefix=settings.API_V1_STR)
app.include_router(attendance.router, prefix=settings.API_V1_STR)
app.include_router(timetable.router, prefix=settings.API_V1_STR)
app.include_router(notes.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(settings_api.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "Syncademic FastAPI Backend",
        "database": "SQLite Relational Database (SQLAlchemy)",
        "version": settings.VERSION
    }

@app.on_event("startup")
def seed_default_data():
    """Initializes the database with verified academic dataset for demo and testing"""
    db = SessionLocal()
    try:
        demo_user = db.query(User).filter(User.email == "aarav.sharma@university.edu").first()
        if not demo_user:
            demo_user = User(
                id="usr-aarav-sharma-2026",
                email="aarav.sharma@university.edu",
                password_hash=hash_password("password123"),
                name="Aarav Sharma",
                university="National Institute of Technology",
                department="Computer Science & Engineering",
                semester=4,
                section="Section B",
                roll_number="CS22B042",
                attendance_threshold=75,
                semester_start_date="2026-01-05",
                semester_end_date="2026-05-30"
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)

            # Add demo subjects
            sub1 = Subject(id="sub-cs401", user_id=demo_user.id, name="Database Management Systems", code="CS401", faculty="Dr. R. K. Sharma", credits=4, target_attendance=75, attended_classes=22, total_classes=26, color="#007FFF", room="LT-4")
            sub2 = Subject(id="sub-cs402", user_id=demo_user.id, name="Operating Systems & Concurrency", code="CS402", faculty="Prof. A. N. Murthy", credits=4, target_attendance=75, attended_classes=19, total_classes=24, color="#10B981", room="LT-2")
            sub3 = Subject(id="sub-cs403", user_id=demo_user.id, name="Computer Networks & Protocols", code="CS403", faculty="Dr. Meenakshi S.", credits=3, target_attendance=75, attended_classes=14, total_classes=20, color="#F59E0B", room="Room 204")
            sub4 = Subject(id="sub-cs404", user_id=demo_user.id, name="Design & Analysis of Algorithms", code="CS404", faculty="Dr. Sanjay Verma", credits=4, target_attendance=75, attended_classes=12, total_classes=22, color="#EF4444", room="Audi-B")
            sub5 = Subject(id="sub-cs405", user_id=demo_user.id, name="Theory of Computation", code="CS405", faculty="Prof. K. G. Sen", credits=3, target_attendance=75, attended_classes=16, total_classes=18, color="#8B5CF6", room="Room 108")
            
            db.add_all([sub1, sub2, sub3, sub4, sub5])

            # Timetable slots
            slots = [
                TimetableSlot(id="tt-1", user_id=demo_user.id, day="Monday", start_time="09:00", end_time="10:00", subject_id="sub-cs401", room="LT-4", type="lecture"),
                TimetableSlot(id="tt-2", user_id=demo_user.id, day="Monday", start_time="10:00", end_time="11:00", subject_id="sub-cs402", room="LT-2", type="lecture"),
                TimetableSlot(id="tt-3", user_id=demo_user.id, day="Monday", start_time="11:15", end_time="13:15", subject_id="sub-cs401", room="DBMS Lab", type="lab"),
                TimetableSlot(id="tt-4", user_id=demo_user.id, day="Tuesday", start_time="09:00", end_time="10:00", subject_id="sub-cs403", room="Room 204", type="lecture"),
                TimetableSlot(id="tt-5", user_id=demo_user.id, day="Tuesday", start_time="10:00", end_time="11:00", subject_id="sub-cs404", room="Audi-B", type="lecture"),
                TimetableSlot(id="tt-6", user_id=demo_user.id, day="Wednesday", start_time="09:00", end_time="10:00", subject_id="sub-cs405", room="Room 108", type="lecture"),
                TimetableSlot(id="tt-7", user_id=demo_user.id, day="Wednesday", start_time="10:00", end_time="11:00", subject_id="sub-cs401", room="LT-4", type="lecture"),
                TimetableSlot(id="tt-8", user_id=demo_user.id, day="Thursday", start_time="09:00", end_time="10:00", subject_id="sub-cs402", room="LT-2", type="lecture"),
                TimetableSlot(id="tt-9", user_id=demo_user.id, day="Thursday", start_time="10:00", end_time="11:00", subject_id="sub-cs403", room="Room 204", type="lecture"),
                TimetableSlot(id="tt-10", user_id=demo_user.id, day="Friday", start_time="09:00", end_time="10:00", subject_id="sub-cs404", room="Audi-B", type="lecture"),
                TimetableSlot(id="tt-11", user_id=demo_user.id, day="Friday", start_time="10:00", end_time="11:00", subject_id="sub-cs405", room="Room 108", type="lecture"),
            ]
            db.add_all(slots)

            # Events
            ev1 = AcademicEvent(id="ev-1", user_id=demo_user.id, title="DBMS Mid-Term Examination", date="2026-03-12", time="09:30", type="exam", subject_id="sub-cs401", priority="high", completed=False)
            ev2 = AcademicEvent(id="ev-2", user_id=demo_user.id, title="OS Multi-Threading Lab Submission", date="2026-03-18", time="23:59", type="submission", subject_id="sub-cs402", priority="high", completed=False)
            db.add_all([ev1, ev2])

            # Notes
            n1 = AcademicNote(id="note-1", user_id=demo_user.id, title="B+ Tree Indexing & Concurrency Lock Modes", subject_id="sub-cs401", category="notes", content="# B+ Tree Indexing\n\n* Leaf nodes form a doubly linked list.\n* Search time complexity: O(log N).", file_type="md", tags=json.dumps(["database", "indexing"]))
            db.add(n1)

            db.commit()
    finally:
        db.close()
