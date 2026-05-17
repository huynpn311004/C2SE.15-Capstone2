from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy import text, or_, func, and_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.security import get_password_hash, verify_password
from app.services import discount_policy_service
from app.services.geocoding_service import calculate_distance
from app.models.user import User
from app.models.product import Product
from app.models.category import Category
from app.models.store import Store
from app.models.inventory_lot import InventoryLot
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.supermarket import Supermarket
from app.models.delivery import Delivery
from app.models.coupon import Coupon


def _get_or_create_order_group(
	db: Session,
	user_id: int,
	store_id: int,
	items: list,
	payment_method: str,
	shipping_address: str = None,
	product_cache: dict = None,
	store_cache: dict = None,
	applied_coupon_id: int = None,
	applied_discount_amount: Decimal = Decimal("0"),
	applied_coupon_code: str = None,
	shipping_phone: str = None
) -> dict:

	import logging
	logger = logging.getLogger(__name__)
	
	# Auto-cleanup expired reservations BEFORE creating new order
	# This releases stock from timed-out reservations so it can be reused
	cleanup_result = restore_expired_reserved_stock(db, timeout_minutes=3)
	if cleanup_result["restoredCount"] > 0:
		logger.info(f"Auto-cleanup before order: {cleanup_result['restoredCount']} expired orders released")
	
	total_amount = Decimal("0")
	order_item_data = []
	product_details = []

	# STEP 1: Identify all lot_ids we need upfront (without locking yet)
	lot_mapping = {}  # {(product_id, lot_code): required_qty}
	product_ids = set()
	
	for item in items:
		# Handle both dict and Pydantic model
		if isinstance(item, dict):
			product_id = item.get("productId")
			quantity = item.get("quantity", 1)
			lot_code = item.get("lotCode")
		else:
			product_id = item.productId
			quantity = item.quantity
			lot_code = getattr(item, "lotCode", None)

		if not product_id or quantity <= 0:
			continue
		
		product_ids.add(product_id)
		key = (product_id, lot_code)
		lot_mapping[key] = quantity

	# STEP 2: Pre-fetch all required lots sorted by lot.id for consistent lock ordering
	# This prevents deadlock: both transactions will always acquire locks in same order
	lot_queries = []
	for product_id, lot_code in lot_mapping.keys():
		if lot_code:
			lot_queries.append({
				'product_id': product_id,
				'lot_code': lot_code,
				'is_specific': True
			})
		else:
			lot_queries.append({
				'product_id': product_id,
				'lot_code': None,
				'is_specific': False
			})

	# Collect all lot_ids that need to be locked, sorted by ID for consistent ordering
	lot_ids_to_lock = []
	for query_spec in lot_queries:
		if query_spec['is_specific']:
			lot = db.query(InventoryLot.id).filter(
				InventoryLot.lot_code == query_spec['lot_code'],
				InventoryLot.store_id == store_id
			).first()
			if lot:
				lot_ids_to_lock.append(lot.id)
		else:
			lot = db.query(InventoryLot.id).filter(
				InventoryLot.product_id == query_spec['product_id'],
				InventoryLot.store_id == store_id,
				InventoryLot.qty_on_hand > 0
			).order_by(InventoryLot.expiry_date.asc()).first()
			if lot:
				lot_ids_to_lock.append(lot.id)

	if not lot_ids_to_lock:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f"San pham khong co san trong cua hang (store_id={store_id})"
		)

	# STEP 3: LOCK ALL LOTS IN ONE QUERY sorted by ID (DEADLOCK PREVENTION)
	# All transactions will lock in the same order regardless of item order
	locked_lots = db.query(InventoryLot).filter(
		InventoryLot.id.in_(lot_ids_to_lock)
	).order_by(InventoryLot.id.asc()).with_for_update().all()
	
	locked_lots_map = {lot.id: lot for lot in locked_lots}

	# STEP 4: Process items with already-locked lots
	for item in items:
		# Handle both dict and Pydantic model
		if isinstance(item, dict):
			product_id = item.get("productId")
			quantity = item.get("quantity", 1)
			lot_code = item.get("lotCode")
		else:
			product_id = item.productId
			quantity = item.quantity
			lot_code = getattr(item, "lotCode", None)

		if not product_id or quantity <= 0:
			continue

		# Find the locked lot from our pre-locked set
		lot = None
		if lot_code:
			for l in locked_lots:
				if l.lot_code == lot_code and l.store_id == store_id:
					lot = l
					break
		else:
			# Find first available lot for this product (should already be sorted by expiry)
			for l in locked_lots:
				if l.product_id == product_id and l.store_id == store_id and l.qty_on_hand > 0:
					lot = l
					break

		if not lot:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail=f"San pham khong co san trong cua hang (store_id={store_id})"
			)

		# Check available stock AFTER acquiring lock (atomic operation)
		available = lot.qty_on_hand - lot.qty_reserved
		if available < quantity:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail=f"San pham '{product_id}' khong du so luong (chi con {available})"
			)

		# Reserve stock immediately (within the same transaction, still locked)
		lot.qty_reserved = lot.qty_reserved + quantity

		# Get product info
		if product_cache and product_id in product_cache:
			product = product_cache[product_id]
		else:
			product = db.query(Product.base_price, Product.name, Product.image_url, Product.supermarket_id).filter(
				Product.id == product_id
			).first()
			if product_cache is not None:
				product_cache[product_id] = product

		if product:
			base_price = float(product.base_price or 0)
			sale_price, _ = _calculate_discount(base_price, lot.expiry_date, product.supermarket_id, product_id, db)
			unit_price = int(sale_price)
			total_amount += Decimal(str(unit_price * quantity))

			order_item_data.append({
				"product_id": product_id,
				"quantity": quantity,
				"unit_price": unit_price,
				"lot_id": lot.id
			})

			product_details.append({
				"name": product.name,
				"quantity": quantity,
				"unitPrice": float(unit_price),
				"originalPrice": base_price,
				"discount": int(base_price - unit_price) if base_price > unit_price else 0,
				"imageUrl": product.image_url
			})

	# Create Order
	# Sử dụng số tiền giảm giá đã được tính toán và truyền từ hàm cha
	final_amount = max(Decimal("0"), total_amount - applied_discount_amount)
	
	# Calculate shipping fee
	shipping_fee_value = Decimal("0")
	delivery_distance_value = None
	if shipping_address:
		try:
			from app.services.shipping_service import calculate_shipping_fee_sync
			shipping_result = calculate_shipping_fee_sync(
				db, store_id, shipping_address, float(total_amount)  # dùng subtotal trước coupon
			)
			if shipping_result.get("deliverable", True):
				shipping_fee_value = Decimal(str(shipping_result.get("fee", 0) or 0))
				delivery_distance_value = shipping_result.get("distance_km")
		except Exception as e:
			import logging
			logging.getLogger(__name__).warning(f"Shipping calc failed: {e}")
			# Fallback: free shipping if calculation fails
			shipping_fee_value = Decimal("0")
	
	# Add shipping fee to final amount
	final_amount_with_shipping = final_amount + shipping_fee_value
	
	new_order = Order(
		store_id=store_id,
		customer_id=user_id,
		status='pending',
		total_amount=final_amount_with_shipping,
		discount_amount=applied_discount_amount,
		shipping_fee=shipping_fee_value,
		delivery_distance=delivery_distance_value,
		payment_method=payment_method,
		payment_status='pending',
		shipping_address=shipping_address,
		shipping_phone=shipping_phone,
		reserved_at=datetime.now(),
		coupon_id=applied_coupon_id
	)
	db.add(new_order)
	db.flush()
	order_id = new_order.id
	
	# Logic thanh toán Ví (Wallet) đã được chuyển ra ngoài hàm create_multi_store_order 
	# để xử lý tổng một lần. Nếu là đơn hàng lẻ (create_customer_order), nó vẫn tự xử lý.
	
	# Increment coupon usage count if applied
	if applied_coupon_id:
		if not _increment_coupon_usage(db, applied_coupon_id):
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Mã giảm giá đã hết lượt sử dụng"
			)

	# Insert order items
	for item_data in order_item_data:
		order_item = OrderItem(
			order_id=order_id,
			lot_id=item_data["lot_id"],
			product_id=item_data["product_id"],
			quantity=item_data["quantity"],
			unit_price=item_data["unit_price"]
		)
		db.add(order_item)

	# Note: qty_reserved already updated above within the lock
	# db.flush() ensures changes are visible but not committed yet

	# Get store info
	if store_cache and store_id in store_cache:
		store = store_cache[store_id]
	else:
		store = db.query(Store.name, Store.location).filter(Store.id == store_id).first()
		if store_cache is not None:
			store_cache[store_id] = store

	return {
		"storeId": store_id,
		"storeName": store.name if store else f"Cua hang {store_id}",
		"storeAddress": store.location if store and store.location else "",
		"orderId": order_id,
		"orderCode": f"DH-{order_id}",
		"items": product_details,
		"totalAmount": float(final_amount_with_shipping),
		"originalAmount": float(total_amount),
		"discountAmount": float(applied_discount_amount),
		"shippingFee": float(shipping_fee_value),
		"deliveryDistance": delivery_distance_value,
		"couponCode": applied_coupon_code,
		"shippingAddress": shipping_address,
	}


