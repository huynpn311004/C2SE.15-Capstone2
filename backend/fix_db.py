import pymysql

conn = pymysql.connect(
    host='localhost',
    user='root',
    password='785619',
    database='seims_db'
)
cur = conn.cursor()
cur.execute("ALTER TABLE orders ADD COLUMN delivery_distance FLOAT NULL")
conn.commit()
print("Column delivery_distance added successfully!")
conn.close()
