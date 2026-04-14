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


def update_customer_profile(db: Session, user_id: int, full_name: str, email: str, phone: str) -> dict:
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
			User.phone: phone
		},
		synchronize_session=False
	)
	db.commit()

	return {"success": True, "message": "Cap nhat thanh cong"}


def change_customer_password(db: Session, user_id: int, current_password: str, new_password: str) -> dict:
	"""Change customer password"""
	if len(new_password) < 6:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Mat khau moi phai co it nhat 6 ky tu.",
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
		InventoryLot.expiry_date, InventoryLot.qty_on_hand, InventoryLot.lot_code
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
			"stock": int(row.qty_on_hand),
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

		stores.append({
			"lotCode": inv.lot_code,
			"expiryDate": inv.expiry_date.strftime("%Y-%m-%d"),
			"quantity": int(inv.qty_on_hand),
			"storeName": inv.store_name,
			"storeAddress": inv.store_address,
			"salePrice": sale_price,
			"discount": discount_percent,
			"daysLeft": days_left,
		})
		total_stock += int(inv.qty_on_hand)

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
		InventoryLot.qty_on_hand, InventoryLot.lot_code
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
			"stock": int(row.qty_on_hand),
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
	"""Create a new order"""
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
	
	# First pass: validate items and calculate total
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

		# Use ORM for InventoryLot query
		if lot_code:
			lot = db.query(InventoryLot).filter(
				InventoryLot.lot_code == lot_code,
				InventoryLot.store_id == store_id
			).first()
		else:
			lot = db.query(InventoryLot).filter(
				InventoryLot.product_id == product_id,
				InventoryLot.store_id == store_id,
				InventoryLot.qty_on_hand > 0
			).order_by(InventoryLot.expiry_date.asc()).first()

		if not lot:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail=f"San pham khong co san trong cua hang"
			)

		if lot.qty_on_hand < quantity:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail=f"San pham khong du so luong (chi con {lot.qty_on_hand})"
			)

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
		shipping_address=shipping_address
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
		
		# Update inventory using ORM .update()
		db.query(InventoryLot).filter(
			InventoryLot.id == item_data["lot_id"]
		).update(
			{InventoryLot.qty_on_hand: InventoryLot.qty_on_hand - item_data["quantity"]},
			synchronize_session=False
		)

	db.commit()

	return {
		"success": True,
		"orderId": order_id,
		"orderCode": f"DH-{order_id}",
		"message": "Dat hang thanh cong",
	}


def cancel_customer_order(db: Session, order_id: int, user_id: int) -> dict:
	"""Cancel an existing order"""
	order = db.query(Order.id, Order.status).filter(
		Order.id == order_id,
		Order.customer_id == user_id
	).first()

	if not order:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Don hang khong ton tai")

	if order.status not in ("pending", "preparing"):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Khong the huy don hang da duoc xu ly"
		)

	# Use ORM
	item_rows = db.query(
		OrderItem.product_id,
		OrderItem.quantity
	).filter(OrderItem.order_id == order_id).all()

	# Use ORM to get store_id
	order_store = db.query(Order.store_id).filter(
		Order.id == order_id
	).first()
	store_id = order_store.store_id if order_store else 0

	for item in item_rows:
		# Use ORM
		lot = db.query(InventoryLot.id).filter(
			InventoryLot.product_id == item.product_id,
			InventoryLot.store_id == store_id,
			InventoryLot.qty_on_hand > 0
		).order_by(InventoryLot.expiry_date.asc()).first()

		if lot:
			# Use ORM .update()
			db.query(InventoryLot).filter(
				InventoryLot.id == lot.id
			).update(
				{InventoryLot.qty_on_hand: InventoryLot.qty_on_hand + item.quantity},
				synchronize_session=False
			)

	# Use ORM .update()
	db.query(Order).filter(Order.id == order_id).update(
		{Order.status: 'cancelled'},
		synchronize_session=False
	)
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