def create_multi_store_order(
	db: Session,
	user_id: int,
	items: list,
	payment_method: str = "cod",
	shipping_address: str = None,
	coupon_id: int = None,
	shipping_phone: str = None
) -> dict:
	if not items or len(items) == 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gio hang trong")

	# Validate user
	user = db.query(User.id).filter(
		User.id == user_id,
		User.role == 'customer'
	).first()
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khach hang khong ton tai")

	# Group items by store_id
	store_groups = {}
	for item in items:
		if isinstance(item, dict):
			store_id = item.get("storeId")
		else:
			store_id = getattr(item, "storeId", None)

		if not store_id:
			if isinstance(item, dict):
				lot_code = item.get("lotCode")
			else:
				lot_code = getattr(item, "lotCode", None)

			if lot_code:
				lot = db.query(InventoryLot.store_id).filter(
					InventoryLot.lot_code == lot_code
				).first()
				if lot:
					store_id = lot.store_id

		if not store_id:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Thieu thong tin cua hang (storeId)"
			)

		if store_id not in store_groups:
			store_groups[store_id] = []
		store_groups[store_id].append(item)

	# Caches for performance
	product_cache = {}
	store_cache = {}

	# Bước 1: Tính Subtotal cho từng Store để phục vụ việc chia tỷ lệ giảm giá
	total_cart_subtotal = Decimal("0")
	store_subtotals = {} # {store_id: subtotal}
	
	for store_id, store_items in store_groups.items():
		store_subtotal = Decimal("0")
		for item in store_items:
			if isinstance(item, dict):
				product_id = item.get("productId")
				quantity = item.get("quantity", 1)
			else:
				product_id = item.productId
				quantity = getattr(item, "quantity", 1)
			
			product = db.query(Product.base_price).filter(Product.id == product_id).first()
			if product:
				store_subtotal += Decimal(str(product.base_price or 0)) * quantity
		
		store_subtotals[store_id] = store_subtotal
		total_cart_subtotal += store_subtotal
	
	# Validate coupon dựa trên tổng giá trị toàn giỏ hàng
	coupon_info = None
	total_discount_to_distribute = Decimal("0")
	if coupon_id:
		coupon_info = _validate_and_calculate_coupon(db, coupon_id, None, total_cart_subtotal)
		if not coupon_info.get("valid"):
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail=coupon_info.get("error", "Coupon không hợp lệ")
			)
		total_discount_to_distribute = coupon_info.get("discount_amount", Decimal("0"))

	success_orders = []
	failed_orders = []
	grand_total = Decimal("0")
	remaining_discount = total_discount_to_distribute
	
	# Danh sách các Store để duyệt và tính toán tỷ lệ
	store_ids_list = list(store_groups.keys())

	for i, store_id in enumerate(store_ids_list):
		store_items = store_groups[store_id]
		try:
			# Bước 2: Tính toán số tiền giảm giá phân bổ cho Store này
			current_store_discount = Decimal("0")
			if total_discount_to_distribute > 0:
				if i == len(store_ids_list) - 1:
					# Store cuối cùng nhận phần còn lại để đảm bảo khớp tổng số tiền
					current_store_discount = remaining_discount
				else:
					# Tính theo tỷ lệ: (Giá trị store / Tổng giá trị giỏ hàng) * Tổng giảm giá
					ratio = store_subtotals[store_id] / total_cart_subtotal if total_cart_subtotal > 0 else 0
					current_store_discount = (total_discount_to_distribute * Decimal(str(ratio))).quantize(Decimal("1"))
					# Đảm bảo không giảm quá số tiền còn lại
					current_store_discount = min(current_store_discount, remaining_discount)
					remaining_discount -= current_store_discount

			order_info = _get_or_create_order_group(
				db,
				user_id,
				store_id,
				store_items,
				payment_method,
				shipping_address,
				product_cache,
				store_cache,
				applied_coupon_id=coupon_info.get("coupon_id") if coupon_info else None,
				applied_discount_amount=current_store_discount,
				applied_coupon_code=coupon_info.get("coupon_code") if coupon_info else None,
				shipping_phone=shipping_phone
			)
			success_orders.append(order_info)
			grand_total += Decimal(str(order_info["totalAmount"]))
			
		except HTTPException as e:
			db.rollback()
			raise e # Ngắt toàn bộ nếu có lỗi nghiệp vụ ở bất kỳ store nào để đảm bảo tính nguyên tử
		except Exception as e:
			db.rollback()
			raise HTTPException(status_code=500, detail=f"Lỗi tạo đơn hàng tại store {store_id}: {str(e)}")

	# Bước 3: Xử lý thanh toán bằng Ví (Wallet) một lần duy nhất cho tổng đơn hàng
	if payment_method == 'wallet':
		from app.services import wallet_service
		user_wallet = db.query(User).filter(User.id == user_id).with_for_update().first()
		if not user_wallet or user_wallet.wallet_balance < float(grand_total):
			db.rollback()
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail=f"Số dư ví không đủ để thanh toán tổng đơn hàng (Cần {float(grand_total):,.0f}đ, hiện có {getattr(user_wallet, 'wallet_balance', 0):,.0f}đ)"
			)
		
		# Trừ tiền ví
		wallet_service.add_transaction(
			db, entity_type='user', entity_id=user_id, 
			amount=float(grand_total), transaction_type='payment',
			description=f"Thanh toán giỏ hàng đa cửa hàng ({len(success_orders)} đơn hàng)",
			reference_id=None, reference_type='multi_order'
		)
		
		# Cập nhật trạng thái 'paid' cho tất cả đơn hàng thành công
		success_order_ids = [o["orderId"] for o in success_orders]
		db.query(Order).filter(Order.id.in_(success_order_ids)).update(
			{Order.payment_status: 'paid', Order.status: 'preparing'},
			synchronize_session=False
		)

	# Commit cuối cùng sau khi tất cả đã thành công
	db.commit()

	if not success_orders:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Khong co don hang nao duoc tao thanh cong"
		)

	return {
		"success": True,
		"message": f"Tao {len(success_orders)}/{len(store_groups)} don hang thanh cong",
		"totalOrders": len(success_orders),
		"totalAmount": float(grand_total),
		"orderGroups": success_orders
	}


