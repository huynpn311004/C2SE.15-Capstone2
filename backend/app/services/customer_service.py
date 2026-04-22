from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy import text, or_, func, and_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.security import get_password_hash, verify_password
from app.services import discount_policy_service
from app.models.user import User
from app.models.product import Product
from app.models.category import Category
from app.models.store import Store
from app.models.inventory_lot import InventoryLot
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.supermarket import Supermarket
from app.models.delivery import Delivery


def _get_or_create_order_group(
	db: Session,
	user_id: int,
	store_id: int,
	items: list,
	payment_method: str,
	shipping_address: str = None,
	product_cache: dict = None,
	store_cache: dict = None
) -> dict:
	"""
	Helper: Create an order for a single store group.
	Returns dict with order info and item details.
	Uses pessimistic locking (SELECT FOR UPDATE) to prevent over-selling.
	
	DEADLOCK PREVENTION: Lock ALL inventory lots in a SINGLE query sorted by lot.id
	to ensure consistent lock ordering across concurrent transactions.
	"""
	import logging
	logger = logging.getLogger(__name__)
	
	# Auto-cleanup expired reservations BEFORE creating new order
	# This releases stock from timed-out reservations so it can be reused
	cleanup_result = _auto_cleanup_expired_reservations(db, timeout_minutes=15)
	if cleanup_result["cleanedOrders"] > 0:
		logger.info(f"Auto-cleanup before order: {cleanup_result['cleanedOrders']} expired orders")
	
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
			product = db.query(Product.base_price, Product.name, Product.image_url).filter(
				Product.id == product_id
			).first()
			if product_cache is not None:
				product_cache[product_id] = product

		if product:
			base_price = float(product.base_price or 0)
			sale_price, _ = _calculate_discount(base_price, lot.expiry_date, None, product_id, None)
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
				"imageUrl": product.image_url
			})

	# Create Order
	new_order = Order(
		store_id=store_id,
		customer_id=user_id,
		status='pending',
		total_amount=total_amount,
		payment_method=payment_method,
		payment_status='pending',
		shipping_address=shipping_address,
		reserved_at=datetime.now()
	)
	db.add(new_order)
	db.flush()
	order_id = new_order.id

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
		"totalAmount": float(total_amount),
		"shippingAddress": shipping_address,
	}


def create_multi_store_order(
	db: Session,
	user_id: int,
	items: list,
	payment_method: str = "cod",
	shipping_address: str = None
) -> dict:
	"""
	Create separate orders for each store in the customer cart.
	This endpoint no longer creates a fake master/group order.
	"""
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

	success_orders = []
	failed_orders = []
	grand_total = Decimal("0")

	for store_id, store_items in store_groups.items():
		try:
			order_info = _get_or_create_order_group(
				db,
				user_id,
				store_id,
				store_items,
				payment_method,
				shipping_address,
				product_cache,
				store_cache
			)
			success_orders.append(order_info)
			grand_total += Decimal(str(order_info["totalAmount"]))
			db.commit()
		except HTTPException as e:
			db.rollback()
			failed_orders.append({
				"storeId": store_id,
				"error": str(e.detail)
			})
		except Exception as e:
			db.rollback()
			failed_orders.append({
				"storeId": store_id,
				"error": str(e)
			})

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
	"""Convert SQLAlchemy row to dictionary"""
	return dict(row._mapping)


def _status_label(expiry_date: date) -> str:
	"""Determine product status based on expiry date"""
	today = date.today()
	if expiry_date < today:
		return "Het Han"
	if (expiry_date - today).days <= 7:
		return "Sap Het Han"
	return "Moi"


def _calculate_discount(base_price: float, expiry_date: date, supermarket_id: int = None, product_id: int = None, db: Session = None) -> tuple[float, float]:
	"""Calculate sale price and discount percentage using supermarket's discount policies with 3-level priority"""
	if db is None or supermarket_id is None:
		# Fallback to default calculation if no db or supermarket_id
		today = date.today()
		days_left = (expiry_date - today).days
		if days_left < 0:
			return base_price, 0
		elif days_left <= 1:
			discount_percent = 70
		elif days_left <= 3:
			discount_percent = 50
		elif days_left <= 7:
			discount_percent = 30
		else:
			discount_percent = 0
		sale_price = base_price * (1 - discount_percent / 100)
		return round(sale_price, 0), discount_percent
	
	# Use discount policy service to get configured discount with 3-level priority
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
	"""Get customer profile by user_id"""
	user = db.query(
		User.id, User.username, User.email, User.full_name, User.phone, User.role, User.created_at
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
		"createdAt": user.created_at.strftime("%d/%m/%Y") if user.created_at else "",
	}


