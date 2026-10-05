from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional
from backend.database.database import get_db
from backend.database.models import User

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Dependency that extracts and validates the authenticated user from the Bearer token"""
    if not authorization or not authorization.startswith("Bearer "):
        # For development / initial testing fallback to demo student if exists
        demo_user = db.query(User).filter(User.email == "aarav.sharma@university.edu").first()
        if demo_user:
            return demo_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1]
    if token.startswith("sync_tok_"):
        user_id = token.replace("sync_tok_", "")
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return user

    # Expired or invalid token
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired or invalid token. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
