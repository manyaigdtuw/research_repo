import sys
import os

# Ensure project root is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from auth import get_password_hash
import models


def create_superadmin():
    db = SessionLocal()
    try:
        # Check if superadmin already exists (using email instead of role for reliability)
        existing = db.query(models.User).filter(models.User.email == "superadmin@ccras.gov.in").first()
        if existing:
            print("⚠️  Superadmin already exists!")
            return

        # Create superadmin user
        superadmin = models.User(
            email="superadmin@ccras.gov.in",
            hashed_password=get_password_hash("admin123"),  # Change this in production!
            full_name="Super Administrator",
            institution="CCRAS",
            role=models.UserRole.SUPERADMIN,  # ✅ Fixed: changed SUPER_ADMIN to SUPERADMIN
            is_active=True
        )

        db.add(superadmin)
        db.commit()
        db.refresh(superadmin)

        print("✅ Superadmin created successfully!")
        print(f"Email: {superadmin.email}")
        print("Password: admin123 (please change immediately in production)")

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating superadmin: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    create_superadmin()