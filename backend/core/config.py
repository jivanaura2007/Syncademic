import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Syncademic Academic Workspace"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "syncademic_secret_key_production_vault_992182")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./syncademic.db")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    AZURE_CLIENT_ID: str = os.getenv("AZURE_CLIENT_ID", os.getenv("MICROSOFT_CLIENT_ID", "d1dc0c4d-aaa4-4361-b41f-d556c1824fcb"))
    AZURE_CLIENT_SECRET: str = os.getenv("AZURE_CLIENT_SECRET", os.getenv("MICROSOFT_CLIENT_SECRET", ""))
    AZURE_TENANT_ID: str = os.getenv("AZURE_TENANT_ID", "common")
    AZURE_AUTHORITY: str = os.getenv("AZURE_AUTHORITY", "https://login.microsoftonline.com/common")

settings = Settings()
