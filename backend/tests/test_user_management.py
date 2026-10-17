import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from app.auth.security import generate_token


@pytest.fixture
def app():
    app = create_app()
    app.config["TESTING"] = True
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def admin_token():
    return generate_token(1, "admin", "ADMIN")

@pytest.fixture
def staff_token():
    return generate_token(2, "staff", "STAFF")

def test_list_users_as_admin(client, admin_token):
    res = client.get("/api/auth/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert "users" in data
    assert len(data["users"]) >= 2

def test_list_users_as_staff_forbidden(client, staff_token):
    res = client.get("/api/auth/users", headers={"Authorization": f"Bearer {staff_token}"})
    assert res.status_code == 403

def test_create_user_and_toggle_status(client, admin_token):
    import time
    username = f"cashier_{int(time.time())}"
    res = client.post("/api/auth/users", json={
        "username": username,
        "password": "Password@123",
        "full_name": "Test Cashier",
        "role": "STAFF"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201
    created = res.get_json()["user"]
    user_id = created["USER_ID"]

    # Deactivate
    res_toggle = client.put(f"/api/auth/users/{user_id}/status", json={"status": "INACTIVE"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_toggle.status_code == 200
    assert res_toggle.get_json()["user"]["STATUS"] == "INACTIVE"

    # Reactivate
    res_toggle2 = client.put(f"/api/auth/users/{user_id}/status", json={"status": "ACTIVE"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_toggle2.status_code == 200
    assert res_toggle2.get_json()["user"]["STATUS"] == "ACTIVE"

def test_admin_cannot_deactivate_self(client, admin_token):
    res = client.put("/api/auth/users/1/status", json={"status": "INACTIVE"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 400
    assert "cannot deactivate their own account" in res.get_json()["error"]
