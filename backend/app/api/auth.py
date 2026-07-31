from fastapi import APIRouter, HTTPException
from app.schemas.auth import RegisterRequest, LoginRequest

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register")
def register(user: RegisterRequest):

    # Password confirmation validation
    if user.password != user.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match"
        )

    return {
        "message": "User registered successfully",
        "user": user
    }


@router.post("/login")
def login(user: LoginRequest):

    return {
        "message": "Login successful",
        "user": user
    }