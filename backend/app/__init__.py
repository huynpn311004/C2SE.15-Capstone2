from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from sqlalchemy import inspect, text

from app.core.database import Base, engine
from app import models  # noqa: F401
from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.supermarket_admin import router as supermarket_admin_router
from app.routers.staff import router as staff_router
from app.routers.charity import router as charity_router
from app.routers.delivery import router as delivery_router
from app.routers.customer import router as customer_router
from app.routers.discount_policy import router as discount_policy_router


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

        if "address" not in column_names:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN address VARCHAR(255) NULL DEFAULT NULL"
                )
            )


def _ensure_supermarket_schema() -> None:
    """Ensure supermarket table has correct schema by removing old columns"""
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "supermarkets" not in inspector.get_table_names():
            return

        column_names = {column["name"] for column in inspector.get_columns("supermarkets")}

        # Remove columns that are no longer needed
        if "contact_email" in column_names:
            connection.execute(text("ALTER TABLE supermarkets DROP COLUMN contact_email"))

        if "contact_phone" in column_names:
            connection.execute(text("ALTER TABLE supermarkets DROP COLUMN contact_phone"))

        if "address" in column_names:
            connection.execute(text("ALTER TABLE supermarkets DROP COLUMN address"))

        if "status" in column_names:
            connection.execute(text("ALTER TABLE supermarkets DROP COLUMN status"))


def _ensure_discount_policy_schema() -> None:
    """Ensure discount_policies table has category_id and product_id columns"""
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "discount_policies" not in inspector.get_table_names():
            return

        column_names = {column["name"] for column in inspector.get_columns("discount_policies")}

        # Add category_id column
        if "category_id" not in column_names:
            connection.execute(
                text(
                    "ALTER TABLE discount_policies "
                    "ADD COLUMN category_id BIGINT NULL DEFAULT NULL"
                )
            )
            connection.execute(
                text(
                    "ALTER TABLE discount_policies "
                    "ADD CONSTRAINT fk_discount_policies_category_id "
                    "FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE"
                )
            )

        # Add product_id column
        if "product_id" not in column_names:
            connection.execute(
                text(
                    "ALTER TABLE discount_policies "
                    "ADD COLUMN product_id BIGINT NULL DEFAULT NULL"
                )
            )
            connection.execute(
                text(
                    "ALTER TABLE discount_policies "
                    "ADD CONSTRAINT fk_discount_policies_product_id "
                    "FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE"
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

    # Add security headers middleware
    @app.middleware("http")
    async def add_security_headers(request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response

    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    if os.path.exists(uploads_dir):
        app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    Base.metadata.create_all(bind=engine)
    _ensure_users_lock_columns()
    _ensure_supermarket_schema()
    _ensure_discount_policy_schema()
    app.include_router(auth_router, prefix="/api")
    app.include_router(admin_router, prefix="/api")
    app.include_router(supermarket_admin_router, prefix="/api")
    app.include_router(staff_router, prefix="/api")
    app.include_router(charity_router, prefix="/api")
    app.include_router(delivery_router, prefix="/api")
    app.include_router(customer_router, prefix="/api")
    app.include_router(discount_policy_router, prefix="/api")
    return app