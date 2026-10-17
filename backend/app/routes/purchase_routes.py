from flask import Blueprint, request, jsonify, g
from app.auth.security import jwt_required, admin_required
from app.repositories.purchase_repo import PurchaseRepo
from app.validation.validators import validate_purchase_input, ValidationError

purchase_bp = Blueprint("purchases", __name__)

@purchase_bp.route("/purchases", methods=["GET"])
@jwt_required
def list_purchases():
    supplier_id = request.args.get("supplier_id")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    status = request.args.get("status")
    limit = int(request.args.get("limit", 50))

    purchases = PurchaseRepo.list_purchases(
        supplier_id=supplier_id,
        start_date=start_date,
        end_date=end_date,
        status=status,
        limit=limit
    )
    return jsonify({"purchases": purchases, "total": len(purchases)})

@purchase_bp.route("/purchases/<int:purchase_id>", methods=["GET"])
@jwt_required
def get_purchase(purchase_id):
    purchase = PurchaseRepo.get_by_id(purchase_id)
    if not purchase:
        return jsonify({"error": "Purchase not found."}), 404
    return jsonify({"purchase": purchase})

@purchase_bp.route("/purchases", methods=["POST"])
@jwt_required
def create_purchase():
    data = request.get_json() or {}
    validate_purchase_input(data)

    user_id = g.current_user["user_id"]
    supplier_id = data["supplier_id"]
    purchase_date = data["purchase_date"]
    items = data["items"]
    notes = data.get("notes", "")

    purchase = PurchaseRepo.create_purchase(
        supplier_id=supplier_id,
        purchase_date=purchase_date,
        items=items,
        notes=notes,
        user_id=user_id
    )
    return jsonify({"message": "Purchase recorded and stock updated successfully.", "purchase": purchase}), 201

@purchase_bp.route("/purchases/<int:purchase_id>/reverse", methods=["POST"])
@jwt_required
@admin_required
def reverse_purchase(purchase_id):
    data = request.get_json() or {}
    reason = data.get("reason", "Supplier return / purchase reversal requested")
    user_id = g.current_user["user_id"]

    purchase = PurchaseRepo.reverse_purchase(purchase_id, reason=reason, user_id=user_id)
    return jsonify({"message": "Purchase reversed and stock deducted.", "purchase": purchase})
