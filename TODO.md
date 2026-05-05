# Fix Multi-Store Order: lot_id NULL Error
## Status: Planning Complete ✅

### Problem
- `IntegrityError(1048)`: Column 'lot_id' cannot be null in order_items table
- Happens during POST /api/customer/orders/multi-store
- OrderItem created without `lot_id` despite finding InventoryLot for stock reservation

### Root Cause (Analyzed)
```
backend/app/services/order_service.py::create_customer_order()
Line ~130: Finds lot = InventoryLot for stock check
Line ~134: Creates OrderItem WITHOUT lot_id=lot.id 
→ SQL: INSERT ... lot_id=None → MySQL rejects (nullable=False)
```

### Files Analyzed
- ✅ `backend/app/services/order_service.py` (primary)
- ✅ `backend/app/routers/customer.py` (endpoint)
- ✅ `backend/app/models/order_item.py` (schema: lot_id NOT NULL)

### Fix Plan (1 File)
**Target**: `backend/app/services/order_service.py`

**Edit Location**: `create_customer_order()` function, inside items loop (~line 130)

**Before**:
```python
order_item = OrderItem(
    order_id=order.id,
    product_id=pid,
    quantity=q,
    unit_price=price
)
```

**After**:
```python
order_item = OrderItem(
    order_id=order.id,
    lot_id=lot.id,  # ← ADD THIS
    product_id=pid,
    quantity=q,
    unit_price=price
)
```

### Steps to Complete
- [ ] **Step 1**: Apply edit_file to order_service.py
- [ ] **Step 2**: Test multi-store order creation
- [ ] **Step 3**: Verify order_items table has lot_id populated
- [ ] **Step 4**: Complete task

### Post-Fix Validation
```
1. cd backend && uvicorn app.main:app --reload
2. POST /api/customer/orders/multi-store with cart items
3. Expected: 200 OK, orders created successfully
4. Check DB: SELECT * FROM order_items WHERE lot_id IS NOT NULL;
```

**Next**: Proceed to Step 1 (edit_file)

