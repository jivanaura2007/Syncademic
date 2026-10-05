from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    university = Column(String, default="Institute of Technology")
    department = Column(String, default="Computer Science & Engineering")
    semester = Column(Integer, default=4)
    section = Column(String, default="Section A")
    roll_number = Column(String, default="CS-2024-089")
    attendance_threshold = Column(Integer, default=75)
    semester_start_date = Column(String, default="2026-01-05")
    semester_end_date = Column(String, default="2026-05-30")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    subjects = relationship("Subject", back_populates="owner", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="owner", cascade="all, delete-orphan")
    timetable_slots = relationship("TimetableSlot", back_populates="owner", cascade="all, delete-orphan")
    replacement_days = relationship("ReplacementDay", back_populates="owner", cascade="all, delete-orphan")
    faculty_leaves = relationship("FacultyLeave", back_populates="owner", cascade="all, delete-orphan")
    notes = relationship("AcademicNote", back_populates="owner", cascade="all, delete-orphan")
    events = relationship("AcademicEvent", back_populates="owner", cascade="all, delete-orphan")

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    faculty = Column(String, default="Faculty Member")
    credits = Column(Integer, default=3)
    target_attendance = Column(Integer, default=75)
    attended_classes = Column(Integer, default=0)
    total_classes = Column(Integer, default=0)
    color = Column(String, default="#007FFF")
    room = Column(String, default="Room 301")

    owner = relationship("User", back_populates="subjects")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    subject_id = Column(String, nullable=False, index=True)
    date = Column(String, nullable=False, index=True) # YYYY-MM-DD
    time_slot = Column(String, nullable=False)
    status = Column(String, nullable=False) # present | absent | cancelled | holiday | faculty_leave
    note = Column(Text, nullable=True)
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    owner = relationship("User", back_populates="attendance_records")

class TimetableSlot(Base):
    __tablename__ = "timetable_slots"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    day = Column(String, nullable=False) # Monday, Tuesday, etc.
    start_time = Column(String, nullable=False) # "09:00"
    end_time = Column(String, nullable=False) # "10:00"
    subject_id = Column(String, nullable=False)
    room = Column(String, default="Room 301")
    type = Column(String, default="lecture") # lecture | lab | tutorial

    owner = relationship("User", back_populates="timetable_slots")

class ReplacementDay(Base):
    __tablename__ = "replacement_days"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    date = Column(String, nullable=False) # YYYY-MM-DD
    day_to_follow = Column(String, nullable=False) # Monday, Tuesday, etc.
    reason = Column(String, nullable=False)

    owner = relationship("User", back_populates="replacement_days")

class FacultyLeave(Base):
    __tablename__ = "faculty_leaves"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    faculty_name = Column(String, nullable=False)
    subject_id = Column(String, nullable=False)
    date = Column(String, nullable=False)
    reason = Column(String, nullable=True)

    owner = relationship("User", back_populates="faculty_leaves")

class AcademicNote(Base):
    __tablename__ = "academic_notes"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String, nullable=False)
    subject_id = Column(String, nullable=False, index=True)
    category = Column(String, default="notes") # notes | pyq | assignment | lab_manual
    content = Column(Text, nullable=False)
    onedrive_link = Column(String, nullable=True)
    file_type = Column(String, default="md")
    tags = Column(String, default="[]") # JSON string
    created_at = Column(String, default=lambda: datetime.utcnow().strftime("%Y-%m-%d"))
    updated_at = Column(String, default=lambda: datetime.utcnow().strftime("%Y-%m-%d"))

    owner = relationship("User", back_populates="notes")

class AcademicEvent(Base):
    __tablename__ = "academic_events"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String, nullable=False)
    date = Column(String, nullable=False)
    end_date = Column(String, nullable=True)
    time = Column(String, nullable=True)
    type = Column(String, default="assignment") # exam | assignment | submission | holiday | deadline
    subject_id = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    priority = Column(String, default="medium") # low | medium | high
    completed = Column(Boolean, default=False)

    owner = relationship("User", back_populates="events")
