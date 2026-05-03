import pymysql

conn = pymysql.connect(
    host='localhost',
    user='root',
    password='123456',
    database='seims'
)
cursor = conn.cursor()
cursor.execute("""
    ALTER TABLE orders MODIFY COLUMN status 
    ENUM('pending', 'preparing', 'ready', 'completed', 'cancelled', 'multi_store_pending', 'expired') 
    NOT NULL DEFAULT 'pending'
""")
conn.commit()
print('Done! expired status added.')
conn.close()