# ========== Helper Functions ==========

def _dict_row(row) -> dict:
	return dict(row._mapping)


def _bool_from_db(value) -> bool:
	if isinstance(value, bool):
		return value
	if value is None:
		return False
	return int(value) == 1


def _status_label(expiry_date: date) -> str:
	today = date.today()
	if expiry_date < today:
		return "Het Han"
	if (expiry_date - today).days <= 7:
		return "Sap Het Han"
	return "Moi"


def _validate_and_calculate_coupon(db: Session, coupon_id: int, store_id: int, total_amount: Decimal) -> dict:
	from datetime import datetime
	
	if not coupon_id:
		return {"valid": False, "error": None, "coupon_id": None}
	
	# Get coupon
	coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
	
	if not coupon:
		return {"valid": False, "error": "Mã coupon không tồn tại", "coupon_id": None}
	
	if not coupon.is_active:
		return {"valid": False, "error": "Mã coupon đã bị vô hiệu hóa", "coupon_id": coupon_id}
	
	now = datetime.now()
	if coupon.valid_from and now < coupon.valid_from:
		return {"valid": False, "error": "Mã coupon chưa có hiệu lực", "coupon_id": coupon_id}
	
	if coupon.valid_to and now > coupon.valid_to:
		return {"valid": False, "error": "Mã coupon đã hết hạn", "coupon_id": coupon_id}
	
	if coupon.max_uses is not None and coupon.current_uses >= coupon.max_uses:
		return {"valid": False, "error": "Mã coupon đã hết lượt sử dụng", "coupon_id": coupon_id}
	
	# Check minimum amount
	if coupon.min_amount and total_amount < Decimal(str(coupon.min_amount)):
		return {
			"valid": False,
			"error": f"Đơn hàng tối thiểu {int(coupon.min_amount):,}đ để áp dụng mã này",
			"coupon_id": coupon_id
		}
	
	# Calculate discount
	discount_percent = Decimal(str(coupon.discount_percent or 0))
	discount_amount = total_amount * (discount_percent / Decimal("100"))
	discount_amount = discount_amount.quantize(Decimal("1"), rounding="ROUND_HALF_UP")  # Round to whole number
	
	return {
		"valid": True,
		"error": None,
		"coupon_id": coupon_id,
		"coupon_code": coupon.code,
		"discount_percent": float(discount_percent),
		"discount_amount": discount_amount
	}


def _increment_coupon_usage(db: Session, coupon_id: int) -> bool:
	if not coupon_id:
		return True
	
	coupon = db.query(Coupon).filter(Coupon.id == coupon_id).with_for_update().first()
	
	if not coupon:
		return False
	
	# Check limit again (in case of race condition)
	if coupon.max_uses is not None and coupon.current_uses >= coupon.max_uses:
		return False
	
	coupon.current_uses = (coupon.current_uses or 0) + 1
	return True


def _calculate_discount(base_price: float, expiry_date: date, supermarket_id: int = None, product_id: int = None, db: Session = None) -> tuple[float, float]:
	if db is None or supermarket_id is None:
		# Return 0% discount if context is missing, avoiding hardcoded fallback
		return round(base_price, 0), 0
	
	result = discount_policy_service.calculate_discount(
		db, 
		base_price, 
		expiry_date.strftime("%Y-%m-%d"), 
		supermarket_id,
		product_id
	)
	discount_percent = result.get("discountPercent", 0)
	final_price = result.get("finalPrice", base_price)
	return round(final_price, 0), discount_percent


# ========== Profile Services ==========

def get_customer_profile(db: Session, user_id: int) -> dict:
	user = db.query(
		User.id, User.username, User.email, User.full_name, User.phone, User.role, User.created_at, User.address,
		User.latitude, User.longitude, User.wallet_balance
	).filter(User.id == user_id, User.role == 'customer').first()

	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay khach hang")

	return {
		"id": user.id,
		"username": user.username,
		"email": user.email,
		"fullName": user.full_name,
		"phone": user.phone or "",
		"role": user.role,
		"address": user.address or "",
		"latitude": user.latitude,
		"longitude": user.longitude,
		"walletBalance": float(user.wallet_balance or 0),
		"createdAt": user.created_at.strftime("%d/%m/%Y") if user.created_at else "",
	}


def update_customer_profile(db: Session, user_id: int, full_name: str, email: str, phone: str, address: str = "") -> dict:
	if not full_name:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Họ tên không được để trống")

	existing_email = db.query(User.id).filter(
		User.email == email,
		User.id != user_id
	).first()
	if existing_email:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email đã được sử dụng")

	if phone:
		existing_phone = db.query(User.id).filter(
			User.phone == phone,
			User.id != user_id
		).first()
		if existing_phone:
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Số điện thoại đã được sử dụng")

	db.query(User).filter(User.id == user_id, User.role == 'customer').update(
		{
			User.full_name: full_name,
			User.email: email,
			User.phone: phone,
			User.address: address
		},
		synchronize_session=False
	)
	db.commit()

	return {"success": True, "message": "Cập nhật thành công"}


def change_customer_password(db: Session, user_id: int, current_password: str, new_password: str) -> dict:
	user = db.query(User).filter(User.id == user_id, User.role == 'customer').first()
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản")

	from app.core.security import verify_password, get_password_hash
	if not verify_password(current_password, user.password_hash):
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mật khẩu hiện tại không đúng")

	if len(new_password) < 6:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mật khẩu mới phải có ít nhất 6 ký tự")

	user.password_hash = get_password_hash(new_password)
	db.commit()
	return {"success": True, "message": "Đổi mật khẩu thành công"}


def deposit_money(db: Session, user_id: int, amount: float) -> dict:
	if amount <= 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Số tiền nạp phải lớn hơn 0")
	
	from app.services import wallet_service
	wallet_service.add_transaction(
		db, entity_type='user', entity_id=user_id,
		amount=amount, transaction_type='deposit',
		description=f"Nạp tiền vào ví",
		reference_id=None, reference_type='manual'
	)
	db.commit()
	
	# Lấy lại số dư mới từ DB (sử dụng một truy vấn mới sau khi commit)
	updated_user = db.query(User).filter(User.id == user_id).first()
	return {
		"success": True, 
		"message": f"Đã nạp thành công {amount:,.0f}đ vào ví",
		"newBalance": float(updated_user.wallet_balance or 0)
	}


# ========== Product Services ==========

