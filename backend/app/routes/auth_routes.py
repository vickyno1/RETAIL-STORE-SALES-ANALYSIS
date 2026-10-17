from flask import Blueprint, request, jsonify, g
from app.auth.security import hash_password, verify_password, generate_token, jwt_required, admin_required
from app.repositories.user_repo import UserRepo

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    user = UserRepo.get_by_username(username)
    if not user or not verify_password(password, user["PASSWORD_HASH"]):
        return jsonify({"error": "Invalid username or password."}), 401

    if user["STATUS"] != "ACTIVE":
        return jsonify({"error": "This account has been disabled."}), 403

    token = generate_token(user["USER_ID"], user["USERNAME"], user["ROLE"])
    return jsonify({
        "message": "Login successful.",
        "token": token,
        "user": {
            "user_id": user["USER_ID"],
            "username": user["USERNAME"],
            "full_name": user["FULL_NAME"],
            "role": user["ROLE"]
        }
    })

@auth_bp.route("/me", methods=["GET"])
@jwt_required
def me():
    user = UserRepo.get_by_id(g.current_user["user_id"])
    if not user:
        return jsonify({"error": "User not found."}), 404
    return jsonify({
        "user_id": user["USER_ID"],
        "username": user["USERNAME"],
        "full_name": user["FULL_NAME"],
        "role": user["ROLE"],
        "status": user["STATUS"],
        "created_at": user["CREATED_AT"]
    })

@auth_bp.route("/logout", methods=["POST"])
def logout():
    # Client drops JWT token
    return jsonify({"message": "Logged out successfully."})

@auth_bp.route("/users", methods=["GET"])
@jwt_required
@admin_required
def list_users():
    users = UserRepo.list_all()
    return jsonify({"users": users, "total": len(users)})

@auth_bp.route("/users", methods=["POST"])
@jwt_required
@admin_required
def create_user():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password", "")
    full_name = (data.get("full_name") or "").strip()
    role = (data.get("role") or "").strip().upper()

    if not username or not password or not full_name:
        return jsonify({"error": "Username, password, and full name are required."}), 400

    if role not in ["ADMIN", "STAFF"]:
        return jsonify({"error": "Role must be ADMIN or STAFF."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    existing = UserRepo.get_by_username(username)
    if existing:
        return jsonify({"error": f"Username '{username}' already exists."}), 409

    pwd_hash = hash_password(password)
    user = UserRepo.create_user(username, pwd_hash, full_name, role)
    return jsonify({"message": "User created successfully.", "user": user}), 201

@auth_bp.route("/users/<int:user_id>/status", methods=["PUT"])
@jwt_required
@admin_required
def update_user_status(user_id):
    data = request.get_json() or {}
    status = (data.get("status") or "").strip().upper()
    if status not in ["ACTIVE", "INACTIVE"]:
        return jsonify({"error": "Status must be ACTIVE or INACTIVE."}), 400

    if user_id == g.current_user["user_id"] and status == "INACTIVE":
        return jsonify({"error": "Administrators cannot deactivate their own account."}), 400

    updated = UserRepo.update_status(user_id, status)
    if not updated:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"message": "User status updated.", "user": updated})

