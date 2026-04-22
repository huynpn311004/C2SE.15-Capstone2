"""Audit action constants for tracking store operations.

Use these constants as values for the `action` field in AuditLog records.
This avoids typos and makes filtering/querying logs consistent.
"""

# Product actions
CREATE_PRODUCT = "CREATE_PRODUCT"
UPDATE_PRODUCT = "UPDATE_PRODUCT"
DELETE_PRODUCT = "DELETE_PRODUCT"
UPDATE_PRICE   = "UPDATE_PRICE"
UPDATE_STOCK   = "UPDATE_STOCK"

# Order actions
CREATE_ORDER       = "CREATE_ORDER"
CANCEL_ORDER       = "CANCEL_ORDER"
UPDATE_ORDER_STATUS = "UPDATE_ORDER_STATUS"

# All actions (useful for validation/enum-like patterns)
ALL_ACTIONS = frozenset({
    CREATE_PRODUCT,
    UPDATE_PRODUCT,
    DELETE_PRODUCT,
    UPDATE_PRICE,
    UPDATE_STOCK,
    CREATE_ORDER,
    CANCEL_ORDER,
    UPDATE_ORDER_STATUS,
})

# Entity type constants
ENTITY_PRODUCT = "product"
ENTITY_ORDER   = "order"
