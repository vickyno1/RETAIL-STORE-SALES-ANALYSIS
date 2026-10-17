from flask import Blueprint, request, jsonify, g
from app.auth.security import jwt_required, admin_required
from app.repositories.product_repo import ProductRepo
from app.validation.validators import validate_product_input, ValidationError

product_bp = Blueprint("products", __name__)

@product_bp.route("/products", methods=["GET"])
@jwt_required
def list_products():
    category_id = request.args.get("category_id")
    status = request.args.get("status", "ACTIVE")
    search = request.args.get("search")
    
    products = ProductRepo.list_products(category_id=category_id, status=status, search=search)
    return jsonify({"products": products, "total": len(products)})

@product_bp.route("/products/<int:product_id>", methods=["GET"])
@jwt_required
def get_product(product_id):
    product = ProductRepo.get_by_id(product_id)
    if not product:
        return jsonify({"error": "Product not found."}), 404
    return jsonify({"product": product})

@product_bp.route("/products", methods=["POST"])
@jwt_required
@admin_required
def create_product():
    data = request.get_json() or {}
    validate_product_input(data)
    
    user_id = g.current_user["user_id"]
    new_product = ProductRepo.create_product(data, user_id=user_id)
    return jsonify({"message": "Product created successfully.", "product": new_product}), 201

@product_bp.route("/products/<int:product_id>", methods=["PUT"])
@jwt_required
@admin_required
def update_product(product_id):
    data = request.get_json() or {}
    validate_product_input(data)
    
    user_id = g.current_user["user_id"]
    updated = ProductRepo.update_product(product_id, data, user_id=user_id)
    if not updated:
        return jsonify({"error": "Product not found."}), 404
    return jsonify({"message": "Product updated successfully.", "product": updated})

@product_bp.route("/products/<int:product_id>", methods=["DELETE"])
@jwt_required
@admin_required
def deactivate_product(product_id):
    user_id = g.current_user["user_id"]
    ProductRepo.deactivate_product(product_id, user_id=user_id)
    return jsonify({"message": "Product deactivated successfully."})

@product_bp.route("/categories", methods=["GET"])
@jwt_required
def list_categories():
    categories = ProductRepo.list_categories()
    return jsonify({"categories": categories})

@product_bp.route("/categories", methods=["POST"])
@jwt_required
@admin_required
def create_category():
    data = request.get_json() or {}
    name = (data.get("category_name") or "").strip()
    if not name:
        return jsonify({"error": "Category name is required."}), 400
    desc = data.get("description", "")
    new_cat = ProductRepo.create_category(name, desc)
    return jsonify({"message": "Category created.", "category": new_cat}), 201

@product_bp.route("/suppliers", methods=["GET"])
@jwt_required
def list_suppliers():
    suppliers = ProductRepo.list_suppliers()
    return jsonify({"suppliers": suppliers})

@product_bp.route("/suppliers", methods=["POST"])
@jwt_required
@admin_required
def create_supplier():
    data = request.get_json() or {}
    code = (data.get("supplier_code") or "").strip()
    name = (data.get("supplier_name") or "").strip()
    if not code or not name:
        return jsonify({"error": "Supplier code and name are required."}), 400
    phone = data.get("phone", "")
    city = data.get("city", "")
    new_sup = ProductRepo.create_supplier(code, name, phone, city)
    return jsonify({"message": "Supplier created.", "supplier": new_sup}), 201
