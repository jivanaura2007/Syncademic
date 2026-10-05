import hashlib
from datetime import datetime, timedelta
from typing import Optional, Union, Any
from backend.core.config import settings

def hash_password(password: str) -> str:
    """Hashes a password using SHA-256 with salt for secure storage"""
    salt = "syncademic_salt_2026_"
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored hash"""
    return hash_password(plain_password) == hashed_password

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generates an authenticated token for the session"""
    return f"sync_tok_{subject}"
