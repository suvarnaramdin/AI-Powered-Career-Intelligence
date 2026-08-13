"""
Script to initialize the admin user in the database.
Run this once to create the admin account.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

import bcrypt
from database import SessionLocal, engine
from models import Base, User

RESERVED_ADMIN_EMAIL = "admin@example.com"

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Database session
db = SessionLocal()

# Check for all admin accounts and enforce a single administrator.
admin_accounts = db.query(User).filter(User.role.ilike("ADMIN")).all()
admin_exists = db.query(User).filter(User.email.ilike(RESERVED_ADMIN_EMAIL)).first()

if admin_accounts:
    for admin_account in admin_accounts:
        if admin_account.email and admin_account.email.lower() != RESERVED_ADMIN_EMAIL.lower():
            admin_account.role = "USER"
            print(f"✓ Demoted duplicate admin account: {admin_account.email}")

if admin_exists:
    admin_exists.role = "ADMIN"
    admin_exists.email = RESERVED_ADMIN_EMAIL.lower()
    admin_exists.name = "Admin User"
    print(f"✓ Admin user confirmed with email: {RESERVED_ADMIN_EMAIL}")
    print(f"  Name: {admin_exists.name}")
    print(f"  Role: {admin_exists.role}")
    db.commit()
    db.close()
    sys.exit(0)

# Hash the admin password
admin_password = "AdminPassword123"
hashed_password = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt()).decode()

# Create admin user
admin_user = User(
    email=RESERVED_ADMIN_EMAIL.lower(),
    password=hashed_password,
    name="Admin User",
    role="ADMIN"
)

try:
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    print("✓ Admin user created successfully!")
    print(f"  Email: {admin_user.email}")
    print(f"  Password: {admin_password}")
    print(f"  Name: {admin_user.name}")
    print(f"  Role: {admin_user.role}")
    print("\nAdmin can now login at: /admin/login")
except Exception as e:
    db.rollback()
    print(f"✗ Error creating admin user: {e}")
    sys.exit(1)
finally:
    db.close()