def list_customer_products(
	db: Session,
	supermarket_id: int = None,
	store_id: int = None,
	category_id: int = None,
	search: str = None,
	customer_lat: float = None,
	customer_lng: float = None,
	radius_km: float = 10.0,
	sort_price: str = None  # 'asc' or 'desc'
) -> dict:
	base_query = db.query(
		Product.id, Product.sku, Product.name, Product.base_price, Product.image_url,
		Product.supermarket_id, Category.id.label("category_id"), Category.name.label("category_name"),
		InventoryLot.store_id, Store.name.label("store_name"),
		InventoryLot.expiry_date, InventoryLot.qty_on_hand, InventoryLot.qty_reserved, InventoryLot.lot_code,
		Store.latitude, Store.longitude
	).distinct()\
	 .join(Category, Category.id == Product.category_id)\
	 .join(InventoryLot, InventoryLot.product_id == Product.id)\
	 .join(Store, Store.id == InventoryLot.store_id)\
	 .join(User, and_(User.supermarket_id == Product.supermarket_id, User.role == 'supermarket_admin'))\
	 .filter(
		 InventoryLot.qty_on_hand > 0, 
		 InventoryLot.expiry_date >= date.today(),
		 User.is_active == 1,
		 Store.supermarket_id == Product.supermarket_id
	 )

	if supermarket_id:
		base_query = base_query.filter(Product.supermarket_id == supermarket_id)

	if store_id:
		base_query = base_query.filter(InventoryLot.store_id == store_id)

	if category_id:
		base_query = base_query.filter(Product.category_id == category_id)

	if search:
		base_query = base_query.filter(
			or_(Product.name.ilike(f"%{search}%"), Product.sku.ilike(f"%{search}%"))
		)

	rows = base_query.order_by(InventoryLot.expiry_date.asc(), Product.name.asc()).limit(100).all()

	items = []
	for row in rows:
		base_price = float(row.base_price or 0)
		sale_price, discount_percent = _calculate_discount(base_price, row.expiry_date, row.supermarket_id, row.id, db)
		days_left = (row.expiry_date - datetime.now().date()).days
		
		# Calculate available stock: on_hand - reserved
		available_stock = max(0, int(row.qty_on_hand) - int(row.qty_reserved))

		# Nếu có tọa độ customer và không chọn store cụ thể → lọc theo bán kính 10km
		if customer_lat is not None and customer_lng is not None and store_id is None:
			if row.latitude is None or row.longitude is None:
				continue  # store không có tọa độ → loại bỏ
			dist = calculate_distance(customer_lat, customer_lng, row.latitude, row.longitude)
			if dist > radius_km:
				continue  # quá xa → loại bỏ

		items.append({
			"id": row.id,
			"name": row.name,
			"sku": row.sku,
			"originalPrice": base_price,
			"salePrice": sale_price,
			"discount": discount_percent,
			"imageUrl": row.image_url,
			"categoryId": row.category_id,
			"categoryName": row.category_name or "Khac",
			"storeId": row.store_id,
			"storeName": row.store_name or "Cua hang",
			"expiryDate": row.expiry_date.strftime("%Y-%m-%d"),
			"daysLeft": days_left,
			"stock": available_stock,
			"lotCode": row.lot_code,
		})

	# Sort by salePrice if requested
	if sort_price == 'asc':
		items.sort(key=lambda x: x['salePrice'])
	elif sort_price == 'desc':
		items.sort(key=lambda x: x['salePrice'], reverse=True)

	return {"items": items}


def get_customer_product_detail(db: Session, product_id: int, customer_lat: float = None, customer_lng: float = None, radius_km: float = 10.0) -> dict:
	rows = db.query(
		Product.id,
		Product.name,
		Product.sku,
		Product.base_price,
		Product.image_url,
		Category.id.label('category_id'),
		Category.name.label('category_name'),
		Supermarket.id.label('supermarket_id'),
		Supermarket.name.label('supermarket_name'),
		User.is_active.label('supermarket_active')
	).outerjoin(
		Category, Category.id == Product.category_id
	).outerjoin(
		Supermarket, Supermarket.id == Product.supermarket_id
	).join(
		User, and_(User.supermarket_id == Product.supermarket_id, User.role == 'supermarket_admin')
	).filter(
		Product.id == product_id
	).first()

	if not rows or not _bool_from_db(getattr(rows, 'supermarket_active', False)):
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sản phẩm không tồn tại hoặc siêu thị đã ngừng hoạt động")

	row = _dict_row(rows)

	inventory_rows = db.query(
		InventoryLot.lot_code,
		InventoryLot.expiry_date,
		InventoryLot.qty_on_hand,
		InventoryLot.qty_reserved,
		InventoryLot.manufacturing_date,
		Store.name.label('store_name'),
		Store.location.label('store_address'),
		Store.latitude,
		Store.longitude
	).join(
		Store, Store.id == InventoryLot.store_id
	).filter(
		InventoryLot.product_id == product_id,
		InventoryLot.qty_on_hand > 0,
		InventoryLot.expiry_date >= date.today(),
		Store.supermarket_id == row["supermarket_id"]
	).order_by(
		InventoryLot.expiry_date.asc()
	).all()

	stores = []
	total_stock = 0
	for inv in inventory_rows:
		# Lọc khoảng cách cửa hàng
		if customer_lat is not None and customer_lng is not None:
			if inv.latitude is None or inv.longitude is None:
				continue
			dist = calculate_distance(customer_lat, customer_lng, inv.latitude, inv.longitude)
			if dist > radius_km:
				continue

		base_price = float(row["base_price"] or 0)
		sale_price, discount_percent = _calculate_discount(base_price, inv.expiry_date, row["supermarket_id"], product_id, db)
		days_left = (inv.expiry_date - datetime.now().date()).days
		available_qty = max(0, int(inv.qty_on_hand) - int(inv.qty_reserved))

		stores.append({
			"lotCode": inv.lot_code,
			"expiryDate": inv.expiry_date.strftime("%Y-%m-%d"),
			"quantity": available_qty,
			"storeName": inv.store_name,
			"storeAddress": inv.store_address,
			"salePrice": sale_price,
			"discount": discount_percent,
			"daysLeft": days_left,
			"manufacturingDate": inv.manufacturing_date.strftime("%Y-%m-%d") if inv.manufacturing_date else None,
		})
		total_stock += available_qty

	base_price = float(row["base_price"] or 0)
	best_price, best_discount = _calculate_discount(base_price, inventory_rows[0].expiry_date, row["supermarket_id"], product_id, db) if inventory_rows else (base_price, 0)

	return {
		"id": row["id"],
		"name": row["name"],
		"sku": row["sku"],
		"originalPrice": base_price,
		"bestPrice": best_price,
		"bestDiscount": best_discount,
		"imageUrl": row["image_url"],
		"categoryId": row["category_id"],
		"categoryName": row["category_name"] or "Khac",
		"supermarketId": row["supermarket_id"],
		"supermarketName": row["supermarket_name"] or "Siêu thị",
		"totalStock": total_stock,
		"stores": stores,
	}


