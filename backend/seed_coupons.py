"""Script to seed sample coupon data into the database."""
from datetime import datetime, timedelta
from sqlalchemy import text
from app.core.database import SessionLocal, engine
from app.models.coupon import Coupon


def seed_coupons():
    """Seed sample coupon data for existing supermarkets."""
    db = SessionLocal()
    
    try:
        # Check if there are any supermarkets
        result = db.execute(text("SELECT id, name FROM supermarkets LIMIT 5"))
        supermarkets = result.fetchall()
        
        if not supermarkets:
            print("No supermarkets found. Creating sample coupons without supermarket_id...")
            print("Please create a supermarket first, then update coupon supermarket_id manually.")
            return
        
        print(f"Found {len(supermarkets)} supermarket(s)")
        for sm in supermarkets:
            print(f"  - ID: {sm[0]}, Name: {sm[1]}")
        
        # Sample coupon data
        coupons_data = [
            {
                "code": "WELCOME10",
                "description": "Chào mừng khách hàng mới - Giảm 10% cho đơn hàng đầu tiên",
                "discount_percent": 10.0,
                "min_amount": 50000,
                "max_uses": 100,
                "valid_from": datetime.now(),
                "valid_to": datetime.now() + timedelta(days=90),
                "is_active": True,
            },
            {
                "code": "SUMMER20",
                "description": "Khuyến mãi mùa hè - Giảm 20% cho tất cả đơn hàng",
                "discount_percent": 20.0,
                "min_amount": 100000,
                "max_uses": 50,
                "valid_from": datetime.now(),
                "valid_to": datetime.now() + timedelta(days=30),
                "is_active": True,
            },
            {
                "code": "VIP50",
                "description": "Ưu đãi VIP - Giảm 50% (không giới hạn số lần sử dụng)",
                "discount_percent": 50.0,
                "min_amount": 500000,
                "max_uses": None,
                "valid_from": datetime.now(),
                "valid_to": datetime.now() + timedelta(days=365),
                "is_active": True,
            },
            {
                "code": "FREESHIP",
                "description": "Miễn phí vận chuyển cho đơn từ 200k",
                "discount_percent": 5.0,  # Represented as 5% cashback equivalent
                "min_amount": 200000,
                "max_uses": 200,
                "valid_from": datetime.now(),
                "valid_to": datetime.now() + timedelta(days=60),
                "is_active": True,
            },
            {
                "code": "FLASH25",
                "description": "Flash Sale cuối tuần - Giảm 25% (giới hạn 30 lần)",
                "discount_percent": 25.0,
                "min_amount": 150000,
                "max_uses": 30,
                "valid_from": datetime.now(),
                "valid_to": datetime.now() + timedelta(days=7),
                "is_active": True,
            },
            {
                "code": "BIRTHDAY15",
                "description": "Quà sinh nhật - Giảm 15% cho khách hàng VIP",
                "discount_percent": 15.0,
                "min_amount": 0,
                "max_uses": 500,
                "valid_from": datetime.now(),
                "valid_to": datetime.now() + timedelta(days=180),
                "is_active": True,
            },
            {
                "code": "NEWYEAR30",
                "description": "Chương trình năm mới - Giảm 30% đặc biệt",
                "discount_percent": 30.0,
                "min_amount": 300000,
                "max_uses": 100,
                "valid_from": datetime.now(),
                "valid_to": datetime.now() + timedelta(days=45),
                "is_active": False,  # Inactive by default
            },
        ]
        
        # Get first supermarket ID for demo
        supermarket_id = supermarkets[0][0]
        
        # Check for existing coupons
        existing_codes = db.execute(
            text("SELECT code FROM coupons")
        ).fetchall()
        existing_codes = {row[0] for row in existing_codes}
        
        created_count = 0
        skipped_count = 0
        
        for coupon_data in coupons_data:
            if coupon_data["code"] in existing_codes:
                print(f"Skipping '{coupon_data['code']}' - already exists")
                skipped_count += 1
                continue
            
            new_coupon = Coupon(
                supermarket_id=supermarket_id,
                code=coupon_data["code"],
                description=coupon_data["description"],
                discount_percent=coupon_data["discount_percent"],
                min_amount=coupon_data["min_amount"],
                max_uses=coupon_data["max_uses"],
                current_uses=0,
                valid_from=coupon_data["valid_from"],
                valid_to=coupon_data["valid_to"],
                is_active=coupon_data["is_active"],
            )
            db.add(new_coupon)
            created_count += 1
            print(f"Created coupon: {coupon_data['code']}")
        
        db.commit()
        print(f"\nSummary: Created {created_count} coupons, skipped {skipped_count} existing")
        print("Done!")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_coupons()
