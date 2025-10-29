from datetime import datetime, timedelta
from jose import JWTError, jwt
from config import JWT_SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from schemas import TokenData
from passlib.context import CryptContext
import logging

logger = logging.getLogger(__name__)

# ----- JWT FUNCTIONS -----

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        role = payload.get("role")
        if not email:
            logger.warning("Invalid token: missing 'sub'")
            return None
        return TokenData(email=email, role=role)
    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        return None


# ----- PASSWORD HASHING -----

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False  # prevent bcrypt-like backend crashes


def get_password_hash(password: str) -> str:
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if len(password.encode("utf-8")) > 256:
        raise ValueError("Password too long")
    return pwd_context.hash(password)
