import argparse
import sys
from pathlib import Path

from sqlalchemy import inspect, text


BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.models.user import User  # noqa: E402


def upsert_admin(username: str, password: str, email: str, full_name: str) -> str:
    db = SessionLocal()
    try:
        inspector = inspect(db.bind)
        user_columns = {col["name"] for col in inspector.get_columns("users")}

        required_columns = {"username", "email", "password_hash", "full_name", "role"}
        missing_required = required_columns - user_columns
        if missing_required:
            raise RuntimeError(
                "Bang users dang thieu cot bat buoc: "
                + ", ".join(sorted(missing_required))
            )

        # Use ORM query: no SQL injection risk
        existing = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()

        action = "updated" if existing else "created"

        if existing:
            # Update existing user using ORM
            existing.username = username
            existing.email = email
            existing.full_name = full_name
            existing.password_hash = get_password_hash(password)
            existing.role = "system_admin"
            existing.is_active = True
            existing.failed_login_attempts = 0
            existing.locked_at = None
            db.flush()
            user_id = existing.id
        else:
            # Create new user using ORM
            new_user = User(
                username=username,
                email=email,
                full_name=full_name,
                password_hash=get_password_hash(password),
                role="system_admin",
                is_active=True,
                failed_login_attempts=0,
                locked_at=None,
            )
            db.add(new_user)
            db.flush()
            user_id = new_user.id

        db.commit()
        return f"{action}: id={user_id}, username={username}, role=system_admin"
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create or update a system admin account in DB."
    )
    parser.add_argument("--username", default="adminseims")
    parser.add_argument("--password", default="adminseims123@")
    parser.add_argument("--email", default="adminseims@seims.vn")
    parser.add_argument("--full-name", default="SEIMS Admin")
    args = parser.parse_args()

    result = upsert_admin(
        username=args.username.strip(),
        password=args.password,
        email=args.email.strip().lower(),
        full_name=args.full_name.strip(),
    )
    print(result)


if __name__ == "__main__":
    main()
