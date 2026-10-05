from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import os
from backend.database.database import get_db
from backend.database.models import User, Subject, TimetableSlot
from backend.schemas.schemas import AIChatRequest
from backend.core.dependencies import get_current_user
from backend.core.config import settings

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/chat")
def ai_chat(
    req: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user_message = req.message.strip()
        if not user_message:
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        # Extract only relevant academic context
        subjects = db.query(Subject).filter(Subject.user_id == current_user.id).all()
        academic_context = f"Student Name: {current_user.name}\nUniversity: {current_user.university}\nDepartment: {current_user.department}\nSemester: {current_user.semester}\n"
        academic_context += "Enrolled Courses:\n"
        for s in subjects:
            pct = round((s.attended_classes / s.total_classes) * 100, 1) if s.total_classes > 0 else 100
            academic_context += f"- {s.name} ({s.code}): {s.attended_classes}/{s.total_classes} classes ({pct}%), Target: {s.target_attendance}%, Faculty: {s.faculty}\n"

        gemini_api_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
        if not gemini_api_key:
            return {
                "reply": f"Hello {current_user.name}! I am your Syncademic Academic Advisor. Based on your enrolled courses:\n\n" +
                         f"You are currently taking {len(subjects)} subjects. " +
                         "To enable live generative LLM synthesis, please provide your GEMINI_API_KEY in the workspace environment secrets."
            }

        from google import genai
        ai_client = genai.Client(api_key=gemini_api_key)
        
        system_instruction = (
            "You are Syncademic AI, a calm, disciplined academic assistant for college students. "
            "Help students calculate safe bunks, optimize study schedules, structure revision notes, and prepare for exams. "
            f"Here is the student's authoritative academic profile:\n{academic_context}\n"
            "Provide concise, mathematically accurate, and practical academic advice."
        )

        response = ai_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_message,
            config={"system_instruction": system_instruction}
        )

        return {"reply": response.text or "I reviewed your academic schedule and records."}
    except Exception as err:
        return {
            "reply": f"Syncademic Academic Advisor Note: I processed your query against your course records. (AI Service Note: {str(err)})"
        }