def update_customer_profile(db: Session, user_id: int, full_name: str, email: str, phone: str, address: str = "") -> dict:
	"""Update customer profile"""
	if not full_name:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ho ten khong duoc trong")

	existing = db.query(User.id).filter(
		User.email == email,
		User.id != user_id
	).first()
	if existing:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email da duoc su dung")

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
	"""Change customer password"""
	if len(new_password) < 6:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Mật khẩu mới phải có ít nhất 6 ký tự.",
		)

	row = db.query(User.password_hash).filter(
		User.id == user_id,
		User.role == 'customer'
	).first()
	if not row:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay tai khoan")

	if not verify_password(current_password, row.password_hash):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Mat khau hien tai khong dung.",
		)

	db.query(User).filter(User.id == user_id).update(
		{User.password_hash: get_password_hash(new_password)},
		synchronize_session=False
	)
	db.commit()

	return {"success": True, "message": "Doi mat khau thanh cong"}


# ========== Product Services ==========

def list_customer_products(
	db: Session,
	supermarket_id: int = None,
	category_id: int = None,
	search: str = None
) -> dict:
	"""List all available products for customer"""
	base_query = db.query(
		Product.id, Product.sku, Product.name, Product.base_price, Product.image_url,
		Product.supermarket_id, Category.id.label("category_id"), Category.name.label("category_name"),
		InventoryLot.store_id, Store.name.label("store_name"),
		InventoryLot.expiry_date, InventoryLot.qty_on_hand, InventoryLot.qty_reserved, InventoryLot.lot_code
	).distinct()\
	 .join(Category, Category.id == Product.category_id)\
	 .join(InventoryLot, InventoryLot.product_id == Product.id)\
	 .join(Store, Store.id == InventoryLot.store_id)\
	 .filter(InventoryLot.qty_on_hand > 0, InventoryLot.expiry_date >= date.today())

	if supermarket_id:
		base_query = base_query.filter(Product.supermarket_id == supermarket_id)

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

	return {"items": items}


def get_customer_product_detail(db: Session, product_id: int) -> dict:
	"""Get detailed information for a specific product"""
	rows = db.query(
		Product.id,
		Product.name,
		Product.sku,
		Product.base_price,
		Product.image_url,
		Category.id.label('category_id'),
		Category.name.label('category_name'),
		Supermarket.id.label('supermarket_id'),
		Supermarket.name.label('supermarket_name')
	).outerjoin(
		Category, Category.id == Product.category_id
	).outerjoin(
		Supermarket, Supermarket.id == Product.supermarket_id
	).filter(
		Product.id == product_id
	).first()

	if not rows:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="San pham khong ton tai")

	row = _dict_row(rows)

	inventory_rows = db.query(
		InventoryLot.lot_code,
		InventoryLot.expiry_date,
		InventoryLot.qty_on_hand,
		InventoryLot.qty_reserved,
		Store.name.label('store_name'),
		Store.location.label('store_address')
	).join(
		Store, Store.id == InventoryLot.store_id
	).filter(
		InventoryLot.product_id == product_id,
		InventoryLot.qty_on_hand > 0,
		InventoryLot.expiry_date >= date.today()
	).order_by(
		InventoryLot.expiry_date.asc()
	).all()

	stores = []
	total_stock = 0
	for inv in inventory_rows:
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
	max_days: int = 7
) -> dict:
	"""List products that are expiring soon"""
	cutoff_date = date.today() + timedelta(days=max_days)

	base_query = db.query(
		Product.id, Product.sku, Product.name, Product.base_price, Product.image_url,
		Product.supermarket_id, Category.name.label("category_name"),
		Store.name.label("store_name"), InventoryLot.expiry_date, 
		InventoryLot.qty_on_hand, InventoryLot.qty_reserved, InventoryLot.lot_code
	).join(Category, Category.id == Product.category_id)\
	 .join(InventoryLot, InventoryLot.product_id == Product.id)\
	 .join(Store, Store.id == InventoryLot.store_id)\
	 .filter(InventoryLot.qty_on_hand > 0, 
	         InventoryLot.expiry_date >= date.today(),
	         InventoryLot.expiry_date <= cutoff_date)

	if supermarket_id:
		base_query = base_query.filter(Product.supermarket_id == supermarket_id)

	rows = base_query.order_by(InventoryLot.expiry_date.asc(), Product.name.asc()).limit(50).all()

	items = []
	for row in rows:
		base_price = float(row.base_price or 0)
		sale_price, discount_percent = _calculate_discount(base_price, row.expiry_date, row.supermarket_id, row.id, db)
		days_left = (row.expiry_date - date.today()).days
		available_stock = max(0, int(row.qty_on_hand) - int(row.qty_reserved))

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
	"""List all product categories"""
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
	"""List all active supermarkets"""
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


