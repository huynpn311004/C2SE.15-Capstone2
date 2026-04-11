# 🎯 Phương Án 3: Chính Sách Giảm Giá Theo 3 Mức (Implementation Complete)

## 📋 Tổng Quan

Hệ thống giảm giá đã được nâng cấp để hỗ trợ **3 mức ưu tiên** (3-level priority):
1. **Sản phẩm cụ thể** (Product-specific) - Mức cao nhất
2. **Danh mục** (Category) - Mức trung bình
3. **Mặc định siêu thị** (Supermarket default) - Mức thấp nhất

### ✅ Ưu Điểm
- ✨ **Dễ quản lý**: Admin đặt chính sách 1 lần, áp cho hàng loạt sản phẩm
- 🎯 **Linh hoạt**: Có thể override riêng cho sản phẩm đặc biệt
- 📊 **Scalable**: Từ 100 đến 10,000+ sản phẩm không vấn đề
- 🔄 **Hiệu quả**: Logic rõ ràng, dễ maintain

---

## 🗄️ Database Schema

### Thêm Cột Vào `discount_policies` Table

```sql
ALTER TABLE discount_policies
ADD COLUMN category_id BIGINT NULL,
ADD COLUMN product_id BIGINT NULL;

-- Thêm Foreign Keys
ALTER TABLE discount_policies
ADD CONSTRAINT fk_discount_policies_category_id
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;

ALTER TABLE discount_policies
ADD CONSTRAINT fk_discount_policies_product_id
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
```

> **Lưu ý**: Ứng dụng sẽ tự động thêm các cột này khi khởi động lần đầu tiên (xem `app/__init__.py`).

---

## 🔧 Backend Implementation

### 1. **Model Update** (`app/models/discount_policy.py`)

```python
class DiscountPolicy(Base):
    __tablename__ = "discount_policies"
    
    id: Mapped[int] = mapped_column(...)
    supermarket_id: Mapped[int] = ...
    category_id: Mapped[int | None] = ...  # ✨ NEW
    product_id: Mapped[int | None] = ...   # ✨ NEW
    name: Mapped[str] = ...
    min_days_left: Mapped[int] = ...
    max_days_left: Mapped[int] = ...
    discount_percent: Mapped[Decimal] = ...
    is_active: Mapped[bool] = ...
```

### 2. **Service Logic** (`app/services/discount_policy_service.py`)

#### **calculate_discount() - 3-Level Priority**

```python
def calculate_discount(
    db: Session,
    base_price: float,
    expiry_date: str,
    supermarket_id: int | None = None,
    product_id: int | None = None,  # ✨ NEW
) -> dict:
    """
    Ưu tiên:
    1. Kiểm tra policy của SẢN PHẨM CỤ THỂ
    2. Nếu không có → Kiểm tra policy của DANH MỤC
    3. Nếu không có → Kiểm tra policy SUPERMARKET DEFAULT
    4. Không có gì → Trả về 0% discount
    """
    days_left = (expiry_date - today).days
    
    # LEVEL 1: Product-specific
    policy = SELECT * FROM discount_policies
             WHERE product_id = ? AND is_active = 1
             AND min_days_left <= days_left <= max_days_left
    if policy:
        return apply_discount(base_price, policy.discount_percent, "product")
    
    # LEVEL 2: Category
    category_id = GET category FROM products WHERE id = product_id
    policy = SELECT * FROM discount_policies
             WHERE category_id = ? AND is_active = 1
             AND min_days_left <= days_left <= max_days_left
    if policy:
        return apply_discount(base_price, policy.discount_percent, "category")
    
    # LEVEL 3: Supermarket Default
    policy = SELECT * FROM discount_policies
             WHERE supermarket_id = ? 
             AND category_id IS NULL AND product_id IS NULL
             AND is_active = 1 AND min_days_left <= days_left <= max_days_left
    if policy:
        return apply_discount(base_price, policy.discount_percent, "supermarket_default")
    
    # No policy
    return {"discountPercent": 0, "finalPrice": base_price, "appliedLevel": "none"}
```

