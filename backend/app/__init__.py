from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
import logging

load_dotenv()

from app.core.database import Base, engine, get_db
from app import models
from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.supermarket_admin import router as supermarket_admin_router
from app.routers.staff import router as staff_router
from app.routers.charity import router as charity_router
from app.routers.delivery import router as delivery_router
from app.routers.customer import router as customer_router
from app.routers.coupon import router as coupon_router
from app.routers.discount_policy import router as discount_policy_router
from app.routers.product import router as product_router
from app.services.customer_service import restore_expired_reserved_stock

logger = logging.getLogger(__name__)

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

    # Setup background task to restore expired reserved stock
    def cleanup_expired_reservations():
        """Periodic task to restore expired reserved stock (every 5 minutes)"""
        db = None
        try:
            db = next(get_db())
            result = restore_expired_reserved_stock(db, timeout_minutes=15)
            logger.info(f"Cleanup task completed: {result}")
        except Exception as e:
            logger.error(f"Error in cleanup task: {str(e)}")
        finally:
            if db:
                db.close()

    # Start scheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(cleanup_expired_reservations, 'interval', minutes=5, id='cleanup_reserved_stock')
    logger.info("Scheduled cleanup task: restore expired reserved stock every 5 minutes")
    
    @app.on_event("startup")
    def start_scheduler():
        if not scheduler.running:
            scheduler.start()
            logger.info("Background scheduler started")
        try:
            db = next(get_db())
            result = restore_expired_reserved_stock(db, timeout_minutes=15)
            logger.info(f"Startup cleanup completed: {result}")
            db.close()
        except Exception as e:
            logger.error(f"Error in startup cleanup: {str(e)}")
    
    @app.on_event("shutdown")
    def shutdown_scheduler():
        scheduler.shutdown()
        logger.info("Background scheduler stopped")
    
    app.include_router(auth_router, prefix="/api")
    app.include_router(admin_router, prefix="/api")
    app.include_router(supermarket_admin_router, prefix="/api")
    app.include_router(staff_router, prefix="/api")
    app.include_router(charity_router, prefix="/api")
    app.include_router(delivery_router, prefix="/api")
    app.include_router(customer_router, prefix="/api")
    app.include_router(coupon_router, prefix="/api")
    app.include_router(discount_policy_router, prefix="/api")
    app.include_router(product_router, prefix="/api")
    return app