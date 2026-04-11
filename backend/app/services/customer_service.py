from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.security import get_password_hash, verify_password
from app.services import discount_policy_service


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
	user = db.execute(
		text(
			"""
			SELECT id, username, email, full_name, phone, role, created_at
			FROM users
			WHERE id = :user_id AND role = 'customer'
			LIMIT 1
			"""
		),
		{"user_id": user_id},
	).first()

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

	existing = db.execute(
		text(
			"""
			SELECT id FROM users
			WHERE email = :email AND id != :user_id
			LIMIT 1
			"""
		),
		{"email": email, "user_id": user_id},
	).first()
	if existing:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email da duoc su dung")

	db.execute(
		text(
			"""
			UPDATE users
			SET full_name = :full_name,
				email = :email,
				phone = :phone
			WHERE id = :user_id AND role = 'customer'
			"""
		),
		{"full_name": full_name, "email": email, "phone": phone, "user_id": user_id},
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

	row = db.execute(
		text("SELECT password_hash FROM users WHERE id = :user_id AND role = 'customer' LIMIT 1"),
		{"user_id": user_id},
	).first()
	if not row:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay tai khoan")

	if not verify_password(current_password, row.password_hash):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Mat khau hien tai khong dung.",
		)

	db.execute(
		text(
			"UPDATE users SET password_hash = :password_hash WHERE id = :user_id"
		),
		{"password_hash": get_password_hash(new_password), "user_id": user_id},
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
	query = """
		SELECT DISTINCT
			p.id,
			p.name,
			p.sku,
			p.base_price,
			p.image_url,
			p.supermarket_id,
			c.id AS category_id,
			c.name AS category_name,
			s.id AS store_id,
			s.name AS store_name,
			il.expiry_date,
			il.qty_on_hand,
			il.lot_code
		FROM products p
		JOIN categories c ON c.id = p.category_id
		JOIN inventory_lots il ON il.product_id = p.id
		JOIN stores s ON s.id = il.store_id
		WHERE il.qty_on_hand > 0
		  AND il.expiry_date >= CURDATE()
	"""
	params = {}

	if supermarket_id:
		query += " AND p.supermarket_id = :supermarket_id"
		params["supermarket_id"] = supermarket_id

	if category_id:
		query += " AND p.category_id = :category_id"
		params["category_id"] = category_id

	if search:
		query += " AND (p.name LIKE :search OR p.sku LIKE :search)"
		params["search"] = f"%{search}%"

	query += " ORDER BY il.expiry_date ASC, p.name ASC LIMIT 100"

	rows = db.execute(text(query), params).all()

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
	rows = db.execute(
		text(
			"""
			SELECT DISTINCT
				p.id,
				p.name,
				p.sku,
				p.base_price,
				p.image_url,
				c.id AS category_id,
				c.name AS category_name,
				sm.id AS supermarket_id,
				sm.name AS supermarket_name,
				admin.phone AS supermarket_phone
			FROM products p
			LEFT JOIN categories c ON c.id = p.category_id
			LEFT JOIN supermarkets sm ON sm.id = p.supermarket_id
			LEFT JOIN users admin
			  ON admin.id = (
					SELECT u2.id
					FROM users u2
					WHERE u2.supermarket_id = sm.id
					  AND u2.role = 'supermarket_admin'
					ORDER BY u2.id
					LIMIT 1
			  )
			WHERE p.id = :product_id
			LIMIT 1
			"""
		),
		{"product_id": product_id},
	).first()

	if not rows:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="San pham khong ton tai")

	row = _dict_row(rows)

	inventory_rows = db.execute(
		text(
			"""
			SELECT
				il.lot_code,
				il.expiry_date,
				il.qty_on_hand,
				s.name AS store_name,
				s.location AS store_address
			FROM inventory_lots il
			JOIN stores s ON s.id = il.store_id
			WHERE il.product_id = :product_id
			  AND il.qty_on_hand > 0
			  AND il.expiry_date >= CURDATE()
			ORDER BY il.expiry_date ASC
			"""
		),
		{"product_id": product_id},
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
		"supermarketPhone": row["supermarket_phone"] or "",
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

	query = """
		SELECT
			p.id,
			p.name,
			p.sku,
			p.base_price,
			p.image_url,
			p.supermarket_id,
			c.name AS category_name,
			s.name AS store_name,
			il.expiry_date,
			il.qty_on_hand,
			il.lot_code
		FROM products p
		JOIN categories c ON c.id = p.category_id
		JOIN inventory_lots il ON il.product_id = p.id
		JOIN stores s ON s.id = il.store_id
		WHERE il.qty_on_hand > 0
		  AND il.expiry_date >= CURDATE()
		  AND il.expiry_date <= :cutoff_date
	"""
	params = {"cutoff_date": cutoff_date}

	if supermarket_id:
		query += " AND p.supermarket_id = :supermarket_id"
		params["supermarket_id"] = supermarket_id

	query += " ORDER BY il.expiry_date ASC, p.name ASC LIMIT 50"

	rows = db.execute(text(query), params).all()

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
	query = """
		SELECT DISTINCT c.id, c.name
		FROM categories c
		JOIN products p ON p.category_id = c.id
		JOIN inventory_lots il ON il.product_id = p.id
		WHERE il.qty_on_hand > 0 AND il.expiry_date >= CURDATE()
	"""
	params = {}

	if supermarket_id:
		query += " AND p.supermarket_id = :supermarket_id"
		params["supermarket_id"] = supermarket_id

	query += " ORDER BY c.name ASC"

	rows = db.execute(text(query), params).all()

	items = [{"id": row.id, "name": row.name} for row in rows]
	return {"items": items}


def list_customer_supermarkets(db: Session) -> dict:
	"""List all active supermarkets"""
	rows = db.execute(
		text(
			"""
			SELECT s.id, s.name, admin.phone, admin.address
			FROM supermarkets s
			LEFT JOIN users admin
			  ON admin.id = (
					SELECT u2.id
					FROM users u2
					WHERE u2.supermarket_id = s.id
					  AND u2.role = 'supermarket_admin'
					ORDER BY u2.id
					LIMIT 1
			  )
			ORDER BY s.name ASC
			"""
		),
	).all()

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
	query = """
		SELECT
			o.id,
			o.status,
			o.total_amount,
			o.payment_method,
			o.payment_status,
			o.created_at,
			s.name AS store_name,
			s.location AS store_address
		FROM orders o
		JOIN stores s ON s.id = o.store_id
		WHERE o.customer_id = :user_id
	"""
	params = {"user_id": user_id}

	if status_filter != "all":
		query += " AND o.status = :status_filter"
		params["status_filter"] = status_filter

	query += " ORDER BY o.created_at DESC LIMIT 50"

	rows = db.execute(text(query), params).all()

	items = []
	for row in rows:
		item_rows = db.execute(
			text(
				"""
				SELECT
					oi.quantity,
					oi.unit_price,
					p.name AS product_name
				FROM order_items oi
				JOIN products p ON p.id = oi.product_id
				WHERE oi.order_id = :order_id
				"""
			),
			{"order_id": row.id},
		).all()

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
	order = db.execute(
		text(
			"""
			SELECT
				o.id,
				o.status,
				o.total_amount,
				o.payment_method,
				o.payment_status,
				o.created_at,
				s.name AS store_name,
				s.location AS store_address
			FROM orders o
			JOIN stores s ON s.id = o.store_id
			WHERE o.id = :order_id AND o.customer_id = :user_id
			LIMIT 1
			"""
		),
		{"order_id": order_id, "user_id": user_id},
	).first()

	if not order:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Don hang khong ton tai")

	item_rows = db.execute(
		text(
			"""
			SELECT
				oi.quantity,
				oi.unit_price,
				p.name AS product_name,
				il.lot_code,
				il.expiry_date
			FROM order_items oi
			JOIN products p ON p.id = oi.product_id
			LEFT JOIN inventory_lots il ON il.product_id = p.id
			WHERE oi.order_id = :order_id
			"""
		),
		{"order_id": order_id},
	).all()

	delivery_row = db.execute(
		text(
			"""
			SELECT d.status, d.delivery_code, d.picked_at, d.delivered_at
			FROM deliveries d
			WHERE d.order_id = :order_id
			LIMIT 1
			"""
		),
		{"order_id": order_id},
	).first()

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
	payment_method: str = "cod"
) -> dict:
	"""Create a new order"""
	if not items or len(items) == 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gio hang trong")

	if not store_id:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chua chon cua hang")

	user = db.execute(
		text("SELECT id FROM users WHERE id = :id AND role = 'customer' LIMIT 1"),
		{"id": user_id},
	).first()
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khach hang khong ton tai")

	total_amount = Decimal("0")
	for item in items:
		product_id = item.get("productId")
		quantity = item.get("quantity", 1)
		lot_code = item.get("lotCode")

		if not product_id or quantity <= 0:
			continue

		if lot_code:
			lot = db.execute(
				text(
					"""
					SELECT id, qty_on_hand, expiry_date, product_id
					FROM inventory_lots
					WHERE lot_code = :lot_code AND store_id = :store_id
					LIMIT 1
					"""
				),
				{"lot_code": lot_code, "store_id": store_id},
			).first()
		else:
			lot = db.execute(
				text(
					"""
					SELECT id, qty_on_hand, expiry_date, product_id
					FROM inventory_lots
					WHERE product_id = :product_id AND store_id = :store_id AND qty_on_hand > 0
					ORDER BY expiry_date ASC
					LIMIT 1
					"""
				),
				{"product_id": product_id, "store_id": store_id},
			).first()

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

		product = db.execute(
			text("SELECT base_price FROM products WHERE id = :id LIMIT 1"),
			{"id": product_id},
		).first()

		if product:
			base_price = float(product.base_price or 0)
			sale_price, _ = _calculate_discount(base_price, lot.expiry_date, None, product_id, None)
			total_amount += Decimal(str(int(sale_price * quantity)))

	result = db.execute(
		text(
			"""
			INSERT INTO orders (store_id, customer_id, status, total_amount, payment_method, payment_status)
			VALUES (:store_id, :customer_id, 'pending', :total_amount, :payment_method, 'pending')
			"""
		),
		{
			"store_id": store_id,
			"customer_id": user_id,
			"total_amount": total_amount,
			"payment_method": payment_method,
		},
	)
	order_id = result.lastrowid

	for item in items:
		product_id = item.get("productId")
		quantity = item.get("quantity", 1)
		lot_code = item.get("lotCode")

		if not product_id or quantity <= 0:
			continue

		if lot_code:
			lot = db.execute(
				text(
					"""
					SELECT id, qty_on_hand, expiry_date, product_id
					FROM inventory_lots
					WHERE lot_code = :lot_code AND store_id = :store_id
					LIMIT 1
					"""
				),
				{"lot_code": lot_code, "store_id": store_id},
			).first()
		else:
			lot = db.execute(
				text(
					"""
					SELECT id, qty_on_hand, expiry_date, product_id
					FROM inventory_lots
					WHERE product_id = :product_id AND store_id = :store_id AND qty_on_hand > 0
					ORDER BY expiry_date ASC
					LIMIT 1
					"""
				),
				{"product_id": product_id, "store_id": store_id},
			).first()

		if lot:
			base_price = db.execute(
				text("SELECT base_price FROM products WHERE id = :id LIMIT 1"),
				{"id": product_id},
			).first()
			unit_price, _ = _calculate_discount(float(base_price.base_price or 0), lot.expiry_date, None, product_id, db)

			db.execute(
				text(
					"""
					INSERT INTO order_items (order_id, product_id, quantity, unit_price)
					VALUES (:order_id, :product_id, :quantity, :unit_price)
					"""
				),
				{
					"order_id": order_id,
					"product_id": product_id,
					"quantity": quantity,
					"unit_price": unit_price,
				},
			)

			db.execute(
				text(
					"""
					UPDATE inventory_lots
					SET qty_on_hand = qty_on_hand - :quantity
					WHERE id = :id
					"""
				),
				{"quantity": quantity, "id": int(lot.id)},
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
	order = db.execute(
		text(
			"""
			SELECT id, status FROM orders
			WHERE id = :order_id AND customer_id = :user_id
			LIMIT 1
			"""
		),
		{"order_id": order_id, "user_id": user_id},
	).first()

	if not order:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Don hang khong ton tai")

	if order.status not in ("pending", "preparing"):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Khong the huy don hang da duoc xu ly"
		)

	item_rows = db.execute(
		text("SELECT product_id, quantity FROM order_items WHERE order_id = :order_id"),
		{"order_id": order_id},
	).all()

	store_id_row = db.execute(
		text("SELECT store_id FROM orders WHERE id = :order_id LIMIT 1"),
		{"order_id": order_id},
	).first()

	for item in item_rows:
		lot = db.execute(
			text(
				"""
				SELECT id FROM inventory_lots
				WHERE product_id = :product_id AND store_id = :store_id AND qty_on_hand > 0
				ORDER BY expiry_date ASC
				LIMIT 1
				"""
			),
			{"product_id": item.product_id, "store_id": store_id_row.store_id if store_id_row else 0},
		).first()

		if lot:
			db.execute(
				text(
					"UPDATE inventory_lots SET qty_on_hand = qty_on_hand + :quantity WHERE id = :id"
				),
				{"quantity": item.quantity, "id": int(lot.id)},
			)

	db.execute(
		text("UPDATE orders SET status = 'cancelled' WHERE id = :order_id"),
		{"order_id": order_id},
	)
	db.commit()

	return {"success": True, "message": "Huy don hang thanh cong"}


def customer_dashboard_summary(db: Session, user_id: int) -> dict:
	"""Get customer dashboard summary"""
	total_orders = db.execute(
		text("SELECT COUNT(*) FROM orders WHERE customer_id = :user_id"),
		{"user_id": user_id},
	).scalar() or 0

	pending_orders = db.execute(
		text(
			"SELECT COUNT(*) FROM orders WHERE customer_id = :user_id AND status IN ('pending', 'preparing')"
		),
		{"user_id": user_id},
	).scalar() or 0

	completed_orders = db.execute(
		text("SELECT COUNT(*) FROM orders WHERE customer_id = :user_id AND status = 'completed'"),
		{"user_id": user_id},
	).scalar() or 0

	total_spent = db.execute(
		text(
			"SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_id = :user_id AND status = 'completed'"
		),
		{"user_id": user_id},
	).scalar() or 0

	return {
		"totalOrders": int(total_orders),
		"pendingOrders": int(pending_orders),
		"completedOrders": int(completed_orders),
		"totalSpent": float(total_spent),
	}
