# REST API Documentation

The backend REST API is built with Flask, returning JSON responses and enforcing JWT authentication with role-based permission checks.

Base URL: `http://localhost:5000/api`

---

## 1. Authentication & Users

### `POST /api/auth/login`
Authenticates a user and issues a signed JWT token.
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "Admin@123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Login successful.",
    "token": "<JWT_BEARER_TOKEN>",
    "user": {
      "user_id": 1,
      "username": "admin",
      "full_name": "Store Owner",
      "role": "ADMIN"
    }
  }
  ```

### `GET /api/auth/me`
Fetches currently authenticated user details.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):** User object.

### `GET /api/auth/users` (Admin Only)
Lists all registered shop accounts.

### `POST /api/auth/users` (Admin Only)
Creates a new staff or admin user account.
- **Request Body:** `username`, `password`, `full_name`, `role` (`ADMIN` or `STAFF`).

### `PUT /api/auth/users/<user_id>/status` (Admin Only)
Activates or deactivates a user account (`status`: `ACTIVE` | `INACTIVE`).

---

## 2. Product & Category Catalog

### `GET /api/products`
Retrieves all products with real-time stock and moving average costs.
- **Query Params:** `category_id`, `active_only` (default `true`), `search`.

### `POST /api/products` (Admin Only)
Creates a new retail product.
- **Request Body:**
  ```json
  {
    "product_code": "VEG-CAP-01",
    "product_name": "Capsicum Green",
    "category_id": 1,
    "unit": "kg",
    "selling_price": 60.00,
    "purchase_cost": 42.00,
    "opening_stock": 25.0,
    "reorder_level": 8.0,
    "preferred_supplier_id": 1
  }
  ```

### `PUT /api/products/<product_id>` (Admin Only)
Updates pricing, reorder thresholds, or supplier.

### `DELETE /api/products/<product_id>` (Admin Only)
Soft-deactivates product (`IS_ACTIVE = 0`), preserving all historical sales/purchases.

### `GET /api/categories`
Lists all active retail categories.

---

## 3. Daily Sales Entry & History

### `POST /api/sales/daily`
Fast table end-of-day sales batch entry. Supports draft and final submission. Validates for non-negative quantities and rejects overselling.
- **Request Body:**
  ```json
  {
    "sale_date": "2026-03-31",
    "status": "FINAL",
    "notes": "Daily closing batch",
    "items": [
      {
        "product_id": 1,
        "quantity": 18.5,
        "selling_price": 30.00
      },
      {
        "product_id": 2,
        "quantity": 12.0,
        "selling_price": 50.00
      }
    ]
  }
  ```
- **Response (201 Created):** Contains sale summary with committed revenue, COGS, and gross profit.

### `GET /api/sales`
Lists historical sales transactions with date filters.

### `GET /api/sales/<sale_id>`
Fetches line item breakdown of an individual sales batch.

### `POST /api/sales/<sale_id>/reverse` (Admin Only)
Reverses a finalized sale: restores inventory back to on-hand stock and writes reversal entries to `INVENTORY_MOVEMENTS`.

---

## 4. Inward Purchases

### `POST /api/purchases`
Records multi-item supplier shipments. Recalculates moving weighted-average costs atomically in Oracle PL/SQL.
- **Request Body:**
  ```json
  {
    "supplier_id": 1,
    "purchase_date": "2026-03-31",
    "notes": "Morning fresh delivery",
    "payment_status": "PAID",
    "items": [
      {
        "product_id": 1,
        "quantity": 50.0,
        "unit_cost": 18.00
      }
    ]
  }
  ```

### `GET /api/purchases`
Lists historical purchase orders.

### `POST /api/purchases/<purchase_id>/reverse` (Admin Only)
Reverses an inward shipment, deducting stock and posting `PURCHASE_REVERSAL`.

---

## 5. Inventory, Wastage & Reconciliation

### `GET /api/inventory`
Calculates inventory valuation per product and category using moving weighted-average cost.

### `GET /api/inventory/movements`
Journal query for perpetual double-entry movement ledger. Supports filter by `movement_type`, `product_id`, and date range.

### `POST /api/inventory/adjustments` (Admin Only)
Adjusts physical stock count following manual audit.
- **Request Body:** `product_id`, `new_stock`, `reason`.

### `GET /api/inventory/reconcile` (Admin Only)
Compares `PRODUCTS.CURRENT_STOCK` against `SUM(INVENTORY_MOVEMENTS.QUANTITY_CHANGE)`.

### `GET /api/inventory/low-stock`
Returns products below safety threshold with replenishment recommendations.

### `POST /api/inventory/wastage`
Records perishable spoilage, writing off cost and deducting stock.
- **Request Body:** `product_id`, `wastage_date`, `quantity`, `reason`, `notes`.

---

## 6. Operating Expenses & Reports

### `POST /api/expenses` (Admin Only)
Records store overheads (Rent, Electricity, Labor, Packaging).

### `GET /api/analytics/dashboard`
Returns 30-day KPIs: Total Revenue, COGS, Gross Profit, Wastage Loss, Net Profit, and sales trajectory.

### `GET /api/reports/export?type=<daily-sales|monthly-sales|products|categories|inventory|low-stock>`
Exports live data as a CSV stream for Power BI and Excel ingestion.
