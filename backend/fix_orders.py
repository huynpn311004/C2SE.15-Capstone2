"""
Script để update total_amount của các đơn hàng cũ:
- Thêm shipping_fee vào total_amount
- Chạy script này 1 lần duy nhất để fix đơn hàng cũ
"""
import pymysql
import sys

try:
    from dotenv import load_dotenv
    import os
    load_dotenv()
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '785619')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_NAME = os.getenv('DB_NAME', 'seims_db')
except:
    DB_USER = 'root'
    DB_PASSWORD = '785619'
    DB_HOST = 'localhost'
    DB_PORT = 3306
    DB_NAME = 'seims_db'

conn = pymysql.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASSWORD,
    port=DB_PORT,
    database=DB_NAME
)
cur = conn.cursor()

# Update: total_amount = total_amount + shipping_fee cho đơn hàng có shipping_fee > 0
# Chỉ update những đơn hàng chưa được update (shipping_fee > 0 nhưng total_amount chưa có ship)
cur.execute("""
    UPDATE orders
    SET total_amount = total_amount + COALESCE(shipping_fee, 0)
    WHERE shipping_fee > 0
    AND total_amount < COALESCE(shipping_fee, 0) + (
        SELECT SUM(unit_price * quantity) FROM order_items WHERE order_items.order_id = orders.id
    )
""")

affected = cur.rowcount
conn.commit()
print(f"Đã update {affected} đơn hàng!")

# Kiểm tra
cur.execute("""
    SELECT id, total_amount, shipping_fee,
           (SELECT SUM(unit_price * quantity) FROM order_items WHERE order_items.order_id = orders.id) as product_total
    FROM orders
    WHERE shipping_fee > 0
    LIMIT 10
""")
rows = cur.fetchall()
print("\nMẫu đơn hàng sau khi update:")
print(f"{'ID':<6} {'Tổng cộng':<15} {'Phí ship':<12} {'Tiền sp':<12} {'Đúng?'}")
print("-" * 60)
for row in rows:
    total, ship, product = row[1], row[2], row[3]
    expected = (product or 0) + (ship or 0)
    correct = "✓" if abs(total - expected) < 0.01 else "✗"
    print(f"{row[0]:<6} {total:<15} {ship:<12} {product:<12} {correct}")

conn.close()
