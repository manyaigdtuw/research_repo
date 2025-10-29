import sys
import os

# Ensure project root is in the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from auth import get_password_hash
import models


def create_superadmin():
    """Creates a default SUPERADMIN user if one does not already exist."""
    db = SessionLocal()
    try:
        email = "superadmin@ccras.gov.in"
        password = "admin123"  # ⚠️ Change this in production

        existing = db.query(models.User).filter(models.User.email == email).first()
        if existing:
            print(f"⚠️ Superadmin already exists: {email}")
            return

        hashed_pw = get_password_hash(password)
        superadmin = models.User(
            email=email,
            hashed_password=hashed_pw,
            full_name="Super Administrator",
            institution="CCRAS",
            role=models.UserRole.SUPERADMIN,
            is_active=True,
        )

        db.add(superadmin)
        db.commit()
        db.refresh(superadmin)

        print("✅ Superadmin created successfully!")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"   Role: {superadmin.role}")
        print(f"   Hash: {hashed_pw}")

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating superadmin: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    create_superadmin()
