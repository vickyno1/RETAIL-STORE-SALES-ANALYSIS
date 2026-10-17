from flask import Blueprint, request, jsonify, g
from app.auth.security import jwt_required, admin_required
from app.repositories.sales_repo import SalesRepo
from app.validation.validators import validate_sales_input, ValidationError

sales_bp = Blueprint("sales", __name__)

@sales_bp.route("/sales", methods=["GET"])
@jwt_required
def list_sales():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    status = request.args.get("status")
    limit = int(request.args.get("limit", 50))

    sales = SalesRepo.list_sales(start_date=start_date, end_date=end_date, status=status, limit=limit)
    return jsonify({"sales": sales, "total": len(sales)})

@sales_bp.route("/sales/<int:sale_id>", methods=["GET"])
@jwt_required
def get_sale(sale_id):
    sale = SalesRepo.get_by_id(sale_id)
    if not sale:
        return jsonify({"error": "Sales entry not found."}), 404
    return jsonify({"sale": sale})

@sales_bp.route("/sales/daily", methods=["POST"])
@jwt_required
def create_daily_sales():
    data = request.get_json() or {}
    validate_sales_input(data)

    user_id = g.current_user["user_id"]
    sale_date = data["sale_date"]
    items = data["items"]
    notes = data.get("notes", "")

    sale = SalesRepo.create_daily_sales(
        sale_date=sale_date,
        items=items,
        notes=notes,
        user_id=user_id,
        status="FINALIZED"
    )
    return jsonify({"message": "Daily sales recorded and committed successfully.", "sale": sale}), 201

@sales_bp.route("/sales/draft", methods=["POST"])
@jwt_required
def save_sales_draft():
    data = request.get_json() or {}
    validate_sales_input(data)

    user_id = g.current_user["user_id"]
    sale_date = data["sale_date"]
    items = data["items"]
    notes = data.get("notes", "")

    sale = SalesRepo.create_daily_sales(
        sale_date=sale_date,
        items=items,
        notes=notes,
        user_id=user_id,
        status="DRAFT"
    )
    return jsonify({"message": "Draft saved successfully.", "sale": sale}), 201

@sales_bp.route("/sales/<int:sale_id>/reverse", methods=["POST"])
@jwt_required
@admin_required
def reverse_sale(sale_id):
    data = request.get_json() or {}
    reason = data.get("reason", "Customer return / billing reversal requested")
    user_id = g.current_user["user_id"]

    sale = SalesRepo.reverse_sale(sale_id, reason=reason, user_id=user_id)
    return jsonify({"message": "Sale transaction reversed and stock restored.", "sale": sale})