def list_near_expiry_products(
	db: Session,
	supermarket_id: int = None,
	max_days: int = 7,
	customer_lat: float = None,
	customer_lng: float = None,
	radius_km: float = 10.0
) -> dict:
	cutoff_date = date.today() + timedelta(days=max_days)

	base_query = db.query(
		Product.id, Product.sku, Product.name, Product.base_price, Product.image_url,
		Product.supermarket_id, Category.name.label("category_name"),
		Store.name.label("store_name"), Store.latitude, Store.longitude,
		InventoryLot.expiry_date, 
		InventoryLot.qty_on_hand, InventoryLot.qty_reserved, InventoryLot.lot_code
	).join(Category, Category.id == Product.category_id)\
	 .join(InventoryLot, InventoryLot.product_id == Product.id)\
	 .join(Store, Store.id == InventoryLot.store_id)\
	 .join(User, and_(User.supermarket_id == Product.supermarket_id, User.role == 'supermarket_admin'))\
	 .filter(
	         InventoryLot.qty_on_hand > 0, 
	         InventoryLot.expiry_date >= date.today(),
	         InventoryLot.expiry_date <= cutoff_date,
	         User.is_active == 1
	 )

	if supermarket_id:
		base_query = base_query.filter(Product.supermarket_id == supermarket_id)

	rows = base_query.order_by(InventoryLot.expiry_date.asc(), Product.name.asc()).limit(50).all()

	items = []
	for row in rows:
		base_price = float(row.base_price or 0)
		sale_price, discount_percent = _calculate_discount(base_price, row.expiry_date, row.supermarket_id, row.id, db)
		days_left = (row.expiry_date - date.today()).days
		available_stock = max(0, int(row.qty_on_hand) - int(row.qty_reserved))

		# Nếu có tọa độ customer → lọc theo bán kính 10km
		if customer_lat is not None and customer_lng is not None:
			if row.latitude is None or row.longitude is None:
				continue  # store không có tọa độ → loại bỏ
			dist = calculate_distance(customer_lat, customer_lng, row.latitude, row.longitude)
			if dist > radius_km:
				continue  # quá xa → loại bỏ

		items.append({
			"id": row.id,
			"name": row.name,
			"sku": row.sku,
			"originalPrice": base_price,
			"salePrice": sale_price,
			"discount": discount_percent,
			"imageUrl": row.image_url,
			"categoryName": row.category_name or "Khac",
			"storeName": row.store_name or "Cua hang",
			"expiryDate": row.expiry_date.strftime("%Y-%m-%d"),
			"daysLeft": days_left,
			"stock": available_stock,
			"lotCode": row.lot_code,
		})

	return {"items": items}


# ========== Category & Supermarket Services ==========

def list_customer_categories(db: Session, supermarket_id: int = None) -> dict:
	base_query = db.query(Category.id, Category.name)\
	 .distinct()\
	 .join(Product, Product.category_id == Category.id)\
	 .join(InventoryLot, InventoryLot.product_id == Product.id)\
	 .filter(InventoryLot.qty_on_hand > 0, InventoryLot.expiry_date >= date.today())

	if supermarket_id:
		base_query = base_query.filter(Product.supermarket_id == supermarket_id)

	rows = base_query.order_by(Category.name.asc()).all()

	items = [{"id": row.id, "name": row.name} for row in rows]
	return {"items": items}


def list_customer_supermarkets(db: Session) -> dict:
	rows = db.query(
		Supermarket.id, Supermarket.name, User.phone, User.address
	).outerjoin(
		User, and_(
			User.supermarket_id == Supermarket.id,
			User.role == 'supermarket_admin'
		)
	).order_by(Supermarket.name.asc()).all()

	items = [
		{
			"id": row.id,
			"name": row.name,
			"location": row.address or "",
			"phone": row.phone or "",
		}
		for row in rows
	]
	return {"items": items}


def list_customer_stores(
	db: Session,
	customer_lat: float = None,
	customer_lng: float = None,
	radius_km: float = 10.0
) -> dict:
	rows = db.query(
		Store.id, Store.name, Store.supermarket_id,
		Supermarket.name.label("supermarket_name"),
		Store.location, Store.phone, Store.latitude, Store.longitude
	).join(
		Supermarket, Supermarket.id == Store.supermarket_id
	).filter(
		Store.id.in_(
			db.query(InventoryLot.store_id).filter(
				InventoryLot.qty_on_hand > 0,
				InventoryLot.expiry_date >= date.today()
			).distinct()
		)
	).all()

	items = []
	for row in rows:
		distance = None
		if customer_lat is not None and customer_lng is not None:
			# Store không có tọa độ → loại bỏ khi customer có tọa độ
			if row.latitude is None or row.longitude is None:
				continue
			distance = calculate_distance(customer_lat, customer_lng, row.latitude, row.longitude)
			# Quá bán kính → loại bỏ
			if distance > radius_km:
				continue

		items.append({
				"id": row.id,
				"name": row.name,
				"supermarketId": row.supermarket_id,
				"supermarketName": row.supermarket_name or "",
				"location": row.location or "",
				"phone": row.phone or "",
				"latitude": row.latitude,
				"longitude": row.longitude,
				"distance": distance,
			})

	if customer_lat is not None and customer_lng is not None:
		items.sort(key=lambda x: (
			x["distance"] if x["distance"] is not None else 999999,
			x["name"]
		))
	else:
		items.sort(key=lambda x: x["name"])

	return {"items": items}


# ========== Order Services ==========

def list_customer_orders(
	db: Session,
	user_id: int,
	status_filter: str = "all"
) -> dict:
	base_query = db.query(
		Order.id, Order.status, Order.total_amount, Order.discount_amount, Order.coupon_id,
		Order.payment_method, Order.payment_status, Order.created_at,
		Store.name.label("store_name"), Store.location.label("store_address")
	).join(Store, Store.id == Order.store_id)\
	 .outerjoin(Coupon, Coupon.id == Order.coupon_id)\
	 .filter(Order.customer_id == user_id)

	if status_filter != "all":
		base_query = base_query.filter(Order.status == status_filter)

	rows = base_query.order_by(Order.created_at.desc()).limit(50).all()

	items = []
	for row in rows:
		item_rows = db.query(
			OrderItem.quantity, OrderItem.unit_price, 
			Product.name.label("product_name")
		).join(Product, Product.id == OrderItem.product_id)\
		 .filter(OrderItem.order_id == row.id).all()

		order_items = [
			{
				"name": ir.product_name,
				"quantity": int(ir.quantity),
				"unitPrice": float(ir.unit_price),
			}
			for ir in item_rows
		]
		
		# Build coupon info if exists
		coupon_info = None
		if row.coupon_id:
			coupon_row = db.query(
				Coupon.code, Coupon.discount_percent
			).filter(Coupon.id == row.coupon_id).first()
			if coupon_row:
				coupon_info = {
					"code": coupon_row.code,
					"discountPercent": float(coupon_row.discount_percent or 0),
					"discountAmount": float(row.discount_amount or 0),
				}

		items.append({
			"id": f"DH-{row.id}",
			"orderId": row.id,
			"storeName": row.store_name or "Cua hang",
			"storeAddress": row.store_address or "",
			"status": row.status,
			"totalAmount": float(row.total_amount or 0),
			"discountAmount": float(row.discount_amount or 0),
			"paymentMethod": row.payment_method or "cod",
			"paymentStatus": row.payment_status,
			"createdAt": row.created_at.strftime("%d/%m/%Y %H:%M"),
			"items": order_items,
			"coupon": coupon_info,
		})

	return {"items": items}


