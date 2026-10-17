import sys
import os
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from app.repositories.oracle_db import db

@pytest.fixture(scope="module")
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(scope="module")
def admin_token(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    assert res.status_code == 200
    return res.get_json()["token"]

@pytest.fixture(scope="module")
def staff_token(client):
    res = client.post("/api/auth/login", json={"username": "staff", "password": "Staff@123"})
    assert res.status_code == 200
    return res.get_json()["token"]

# 1. Authentication Tests
def test_login_success(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    assert res.status_code == 200
    data = res.get_json()
    assert "token" in data
    assert data["user"]["role"] == "ADMIN"

def test_login_invalid_password(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "WrongPassword"})
    assert res.status_code == 401

def test_login_missing_fields(client):
    res = client.post("/api/auth/login", json={"username": ""})
    assert res.status_code == 400

def test_protected_route_without_token(client):
    res = client.get("/api/products")
    assert res.status_code == 401

def test_staff_cannot_create_product(client, staff_token):
    res = client.post("/api/products", json={
        "product_name": "Unauthorized Product",
        "category_id": 1,
        "selling_price": 50.0
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert res.status_code == 403

# 2. Products & Category Tests
def test_list_products(client, admin_token):
    res = client.get("/api/products", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert "products" in data
    assert len(data["products"]) >= 30

def test_create_and_deactivate_product(client, admin_token):
    res = client.post("/api/products", json={
        "product_name": "Test Drumstick (Murungaikai)",
        "category_id": 1,
        "unit": "kg",
        "purchase_cost": 25.0,
        "selling_price": 40.0,
        "initial_stock": 20.0,
        "reorder_level": 5.0
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201
    prod = res.get_json()["product"]
    pid = int(prod["PRODUCT_ID"])
    assert float(prod["CURRENT_STOCK"]) == 20.0

    # Deactivate product
    del_res = client.delete(f"/api/products/{pid}", headers={"Authorization": f"Bearer {admin_token}"})
    assert del_res.status_code == 200

# 3. Validation: Reject Negative Quantity & Overselling
def test_reject_negative_quantity_sale(client, admin_token):
    res = client.post("/api/sales/daily", json={
        "sale_date": "2026-10-17",
        "items": [{"product_id": 1, "quantity": -5.0, "selling_price": 35.0}]
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 400

def test_reject_overselling_beyond_stock(client, admin_token):
    # Product 1 has stock ~45 kg, trying to sell 99999 kg must be rejected
    res = client.post("/api/sales/daily", json={
        "sale_date": "2026-10-17",
        "items": [{"product_id": 1, "quantity": 99999.0, "selling_price": 35.0}]
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 400
    err = res.get_json()["error"]
    assert "Insufficient stock" in err or "ORA-20014" in err

# 4. End-to-End Daily Sales Flow
def test_successful_sales_entry_and_stock_reduction(client, admin_token):
    # Check initial stock of Product 2 (Tomato Hybrid)
    p_before = client.get("/api/products/2", headers={"Authorization": f"Bearer {admin_token}"}).get_json()["product"]
    init_stock = float(p_before["CURRENT_STOCK"])

    # Sell 2 kg of Product 2
    sale_res = client.post("/api/sales/daily", json={
        "sale_date": "2026-10-17",
        "items": [{"product_id": 2, "quantity": 2.0, "selling_price": 32.0, "discount_amount": 0}],
        "notes": "Automated pytest sale"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert sale_res.status_code == 201
    sale_data = sale_res.get_json()["sale"]
    assert float(sale_data["TOTAL_REVENUE"]) == 64.0
    sale_id = int(sale_data["SALE_ID"])

    # Verify stock reduced by 2
    p_after = client.get("/api/products/2", headers={"Authorization": f"Bearer {admin_token}"}).get_json()["product"]
    assert float(p_after["CURRENT_STOCK"]) == init_stock - 2.0

    # Reverse the sale and verify stock is restored
    rev_res = client.post(f"/api/sales/{sale_id}/reverse", json={
        "reason": "Test reversal"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert rev_res.status_code == 200

    p_restored = client.get("/api/products/2", headers={"Authorization": f"Bearer {admin_token}"}).get_json()["product"]
    assert float(p_restored["CURRENT_STOCK"]) == init_stock

# 5. Wastage Recording & Inventory Reduction
def test_record_wastage(client, admin_token):
    p_before = client.get("/api/products/16", headers={"Authorization": f"Bearer {admin_token}"}).get_json()["product"]
    init_stock = float(p_before["CURRENT_STOCK"])

    waste_res = client.post("/api/inventory/wastage", json={
        "product_id": 16,
        "wastage_date": "2026-10-17",
        "quantity": 1.5,
        "reason": "Spoilage",
        "notes": "Test spoilage"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert waste_res.status_code == 201

    p_after = client.get("/api/products/16", headers={"Authorization": f"Bearer {admin_token}"}).get_json()["product"]
    assert float(p_after["CURRENT_STOCK"]) == init_stock - 1.5

# 6. Inventory Ledger Reconciliation
def test_inventory_reconciliation(client, admin_token):
    res = client.get("/api/inventory/reconcile", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert "reconciliation" in data

# 7. Dashboard & Analytics KPIs
def test_dashboard_kpis(client, admin_token):
    res = client.get("/api/analytics/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.get_json()
    kpis = data["kpis"]
    assert kpis["total_revenue"] > 0
    assert kpis["total_cogs"] > 0
    assert kpis["gross_profit"] == kpis["total_revenue"] - kpis["total_cogs"]
    assert kpis["inventory_valuation"] > 0

# 8. CSV Export
def test_csv_export(client, admin_token):
    res = client.get("/api/reports/export?type=daily-sales", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("Content-Type", "")
    assert b"SALE_DATE" in res.data