### 3. **CRUD Operations**

#### Create Policy
```python
def create_discount_policy(
    supermarket_id: int,
    name: str,
    min_days: int,
    max_days: int,
    discount: float,
    category_id: int | None = None,  # ✨ Optional
    product_id: int | None = None,   # ✨ Optional
    is_active: bool = True,
) -> dict:
```

**Quy tắc**:
- Chỉ set **HOẶC** `category_id` **HOẶC** `product_id`, không phải cả hai
- Nếu cả hai đều `None`, policy áp dụng cho **tất cả sản phẩm** (default)

#### Update Policy
Tương tự như `create`, có thể update `category_id` hoặc `product_id`

---

## 🎨 Frontend Implementation

### **PolicyConfiguration.jsx** - Admin Page

#### **Form States**
```javascript
const [form, setForm] = useState({
    name: '',
    minDaysLeft: '',
    maxDaysLeft: '',
    discountPercent: '',
    categoryId: '',      // ✨ NEW
    productId: '',       // ✨ NEW
    applyType: 'all',    // 'all' | 'category' | 'product'
})
```

#### **UI Features**
1. **Radio Buttons** để chọn loại áp dụng
   - Tất cả sản phẩm (default)
   - Danh mục cụ thể
   - Sản phẩm cụ thể

2. **Conditional Select Dropdowns**
   - Nếu `applyType = 'category'` → Hiển thị dropdown danh mục
   - Nếu `applyType = 'product'` → Hiển thị dropdown sản phẩm

3. **Table Columns**
   - Thêm cột "ÁP DỤNG CHO" để hiển thị `appliesTo`
   - Ví dụ: "Rau xanh", "Xà phòng tươi", "Tất cả sản phẩm"

#### **API Calls**
```javascript
const payload = {
    name: 'Giảm giá rau xanh sắp hết hạn',
    minDaysLeft: 1,
    maxDaysLeft: 7,
    discountPercent: 50,
    categoryId: 5,      // ✨ Nếu áp dụng cho danh mục
    productId: null,    // ✨ Nếu không áp dụng cho sản phẩm cụ thể
}

await createDiscountPolicy(payload)
```

---

## 📊 Ví Dụ Thực Tế

### Scenario: Quản Lý Giảm Giá Cho Rau Xanh

#### **Setup**
1. **Create Policy 1**: Danh mục "Rau xanh" (ID=5)
   - Min-Max days: 9-7, Discount: 0%
   - Min-Max days: 6-4, Discount: 30%
   - Min-Max days: 3-1, Discount: 50%

2. **Create Policy 2**: Sản phẩm "Xà phòng tươi Đà Lạt" (ID=123) - Override
   - Min-Max days: 3-1, Discount: 70% (cao hơn category default 50%)

#### **Execution**

| Sản phẩm | Hạn | Ngày Còn | Policy Áp Dụng | Discount |
|----------|-----|---------|----------------|----------|
| Rau cong | 2025-04-15 | 5 ngày | Category (Rau xanh) | 30% |
| Xà phòng | 2025-04-13 | 3 ngày | **Product** (Override) | **70%** |
| Cải bó | 2025-04-12 | 2 ngày | Category (Rau xanh) | 50% |

### Calculation Example

**Sản phẩm Xà phòng tươi:**
```
Base Price: 100,000 VNĐ
Expiry Date: 2025-04-13
Days Left: 3 ngày

Priority Check:
1. ✅ Product-specific policy found (ID=123)
   → Discount: 70%
2. Apply discount:
   - Discount Amount: 100,000 × 70% = 70,000
   - Final Price: 100,000 - 70,000 = 30,000 VNĐ

Response:
{
  "discountPercent": 70,
  "originalPrice": 100000,
  "discountAmount": 70000,
  "finalPrice": 30000,
  "appliedLevel": "product"  // ← Shows which level was applied
}
```

---

## 🔌 API Endpoints

### Create Policy
```
POST /api/discount-policy
?user_id=1&name=...&min_days=1&max_days=7&discount=50
&category_id=5&product_id=&is_active=true
```