def get_customer_order_detail(db: Session, order_id: int, user_id: int) -> dict:
	order = db.query(
		Order.id,
		Order.status,
		Order.total_amount,
		Order.discount_amount,
		Order.coupon_id,
		Order.payment_method,
		Order.payment_status,
		Order.created_at,
		Store.name.label('store_name'),
		Store.location.label('store_address')
	).join(Store, Store.id == Order.store_id).outerjoin(
		Coupon, Coupon.id == Order.coupon_id
	).filter(
		Order.id == order_id,
		Order.customer_id == user_id
	).first()

	if not order:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Don hang khong ton tai")

	item_rows = db.query(
		OrderItem.quantity,
		OrderItem.unit_price,
		Product.name.label('product_name'),
		InventoryLot.lot_code,
		InventoryLot.expiry_date
	).join(
		Product, Product.id == OrderItem.product_id
	).outerjoin(
		InventoryLot, InventoryLot.product_id == Product.id
	).filter(
		OrderItem.order_id == order_id
	).all()

	delivery_row = db.query(
		Delivery.status,
		Delivery.delivery_code,
		Delivery.picked_at,
		Delivery.delivered_at
	).filter(Delivery.order_id == order_id).first()

	items = []
	for ir in item_rows:
		items.append({
			"name": ir.product_name,
			"quantity": int(ir.quantity),
			"unitPrice": float(ir.unit_price),
			"lotCode": ir.lot_code,
			"expiryDate": ir.expiry_date.strftime("%Y-%m-%d") if ir.expiry_date else "",
		})
	
	# Build coupon info if exists
	coupon_info = None
	if order.coupon_id:
		coupon_row = db.query(
			Coupon.code, Coupon.discount_percent
		).filter(Coupon.id == order.coupon_id).first()
		if coupon_row:
			coupon_info = {
				"code": coupon_row.code,
				"discountPercent": float(coupon_row.discount_percent or 0),
				"discountAmount": float(order.discount_amount or 0),
			}

	return {
		"id": f"DH-{order.id}",
		"orderId": order.id,
		"storeName": order.store_name or "Cua hang",
		"storeAddress": order.store_address or "",
		"status": order.status,
		"totalAmount": float(order.total_amount or 0),
		"discountAmount": float(order.discount_amount or 0),
		"paymentMethod": order.payment_method or "cod",
		"paymentStatus": order.payment_status,
		"createdAt": order.created_at.strftime("%d/%m/%Y %H:%M"),
		"items": items,
		"delivery": {
			"status": delivery_row.status if delivery_row else None,
			"deliveryCode": delivery_row.delivery_code if delivery_row else None,
			"pickedAt": delivery_row.picked_at.strftime("%d/%m/%Y %H:%M") if delivery_row and delivery_row.picked_at else None,
			"deliveredAt": delivery_row.delivered_at.strftime("%d/%m/%Y %H:%M") if delivery_row and delivery_row.delivered_at else None,
		} if delivery_row else None,
		"coupon": coupon_info,
	}


def create_customer_order(
	db: Session,
	user_id: int,
	items: list,
	store_id: int,
	payment_method: str = "cod",
	shipping_address: str = None,
	coupon_id: int = None,
	shipping_phone: str = None
) -> dict:
	import logging
	logger = logging.getLogger(__name__)
	
	# Auto-cleanup expired reservations BEFORE creating new order
	cleanup_result = restore_expired_reserved_stock(db, timeout_minutes=3)
	if cleanup_result["restoredCount"] > 0:
		logger.info(f"Auto-cleanup before order: {cleanup_result['restoredCount']} expired orders released")
	
	if not items or len(items) == 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gio hang trong")

	if not store_id:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chua chon cua hang")

	# Use ORM for user validation
	user = db.query(User.id).filter(
		User.id == user_id, 
		User.role == 'customer'
	).first()
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khach hang khong ton tai")

	total_amount = Decimal("0")
	order_item_data = []
	
	# STEP 1: Collect all lot_ids needed upfront
	lot_ids_to_lock = []
	lot_query_specs = []
	
	for item in items:
		# Handle both dict and Pydantic model
		if isinstance(item, dict):
			product_id = item.get("productId")
			quantity = item.get("quantity", 1)
			lot_code = item.get("lotCode")
		else:
			# Pydantic model
			product_id = item.productId
			quantity = item.quantity
			lot_code = getattr(item, "lotCode", None)

		if not product_id or quantity <= 0:
			continue

		lot_query_specs.append({
			'product_id': product_id,
			'lot_code': lot_code,
			'is_specific': bool(lot_code),
			'quantity': quantity
		})

	# Pre-fetch and collect lot_ids sorted by ID for consistent lock ordering
	for spec in lot_query_specs:
		if spec['is_specific']:
			lot = db.query(InventoryLot.id).filter(
				InventoryLot.lot_code == spec['lot_code'],
				InventoryLot.store_id == store_id
			).first()
			if lot:
				lot_ids_to_lock.append(lot.id)
		else:
			lot = db.query(InventoryLot.id).filter(
				InventoryLot.product_id == spec['product_id'],
				InventoryLot.store_id == store_id,
				InventoryLot.qty_on_hand > 0
			).order_by(InventoryLot.expiry_date.asc()).first()
			if lot:
				lot_ids_to_lock.append(lot.id)

	if not lot_ids_to_lock:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f"San pham khong co san trong cua hang"
		)

	# STEP 2: LOCK ALL LOTS IN ONE QUERY sorted by ID (DEADLOCK PREVENTION)
	locked_lots = db.query(InventoryLot).filter(
		InventoryLot.id.in_(lot_ids_to_lock)
	).order_by(InventoryLot.id.asc()).with_for_update().all()
	
	locked_lots_map = {lot.id: lot for lot in locked_lots}

	# STEP 3: Process items with already-locked lots
	for spec in lot_query_specs:
		product_id = spec['product_id']
		quantity = spec['quantity']
		lot_code = spec['lot_code']

		# Find the locked lot from our pre-locked set
		lot = None
		if spec['is_specific']:
			for l in locked_lots:
				if l.lot_code == lot_code and l.store_id == store_id:
					lot = l
					break
		else:
			# Find first available lot for this product
			for l in locked_lots:
				if l.product_id == product_id and l.store_id == store_id and l.qty_on_hand > 0:
					lot = l
					break

		if not lot:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail=f"San pham khong co san trong cua hang"
			)

		# Check available stock AFTER acquiring lock (atomic operation)
		available = lot.qty_on_hand - lot.qty_reserved
		if available < quantity:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail=f"San pham khong du so luong (chi con {available})"
			)

		# Reserve stock immediately (within the same transaction, still locked)
		lot.qty_reserved = lot.qty_reserved + quantity

		# Use ORM for Product query
		product = db.query(Product.base_price, Product.supermarket_id).filter(
			Product.id == product_id
		).first()

		if product:
			base_price = float(product.base_price or 0)
			sale_price, _ = _calculate_discount(base_price, lot.expiry_date, product.supermarket_id, product_id, db)
			unit_price = int(sale_price)
			total_amount += Decimal(str(unit_price * quantity))
			
			# Store item data for later insertion
			order_item_data.append({
				"product_id": product_id,
				"quantity": quantity,
				"unit_price": unit_price,
				"lot_id": lot.id
			})

	# Create Order using ORM
	# Validate and calculate coupon discount
	applied_coupon_id = None
	applied_discount_amount = Decimal("0")
	applied_coupon_code = None
	final_amount = total_amount
	
	if coupon_id:
		coupon_validation = _validate_and_calculate_coupon(db, coupon_id, store_id, total_amount)
		if not coupon_validation.get("valid"):
			raise HTTPException(status_code=400, detail=coupon_validation.get("error", "Mã coupon không hợp lệ"))
		
		applied_coupon_id = coupon_validation.get("coupon_id")
		applied_discount_amount = coupon_validation.get("discount_amount", Decimal("0"))
		applied_coupon_code = coupon_validation.get("coupon_code")
		final_amount = max(Decimal("0"), total_amount - applied_discount_amount)
	
	new_order = Order(
		store_id=store_id,
		customer_id=user_id,
		status='pending',
		total_amount=final_amount,
		discount_amount=applied_discount_amount,
		payment_method=payment_method,
		payment_status='pending',
		shipping_address=shipping_address,
		shipping_phone=shipping_phone,
		reserved_at=datetime.now(),
		coupon_id=applied_coupon_id
	)
	
	db.add(new_order)
	db.flush()
	order_id = new_order.id
	
	# Xử lý thanh toán bằng Ví (Wallet) sau khi đã có order_id
	if payment_method == 'wallet':
		from app.services import wallet_service
		user_wallet = db.query(User).filter(User.id == user_id).with_for_update().first()
		if not user_wallet or user_wallet.wallet_balance < float(final_amount):
			db.rollback()
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail=f"Số dư ví không đủ (Còn {getattr(user_wallet, 'wallet_balance', 0):,.0f}đ)"
			)
		
		# Trừ tiền ví và cập nhật trạng thái đơn hàng
		wallet_service.add_transaction(
			db, entity_type='user', entity_id=user_id, 
			amount=float(final_amount), transaction_type='payment',
			description=f"Thanh toán đơn hàng DH-{order_id}",
			reference_id=order_id, reference_type='order'
		)
		new_order.payment_status = 'paid'
		new_order.status = 'preparing'
	
	# Increment coupon usage count if applied
	if applied_coupon_id:
		if not _increment_coupon_usage(db, applied_coupon_id):
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Mã giảm giá đã hết lượt sử dụng"
			)

	# Insert order items using ORM
	for item_data in order_item_data:
		order_item = OrderItem(
			order_id=order_id,
			lot_id=item_data["lot_id"],
			product_id=item_data["product_id"],
			quantity=item_data["quantity"],
			unit_price=item_data["unit_price"]
		)
		db.add(order_item)

	# Note: qty_reserved already updated above within the lock

	db.commit()

	return {
		"success": True,
		"orderId": order_id,
		"orderCode": f"DH-{order_id}",
		"message": "Dat hang thanh cong",
		"originalAmount": float(total_amount),
		"discountAmount": float(applied_discount_amount),
		"couponCode": applied_coupon_code,
	}