# ========== Order Services ==========

def list_customer_orders(
	db: Session,
	user_id: int,
	status_filter: str = "all"
) -> dict:
	"""List all orders for a customer"""
	base_query = db.query(
		Order.id, Order.status, Order.total_amount, Order.payment_method, 
		Order.payment_status, Order.created_at,
		Store.name.label("store_name"), Store.location.label("store_address")
	).join(Store, Store.id == Order.store_id)\
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

		items.append({
			"id": f"DH-{row.id}",
			"orderId": row.id,
			"storeName": row.store_name or "Cua hang",
			"storeAddress": row.store_address or "",
			"status": row.status,
			"totalAmount": float(row.total_amount or 0),
			"paymentMethod": row.payment_method or "cod",
			"paymentStatus": row.payment_status,
			"createdAt": row.created_at.strftime("%d/%m/%Y %H:%M"),
			"items": order_items,
		})

	return {"items": items}


def get_customer_order_detail(db: Session, order_id: int, user_id: int) -> dict:
	"""Get detailed information for a specific order"""
	order = db.query(
		Order.id,
		Order.status,
		Order.total_amount,
		Order.payment_method,
		Order.payment_status,
		Order.created_at,
		Store.name.label('store_name'),
		Store.location.label('store_address')
	).join(Store, Store.id == Order.store_id).filter(
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

	return {
		"id": f"DH-{order.id}",
		"orderId": order.id,
		"storeName": order.store_name or "Cua hang",
		"storeAddress": order.store_address or "",
		"status": order.status,
		"totalAmount": float(order.total_amount or 0),
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
	}


def create_customer_order(
	db: Session,
	user_id: int,
	items: list,
	store_id: int,
	payment_method: str = "cod",
	shipping_address: str = None
) -> dict:
	"""Create a new order - DEADLOCK PREVENTION: Lock ALL lots in single query sorted by ID"""
	import logging
	logger = logging.getLogger(__name__)
	
	# Auto-cleanup expired reservations BEFORE creating new order
	cleanup_result = _auto_cleanup_expired_reservations(db, timeout_minutes=15)
	if cleanup_result["cleanedOrders"] > 0:
		logger.info(f"Auto-cleanup before order: {cleanup_result['cleanedOrders']} expired orders")
	
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
		product = db.query(Product.base_price).filter(
			Product.id == product_id
		).first()

		if product:
			base_price = float(product.base_price or 0)
			sale_price, _ = _calculate_discount(base_price, lot.expiry_date, None, product_id, None)
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
	new_order = Order(
		store_id=store_id,
		customer_id=user_id,
		status='pending',
		total_amount=total_amount,
		payment_method=payment_method,
		payment_status='pending',
		shipping_address=shipping_address,
		reserved_at=datetime.now()
	)
	db.add(new_order)
	db.flush()
	order_id = new_order.id

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
	}


def cancel_customer_order(db: Session, order_id: int, user_id: int) -> dict:
	"""Cancel single order only"""
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

	# Single order cancel (original logic)
	item_rows = db.query(
		OrderItem.lot_id,
		OrderItem.quantity
	).filter(OrderItem.order_id == order_id).all()

	for item in item_rows:
		if order.payment_status == "pending":
			db.query(InventoryLot).filter(
				InventoryLot.id == item.lot_id
			).update(
				{InventoryLot.qty_reserved: InventoryLot.qty_reserved - item.quantity},
				synchronize_session=False
			)
		else:
			db.query(InventoryLot).filter(
				InventoryLot.id == item.lot_id
			).update(
				{InventoryLot.qty_on_hand: InventoryLot.qty_on_hand + item.quantity},
				synchronize_session=False
			)

	order.status = 'cancelled'
	db.commit()

	return {"success": True, "message": "Huy don hang thanh cong"}




def customer_dashboard_summary(db: Session, user_id: int) -> dict:
	"""Get customer dashboard summary"""
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