### Update Policy
```
PUT /api/discount-policy/{policy_id}
?user_id=1&name=...&min_days=1&max_days=7&discount=50
&category_id=5&product_id=
```

### List Policies
```
GET /api/discount-policy?user_id=1&supermarket_id=2

Response:
{
  "items": [
    {
      "id": 1,
      "name": "Giảm giá rau xanh",
      "minDaysLeft": 1,
      "maxDaysLeft": 7,
      "discountPercent": 50,
      "categoryId": 5,
      "categoryName": "Rau xanh",
      "productId": null,
      "productName": null,
      "appliesTo": "Rau xanh",  // ← Key field
      "isActive": true
    },
    ...
  ]
}
```

### Calculate Discount
```
GET /api/discount-policy/calculate
?base_price=100000&expiry_date=2025-04-13
&supermarket_id=2&product_id=123

Response:
{
  "discountPercent": 70,
  "originalPrice": 100000,
  "discountAmount": 70000,
  "finalPrice": 30000,
  "appliedLevel": "product"  // ← product | category | supermarket_default | none
}
```

---

## 📁 Modified Files

### Backend
- ✅ `app/models/discount_policy.py` - Model update
- ✅ `app/services/discount_policy_service.py` - Business logic
- ✅ `app/services/customer_service.py` - Calculation integration
- ✅ `app/routers/discount_policy.py` - API endpoints
- ✅ `app/schemas/discount_policy_schemas.py` - Request/Response schemas
- ✅ `app/__init__.py` - Database migration handling

### Frontend
- ✅ `frontend/src/pages/supermarketadmin/PolicyConfiguration.jsx` - UI
- ✅ `frontend/src/pages/supermarketadmin/PolicyConfiguration.css` - Styling
- ✅ `frontend/src/services/discountPolicyApi.js` - API client

---

## 🚀 Deployment Checklist

- [x] Update database models
- [x] Add migration logic to `app/__init__.py`
- [x] Implement 3-level priority in `calculate_discount()`
- [x] Update CRUD endpoints
- [x] Add validation (only one of category/product)
- [x] Update schemas
- [x] Build UI with radio buttons & dropdowns
- [x] Update API client
- [x] Test calculate_discount with all 3 levels
- [x] Test edge cases (no matching policy)

---

## 🧪 Testing Scenarios

### Test 1: Product Override
```
1. Create category policy: Category "Rau xanh" → 50% discount
2. Create product policy: Product "Xà phòng" → 70% discount
3. Call calculate_discount(product_id=123, supermarket_id=2)
4. Expected: 70% (product level wins)
```

### Test 2: Category Fallback
```
1. Create category policy: Category "Rau xanh" → 50% discount
2. Call calculate_discount(product_id=999, supermarket_id=2)
3. Expected: 50% (category level)
```

### Test 3: Supermarket Default
```
1. Create default policy: Supermarket default → 30% discount
2. Call calculate_discount(product_id=999, supermarket_id=2)
3. Expected: 30% (default level)
```

### Test 4: No Policy Match
```
1. Create policy: Min=5 days, Max=7 days
2. Call calculate_discount with Days Left = 10
3. Expected: 0% (no match)
```

---

## 🔍 Monitoring & Maintenance

### Check Active Policies
```python
# SQL query
SELECT name, category_id, c.name as category_name, product_id, p.name as product_name
FROM discount_policies dp
LEFT JOIN categories c ON c.id = dp.category_id
LEFT JOIN products p ON p.id = dp.product_id
WHERE is_active = 1 AND supermarket_id = 2
ORDER BY discount_percent DESC;
```

### Disable/Enable Policy
- UI có button "Tắt/Bật" chính sách
- EndPoint: `PATCH /api/discount-policy/{policy_id}/toggle`

---

## 📞 Support

Nếu có vấn đề:
- Check `appliedLevel` trong response để debug
- Verify `category_id` và `product_id` không cùng set
- Ensure product có `category_id` khi dùng category policy

---

**Implementation Date**: April 10, 2026  
**Status**: ✅ Complete & Ready for Testing