def cancel_customer_order(db: Session, order_id: int, user_id: int) -> dict:
	order = db.query(Order).filter(
		Order.id == order_id,
		Order.customer_id == user_id
	).first()

	if not order:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Don hang khong ton tai")

	if order.status not in ("pending", "preparing", "failed"):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Khong the huy don hang da duoc xu ly"
		)

	# Logic hoàn tiền nếu đơn đã thanh toán
	if order.payment_status == 'paid':
		from app.services import wallet_service
		wallet_service.add_transaction(
			db, entity_type='user', entity_id=user_id,
			amount=float(order.total_amount), transaction_type='refund',
			description=f"Hoàn tiền hủy đơn hàng DH-{order_id}",
			reference_id=order_id, reference_type='order'
		)
		order.payment_status = 'pending' # Trả về pending hoặc một trạng thái refund

	# Single order cancel (original logic)
	item_rows = db.query(
		OrderItem.lot_id,
		OrderItem.quantity
	).filter(OrderItem.order_id == order_id).all()

	for item in item_rows:
		# Luôn giải phóng lượng giữ chỗ (Reserved) vì ở giai đoạn pending/preparing 
		# hàng chưa bị trừ khỏi kho thực tế (qty_on_hand)
		db.query(InventoryLot).filter(
			InventoryLot.id == item.lot_id
		).update(
			{InventoryLot.qty_reserved: InventoryLot.qty_reserved - item.quantity},
			synchronize_session=False
		)

	order.status = 'cancelled'
	db.commit()

	return {"success": True, "message": "Huy don hang thanh cong"}




def customer_dashboard_summary(db: Session, user_id: int) -> dict:
	# Use ORM aggregations
	total_orders = db.query(func.count(Order.id)).filter(
		Order.customer_id == user_id
	).scalar() or 0

	pending_orders = db.query(func.count(Order.id)).filter(
		Order.customer_id == user_id,
		Order.status.in_(['pending', 'preparing'])
	).scalar() or 0

	completed_orders = db.query(func.count(Order.id)).filter(
		Order.customer_id == user_id,
		Order.status == 'completed'
	).scalar() or 0

	total_spent = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(
		Order.customer_id == user_id,
		Order.status == 'completed'
	).scalar() or 0

	return {
		"totalOrders": int(total_orders),
		"pendingOrders": int(pending_orders),
		"completedOrders": int(completed_orders),
		"totalSpent": float(total_spent),
	}


# ========== Inventory Reserved Stock Management ==========

def confirm_customer_order(db: Session, order_id: int, user_id: int, payment_method: str = None) -> dict:
	order = db.query(Order).filter(
		Order.id == order_id,
		Order.customer_id == user_id
	).first()

	if not order:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Don hang khong ton tai")

	if order.status == "preparing":
		# Already confirmed, no action needed
		return {"success": True, "message": "Don hang da duoc xac nhan"}

	# Get all order items
	item_rows = db.query(
		OrderItem.lot_id,
		OrderItem.quantity
	).filter(OrderItem.order_id == order_id).all()

	# Ưu tiên phương thức thanh toán mới được truyền vào, nếu không dùng phương thức cũ của đơn hàng
	effective_payment_method = payment_method if payment_method else (order.payment_method if order.payment_method else 'cod')

	# XỬ LÝ THANH TOÁN BẰNG VÍ
	if effective_payment_method.lower() == 'wallet':
		from app.services import wallet_service
		user = db.query(User).filter(User.id == user_id).with_for_update().first()
		
		# order.total_amount ĐÃ LÀ số tiền cuối cùng phải trả (đã trừ coupon và cộng phí ship)
		final_amount = Decimal(str(order.total_amount or 0))
		if final_amount < 0: final_amount = Decimal("0")
		
		current_balance = user.wallet_balance or 0
		if current_balance < final_amount:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST, 
				detail=f"Số dư ví không đủ. Cần {final_amount:,.0f}đ nhưng hiện có {current_balance:,.0f}đ"
			)
		
		# Thực hiện trừ tiền
		wallet_service.add_transaction(
			db, entity_type='user', entity_id=user_id,
			amount=float(final_amount), transaction_type='payment',
			description=f"Thanh toán đơn hàng DH-{order_id}",
			reference_id=order_id, reference_type='order'
		)
		order.payment_status = 'paid'

	# Update order payment status, payment method and order status
	order.status = 'preparing'
	order.payment_method = effective_payment_method
	
	if effective_payment_method == 'vnpay':
		order.payment_status = 'paid'

	db.commit()
	return {"success": True, "message": "Xác nhận thanh toán thành công"}



