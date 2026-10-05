from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any

# ================= AUTH SCHEMAS =================
class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    university: Optional[str] = "Institute of Technology"
    department: Optional[str] = "Computer Science & Engineering"
    semester: Optional[int] = 4

class UserLogin(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    university: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    section: Optional[str] = None
    rollNumber: Optional[str] = None
    attendanceThreshold: Optional[int] = None
    semesterStartDate: Optional[str] = None
    semesterEndDate: Optional[str] = None

# ================= SUBJECT SCHEMAS =================
class SubjectBase(BaseModel):
    name: str
    code: str
    faculty: Optional[str] = "Faculty Member"
    credits: Optional[int] = 3
    targetAttendance: Optional[int] = 75
    attendedClasses: Optional[int] = 0
    totalClasses: Optional[int] = 0
    color: Optional[str] = "#007FFF"
    room: Optional[str] = "Room 301"

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    faculty: Optional[str] = None
    credits: Optional[int] = None
    targetAttendance: Optional[int] = None
    attendedClasses: Optional[int] = None
    totalClasses: Optional[int] = None
    color: Optional[str] = None
    room: Optional[str] = None

class SubjectOut(SubjectBase):
    id: str
    class Config:
        from_attributes = True

# ================= ATTENDANCE SCHEMAS =================
class AttendanceMark(BaseModel):
    subjectId: str
    date: str
    timeSlot: str
    status: str # present | absent | cancelled | holiday | faculty_leave
    note: Optional[str] = None

class AttendanceRecordOut(BaseModel):
    id: str
    subjectId: str
    date: str
    timeSlot: str
    status: str
    note: Optional[str] = None
    updatedAt: Optional[str] = None
    class Config:
        from_attributes = True

# ================= TIMETABLE SCHEMAS =================
class TimetableSlotBase(BaseModel):
    day: str
    startTime: str
    endTime: str
    subjectId: str
    room: Optional[str] = "Room 301"
    type: Optional[str] = "lecture"

class TimetableSlotCreate(TimetableSlotBase):
    pass

class TimetableSlotOut(TimetableSlotBase):
    id: str
    class Config:
        from_attributes = True

class ReplacementDayCreate(BaseModel):
    date: str
    dayToFollow: str
    reason: str

class ReplacementDayOut(ReplacementDayCreate):
    id: str
    class Config:
        from_attributes = True

class FacultyLeaveCreate(BaseModel):
    facultyName: str
    subjectId: str
    date: str
    reason: Optional[str] = None

class FacultyLeaveOut(FacultyLeaveCreate):
    id: str
    class Config:
        from_attributes = True

# ================= NOTE SCHEMAS =================
class NoteBase(BaseModel):
    title: str
    subjectId: str
    category: Optional[str] = "notes"
    content: str
    onedriveLink: Optional[str] = None
    fileType: Optional[str] = "md"
    tags: Optional[List[str]] = []

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    subjectId: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    onedriveLink: Optional[str] = None
    fileType: Optional[str] = None
    tags: Optional[List[str]] = None

class NoteOut(NoteBase):
    id: str
    createdAt: str
    updatedAt: str
    class Config:
        from_attributes = True

# ================= EVENT SCHEMAS =================
class EventBase(BaseModel):
    title: str
    date: str
    endDate: Optional[str] = None
    time: Optional[str] = None
    type: Optional[str] = "assignment"
    subjectId: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    completed: Optional[bool] = False

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    endDate: Optional[str] = None
    time: Optional[str] = None
    type: Optional[str] = None
    subjectId: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None

class EventOut(EventBase):
    id: str
    class Config:
        from_attributes = True

# ================= AI SCHEMAS =================
class AIChatMessage(BaseModel):
    role: str
    content: str

class AIChatRequest(BaseModel):
    message: str
    history: Optional[List[AIChatMessage]] = []
    context: Optional[str] = "general"
