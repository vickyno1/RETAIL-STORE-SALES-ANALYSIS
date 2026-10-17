import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "smart-retail-secret-key-2026-secure-jwt-token")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "12"))
    
    # Oracle Configuration
    ORACLE_USER = os.getenv("ORACLE_USER", "RETAIL_ADMIN")
    ORACLE_PASSWORD = os.getenv("ORACLE_PASSWORD", "retail123")
    ORACLE_HOST = os.getenv("ORACLE_HOST", "127.0.0.1")
    ORACLE_PORT = int(os.getenv("ORACLE_PORT", "1521"))
    ORACLE_SERVICE = os.getenv("ORACLE_SERVICE", "XE")
    ORACLE_SQLPLUS_PATH = os.getenv(
        "ORACLE_SQLPLUS_PATH",
        r"C:\oraclexe\app\oracle\product\10.2.0\server\BIN\sqlplus.exe"
    )
    
    # CORS
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
