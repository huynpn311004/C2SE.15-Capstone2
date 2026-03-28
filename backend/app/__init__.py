from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.core.database import Base, engine
from app import models  # noqa: F401
from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.supermarket_admin import router as supermarket_admin_router


def _ensure_users_lock_columns() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "users" not in inspector.get_table_names():
            return

        column_names = {column["name"] for column in inspector.get_columns("users")}

        if "failed_login_attempts" not in column_names:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN failed_login_attempts BIGINT NOT NULL DEFAULT 0"
                )
            )

        if "locked_at" not in column_names:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN locked_at TIMESTAMP NULL DEFAULT NULL"
                )
            )

        if "last_login_at" not in column_names:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN last_login_at TIMESTAMP NULL DEFAULT NULL"
                )
            )

def create_app():
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    Base.metadata.create_all(bind=engine)
    _ensure_users_lock_columns()
    app.include_router(auth_router, prefix="/api")
    app.include_router(admin_router, prefix="/api")
    app.include_router(supermarket_admin_router, prefix="/api")
    return app