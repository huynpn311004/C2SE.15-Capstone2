import argparse
import sys
from pathlib import Path

from sqlalchemy import inspect, text


BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402


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

        existing = db.execute(
            text(
                "SELECT id, username, email "
                "FROM users "
                "WHERE username = :username OR email = :email "
                "LIMIT 1"
            ),
            {"username": username, "email": email},
        ).mappings().first()

        action = "updated" if existing else "created"

        # Keep values aligned with current DB schema.
        data = {
            "username": username,
            "email": email,
            "full_name": full_name,
            "role": "system_admin",
            "is_active": True,
            "failed_login_attempts": 0,
            "locked_at": None,
            "password_hash": get_password_hash(password),
        }
        data = {k: v for k, v in data.items() if k in user_columns}

        if existing:
            update_cols = [k for k in data.keys()]
            set_clause = ", ".join([f"{col} = :{col}" for col in update_cols])
            params = dict(data)
            params["id"] = existing["id"]
            db.execute(
                text(f"UPDATE users SET {set_clause} WHERE id = :id"),
                params,
            )
            user_id = existing["id"]
        else:
            insert_cols = list(data.keys())
            cols_sql = ", ".join(insert_cols)
            vals_sql = ", ".join([f":{col}" for col in insert_cols])
            db.execute(
                text(f"INSERT INTO users ({cols_sql}) VALUES ({vals_sql})"),
                data,
            )
            user_id = db.execute(text("SELECT LAST_INSERT_ID() AS id")).scalar_one()

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