def restore_expired_reserved_stock(db: Session, timeout_minutes: int = 15) -> dict:
	cutoff_time = datetime.now() - timedelta(minutes=timeout_minutes)

	# Find expired pending orders
	expired_orders = db.query(Order).filter(
		Order.payment_status == 'pending',
		Order.status == 'pending',
		Order.reserved_at <= cutoff_time
	).all()

	restored_count = 0
	restored_items = []

	for order in expired_orders:
		order_id = order.id

		# Logic hoàn tiền nếu đơn hàng đã thanh toán (VNPay) nhưng hệ thống chưa kịp cập nhật status 
		# (Trường hợp khách trả tiền thành công nhưng quá 15p IPN mới tới)
		if order.payment_status == 'paid':
			from app.services import wallet_service
			wallet_service.add_transaction(
				db, entity_type='user', entity_id=order.customer_id,
				amount=float(order.total_amount), transaction_type='refund',
				description=f"Hoàn tiền đơn hàng quá hạn thanh toán DH-{order_id}",
				reference_id=order_id, reference_type='order'
			)

		# Get all order items
		item_rows = db.query(
			OrderItem.lot_id,
			OrderItem.quantity
		).filter(OrderItem.order_id == order_id).all()

		# Restore reserved stock back to on_hand (but not more than reserved)
		for item in item_rows:
			# Get current reserved amount for safety check
			lot = db.query(InventoryLot.qty_reserved).filter(
				InventoryLot.id == item.lot_id
			).first()

			if lot and lot.qty_reserved > 0:
				# Safe subtraction: only restore up to the reserved amount
				restore_qty = min(item.quantity, lot.qty_reserved)

				if restore_qty > 0:
					db.query(InventoryLot).filter(
						InventoryLot.id == item.lot_id
					).update(
						{InventoryLot.qty_reserved: InventoryLot.qty_reserved - restore_qty},
						synchronize_session=False
					)
					restored_items.append({
						"lot_id": item.lot_id,
						"quantity": restore_qty
					})

		# Cancel the order
		db.query(Order).filter(Order.id == order_id).update(
			{Order.status: 'cancelled'},
			synchronize_session=False
		)

		restored_count += 1

	db.commit()

	return {
		"success": True,
		"message": f"Da huy va khoi phuc {restored_count} don hang het han",
		"restoredCount": restored_count,
		"restoredItems": restored_items,
		"cutoffTime": cutoff_time.strftime("%Y-%m-%d %H:%M:%S")
	}


def validate_cart_stock(db: Session, items: list, user_id: int = None) -> dict:
	import logging
	logger = logging.getLogger(__name__)
	
	# FIRST: Auto-cleanup expired reservations BEFORE checking stock
	# This ensures expired reservations don't block valid purchases
	cleanup_result = restore_expired_reserved_stock(db, timeout_minutes=3)
	if cleanup_result["restoredCount"] > 0:
		logger.info(f"Auto-cleanup during validation: {cleanup_result['restoredCount']} expired orders released")
	
	from app.models import InventoryLot, Product
	
	results = []
	out_of_stock = []
	
	# STEP 1: Collect all product_id/store_id pairs we need to check
	check_pairs = []
	for item in items:
		# Handle both dict and Pydantic model
		if isinstance(item, dict):
			product_id = item.get("productId")
			quantity = item.get("quantity", 1)
			store_id = item.get("storeId")
		else:
			product_id = item.productId
			quantity = item.quantity
			store_id = item.storeId
		
		if not product_id or not store_id or quantity <= 0:
			continue
		
		check_pairs.append({
			'product_id': product_id,
			'store_id': store_id,
			'quantity': quantity
		})
	
	# STEP 2: Pre-fetch all lot_ids sorted by ID for consistent locking
	lot_ids_to_lock = []
	for pair in check_pairs:
		lot = db.query(InventoryLot.id).filter(
			InventoryLot.product_id == pair['product_id'],
			InventoryLot.store_id == pair['store_id'],
			InventoryLot.qty_on_hand > 0
		).order_by(InventoryLot.expiry_date.asc()).first()
		if lot:
			lot_ids_to_lock.append(lot.id)
	
	# STEP 3: LOCK ALL LOTS IN ONE QUERY sorted by ID (DEADLOCK PREVENTION)
	locked_lots = {}
	if lot_ids_to_lock:
		lots = db.query(InventoryLot).filter(
			InventoryLot.id.in_(lot_ids_to_lock)
		).order_by(InventoryLot.id.asc()).with_for_update().all()
		
		for lot in lots:
			key = (lot.product_id, lot.store_id)
			locked_lots[key] = lot
	
	# STEP 4: Validate each item against locked lots
	for pair in check_pairs:
		product_id = pair['product_id']
		store_id = pair['store_id']
		quantity = pair['quantity']
		
		# Get product name for error reporting
		product = db.query(Product.name).filter(Product.id == product_id).first()
		product_name = product.name if product else f"San pham #{product_id}"
		
		# Get locked lot from our pre-locked map
		lot = locked_lots.get((product_id, store_id))
		
		if not lot:
			# No available lot for this product in this store
			results.append({
				"productId": product_id,
				"storeId": store_id,
				"productName": product_name,
				"requestedQuantity": quantity,
				"availableQuantity": 0,
				"enoughStock": False,
				"lotCode": None
			})
			out_of_stock.append(f"{product_name} (cua hang #{store_id})")
			continue
		
		# Calculate available stock (on_hand - reserved)
		available = lot.qty_on_hand - lot.qty_reserved
		enough_stock = available >= quantity
		
		results.append({
			"productId": product_id,
			"storeId": store_id,
			"productName": product_name,
			"requestedQuantity": quantity,
			"availableQuantity": available,
			"enoughStock": enough_stock,
			"lotCode": lot.lot_code
		})
		
		if not enough_stock:
			out_of_stock.append(f"{product_name} - chi con {available}")
	
	# Check if all items are valid
	all_valid = all(item.get("enoughStock", False) for item in results) and len(results) == len(check_pairs)
	
	return {
		"valid": all_valid,
		"items": results,
		"outOfStockItems": out_of_stock
	}


# ========== Coupon Services ==========

def list_available_coupons(db: Session) -> dict:
	from app.models.coupon import Coupon
	from datetime import datetime

	now = datetime.now()

	# Query coupons that are active, not expired, and have remaining uses
	coupons = db.query(
		Coupon.id,
		Coupon.code,
		Coupon.description,
		Coupon.discount_percent,
		Coupon.min_amount,
		Coupon.max_uses,
		Coupon.current_uses,
		Coupon.valid_from,
		Coupon.valid_to,
		Coupon.is_active,
	).filter(
		Coupon.is_active == True,
		Coupon.valid_to >= now
	).order_by(Coupon.discount_percent.desc()).all()

	items = []
	for coupon in coupons:
		# Check if coupon has remaining uses
		has_remaining = True
		if coupon.max_uses is not None and coupon.current_uses >= coupon.max_uses:
			has_remaining = False

		items.append({
			"id": coupon.id,
			"code": coupon.code,
			"description": coupon.description or "",
			"discountPercent": float(coupon.discount_percent or 0),
			"minAmount": float(coupon.min_amount) if coupon.min_amount else None,
			"maxUses": coupon.max_uses,
			"currentUses": coupon.current_uses or 0,
			"validFrom": coupon.valid_from.strftime("%Y-%m-%d") if coupon.valid_from else "",
			"validTo": coupon.valid_to.strftime("%Y-%m-%d") if coupon.valid_to else "",
			"isActive": coupon.is_active,
		})

	return {"items": items}
