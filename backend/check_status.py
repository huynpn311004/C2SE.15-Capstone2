from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SHOW COLUMNS FROM orders LIKE 'status'"))
    row = result.fetchone()
    print(f"Status column: {row}")