def confirm_customer_order(db: Session, order_id: int, user_id: int) -> dict:

	"""
	Confirm order after payment - convert reserved stock to actual deduction
	Called when payment is confirmed (payment_status changes to 'paid')
	"""
	order = db.query(Order.id, Order.status, Order.payment_status).filter(
		Order.id == order_id,
		Order.customer_id == user_id
	).first()

	if not order:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Don hang khong ton tai")

	if order.payment_status == "paid":
		# Already confirmed, no action needed
		return {"success": True, "message": "Don hang da duoc xac nhan"}

	# Get all order items
	item_rows = db.query(
		OrderItem.lot_id,
		OrderItem.quantity
	).filter(OrderItem.order_id == order_id).all()

	# Convert reserved to actual deduction
	for item in item_rows:
		# Decrease reserved, decrease on_hand
		db.query(InventoryLot).filter(
			InventoryLot.id == item.lot_id
		).update(
			{
				InventoryLot.qty_reserved: InventoryLot.qty_reserved - item.quantity,
				InventoryLot.qty_on_hand: InventoryLot.qty_on_hand - item.quantity
			},
			synchronize_session=False
		)

	# Update order payment status
	db.query(Order).filter(Order.id == order_id).update(
		{Order.payment_status: 'paid'},
		synchronize_session=False
	)

	db.commit()
	return {"success": True, "message": "Xac nhan thanh toan thanh cong"}


def _auto_cleanup_expired_reservations(db: Session, timeout_minutes: int = 15) -> dict:
	"""
	Auto-cleanup expired reservations before any stock operation.
	SECOND layer of protection - validates and releases expired
	reservations on-the-fly when orders are being processed.
	
	Returns dict with cleanup info for logging purposes.
	"""
	cutoff_time = datetime.now() - timedelta(minutes=timeout_minutes)
	
	expired_orders = db.query(Order.id, Order.reserved_at).filter(
		Order.payment_status == 'pending',
		Order.status == 'pending',
		Order.reserved_at <= cutoff_time
	).all()
	
	cleaned_count = 0
	
	for order_row in expired_orders:
		order_id = order_row.id
		
		item_rows = db.query(
			OrderItem.lot_id,
			OrderItem.quantity
		).filter(OrderItem.order_id == order_id).all()
		
		for item in item_rows:
			lot = db.query(InventoryLot.qty_reserved).filter(
				InventoryLot.id == item.lot_id
			).first()
			
			if lot and lot.qty_reserved > 0:
				restore_qty = min(item.quantity, lot.qty_reserved)
				if restore_qty > 0:
					db.query(InventoryLot).filter(
						InventoryLot.id == item.lot_id
					).update(
						{InventoryLot.qty_reserved: InventoryLot.qty_reserved - restore_qty},
						synchronize_session=False
					)
		
		db.query(Order).filter(Order.id == order_id).update(
			{Order.status: 'expired'},
			synchronize_session=False
		)
		cleaned_count += 1
	
	if cleaned_count > 0:
		db.commit()
	
	return {
		"cleanedOrders": cleaned_count,
		"cutoffTime": cutoff_time.strftime("%Y-%m-%d %H:%M:%S")
	}


def restore_expired_reserved_stock(db: Session, timeout_minutes: int = 15) -> dict:
	"""
	Restore reserved stock for orders that haven't been paid within timeout period.
	Should be called periodically (e.g., every 5 minutes via scheduled task).

	Only restores orders where:
	- payment_status == 'pending' (stock is still in qty_reserved, not deducted from qty_on_hand)
	- status == 'pending' (order not yet processed)
	- reserved_at <= cutoff_time (exceeded timeout)
	"""
	cutoff_time = datetime.now() - timedelta(minutes=timeout_minutes)

	# Find expired pending orders
	expired_orders = db.query(Order.id).filter(
		Order.payment_status == 'pending',
		Order.status == 'pending',
		Order.reserved_at <= cutoff_time
	).all()

	restored_count = 0
	restored_items = []

	for order_row in expired_orders:
		order_id = order_row.id

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
	"""
	Validate cart items stock availability in real-time.
	Uses pessimistic locking to check accurate stock levels.
	
	DEADLOCK PREVENTION: Lock ALL lots in a single query sorted by lot_id
	to ensure consistent lock ordering across concurrent transactions.
	
	This should be called before adding items to cart or during checkout
	to prevent overselling when multiple customers add the same product.
	"""
	import logging
	logger = logging.getLogger(__name__)
	
	# FIRST: Auto-cleanup expired reservations BEFORE checking stock
	# This ensures expired reservations don't block valid purchases
	cleanup_result = _auto_cleanup_expired_reservations(db, timeout_minutes=15)
	if cleanup_result["cleanedOrders"] > 0:
		logger.info(f"Auto-cleanup during validation: {cleanup_result['cleanedOrders']} expired orders released")
	
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
