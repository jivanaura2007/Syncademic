from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import json
from datetime import datetime
from backend.database.database import get_db
from backend.database.models import User, AcademicNote
from backend.schemas.schemas import NoteCreate, NoteUpdate, NoteOut
from backend.core.dependencies import get_current_user

router = APIRouter(prefix="/notes", tags=["notes"])

@router.get("", response_model=List[NoteOut])
def get_notes(
    subject_id: Optional[str] = None,
    category: Optional[str] = None,
    query: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(AcademicNote).filter(AcademicNote.user_id == current_user.id)
    if subject_id:
        q = q.filter(AcademicNote.subject_id == subject_id)
    if category:
        q = q.filter(AcademicNote.category == category)
    if query:
        q = q.filter(AcademicNote.title.contains(query) | AcademicNote.content.contains(query))

    notes = q.order_by(AcademicNote.updated_at.desc()).all()
    return [
        NoteOut(
            id=n.id,
            title=n.title,
            subjectId=n.subject_id,
            category=n.category,
            content=n.content,
            onedriveLink=n.onedrive_link,
            fileType=n.file_type,
            tags=json.loads(n.tags) if n.tags else [],
            createdAt=n.created_at,
            updatedAt=n.updated_at
        )
        for n in notes
    ]

@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(
    note_in: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    new_note = AcademicNote(
        id="note-" + str(uuid.uuid4())[:8],
        user_id=current_user.id,
        title=note_in.title,
        subject_id=note_in.subjectId,
        category=note_in.category or "notes",
        content=note_in.content,
        onedrive_link=note_in.onedriveLink,
        file_type=note_in.fileType or "md",
        tags=json.dumps(note_in.tags or []),
        created_at=today_str,
        updated_at=today_str
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    return NoteOut(
        id=new_note.id,
        title=new_note.title,
        subjectId=new_note.subject_id,
        category=new_note.category,
        content=new_note.content,
        onedriveLink=new_note.onedrive_link,
        fileType=new_note.file_type,
        tags=json.loads(new_note.tags) if new_note.tags else [],
        createdAt=new_note.created_at,
        updatedAt=new_note.updated_at
    )

@router.put("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: str,
    note_update: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(AcademicNote).filter(AcademicNote.id == note_id, AcademicNote.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if note_update.title is not None:
        note.title = note_update.title
    if note_update.subjectId is not None:
        note.subject_id = note_update.subjectId
    if note_update.category is not None:
        note.category = note_update.category
    if note_update.content is not None:
        note.content = note_update.content
    if note_update.onedriveLink is not None:
        note.onedrive_link = note_update.onedriveLink
    if note_update.fileType is not None:
        note.file_type = note_update.fileType
    if note_update.tags is not None:
        note.tags = json.dumps(note_update.tags)

    note.updated_at = datetime.utcnow().strftime("%Y-%m-%d")
    db.commit()
    db.refresh(note)

    return NoteOut(
        id=note.id,
        title=note.title,
        subjectId=note.subject_id,
        category=note.category,
        content=note.content,
        onedriveLink=note.onedrive_link,
        fileType=note.file_type,
        tags=json.loads(note.tags) if note.tags else [],
        createdAt=note.created_at,
        updatedAt=note.updated_at
    )

@router.delete("/{note_id}")
def delete_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(AcademicNote).filter(AcademicNote.id == note_id, AcademicNote.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully", "noteId": note_id}
