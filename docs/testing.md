# Testing and Quality Assurance Documentation

## 1. Test Suite Architecture

The system features an automated Pytest test suite in `backend/tests/` verifying business constraints, transactional consistency, role-based authorization, and mathematical reconciliation directly against the live Oracle 10g database.

### Test Files
1. `tests/test_retail_system.py` (14 Core Business Integration Tests)
2. `tests/test_user_management.py` (4 User Provisioning & Authorization Tests)

---

## 2. Test Cases Overview

| Test Function | Target Module | Verification Objective |
|---|---|---|
| `test_health_and_oracle_connection` | Oracle Connector | Verifies pipe-delimited SQL*Plus bridge executes queries against Oracle 10g. |
| `test_admin_login` | Security & Auth | Verifies scrypt password verification and JWT token issuance. |
| `test_staff_login_and_unauthorized_endpoints` | RBAC Security | Ensures staff accounts cannot call admin-only routes (e.g. `POST /api/products`). |
| `test_list_products` | Products | Validates JSON list of 35+ products with categories, units, and stock numbers. |
| `test_create_product_admin` | Products | Confirms product creation with opening stock and ledger journal entry. |
| `test_overselling_validation` | Daily Sales | Ensures attempting to sell more than available physical stock is rejected with HTTP 400. |
| `test_record_daily_sales_deducts_stock` | Daily Sales | Verifies atomic line item insertion, stock reduction, and ledger posting. |
| `test_reverse_sale` | Sales History | Tests authorized reversal of a sale, verifying complete inventory restoration. |
| `test_record_purchase_updates_stock_and_cost` | Inward Purchases | Tests multi-item inward delivery, stock increment, and moving average cost calculation. |
| `test_record_wastage_deducts_stock` | Wastage | Confirms perishable spoilage write-off reduces stock and records financial loss. |
| `test_inventory_ledger_reconciliation` | Ledger Integrity | Tests `GET /api/inventory/reconcile` ensuring zero variance between ledger and stock. |
| `test_operating_expenses` | OPEX | Confirms operational overhead expense creation and summary aggregation. |
| `test_dashboard_kpis` | Analytics | Asserts 30-day KPI calculations (Revenue, COGS, Gross Profit, Net Profit). |
| `test_csv_export` | BI & Export | Asserts CSV stream headers and content-disposition for Power BI feeds. |
| `test_list_users_as_admin` | User Management | Verifies user list retrieval for shop admin. |
| `test_list_users_as_staff_forbidden` | User Management | Asserts HTTP 403 Forbidden when staff attempts to view personnel list. |
| `test_create_user_and_toggle_status` | User Management | Tests creating new cashier account and toggling active/inactive status. |
| `test_admin_cannot_deactivate_self` | Security Guardrail | Ensures admin cannot accidentally lock themselves out of the system. |

---

## 3. Running the Test Suite

To run all automated tests from the repository root:
```powershell
cd backend
pytest tests/ -v
```

Expected Output:
```text
============================= test session starts =============================
collected 18 items

tests\test_retail_system.py ..............                               [ 77%]
tests\test_user_management.py ....                                       [100%]

============================= 18 passed in 12.24s =============================
```

---

## 4. Frontend Build & Quality Checks

The frontend application was compiled and verified using Vite:
```powershell
cd frontend
npm run build
```
Result: Zero TypeScript/JSX syntax errors, all 2,572 modules compiled cleanly into `frontend/dist/`.
