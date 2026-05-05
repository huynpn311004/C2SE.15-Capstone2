from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # Default 7 days

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def get_password_hash(password: str) -> str:
	return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
	return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
	to_encode = data.copy()
	# Ensure 'sub' is always a string as per JWT spec
	if "sub" in to_encode:
		to_encode["sub"] = str(to_encode["sub"])
	
	if expires_delta:
		expire = datetime.utcnow() + expires_delta
	else:
		expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
	to_encode.update({"exp": expire})
	encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
	return encoded_jwt


def verify_token(token: str) -> dict | None:
	try:
		payload = jwt.decode(
			token, 
			SECRET_KEY, 
			algorithms=[ALGORITHM],
			options={"verify_sub": False}
		)
		return payload
	except jwt.ExpiredSignatureError:
		print("[DEBUG] Token đã hết hạn")
		return None
	except jwt.JWTError as e:
		print(f"[DEBUG] JWT Error: {type(e).__name__}: {e}")
		return None
	except Exception as e:
		print(f"[DEBUG] Lỗi verify token: {type(e).__name__}: {e}")
		return None
