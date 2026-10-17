from flask import Blueprint, request, jsonify, g
from app.auth.security import jwt_required, admin_required
from app.repositories.inventory_repo import InventoryRepo
from app.validation.validators import validate_wastage_input, ValidationError

inventory_bp = Blueprint("inventory", __name__)

@inventory_bp.route("/inventory", methods=["GET"])
@jwt_required
def get_inventory():
    valuation = InventoryRepo.get_inventory_valuation()
    total_val = sum(float(i.get("INVENTORY_VALUE") or 0) for i in valuation)
    return jsonify({"inventory": valuation, "total_stock_value": total_val, "total_items": len(valuation)})

@inventory_bp.route("/inventory/movements", methods=["GET"])
@jwt_required
def list_movements():
    product_id = request.args.get("product_id")
    m_type = request.args.get("movement_type")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    limit = int(request.args.get("limit", 100))

    movements = InventoryRepo.list_movements(
        product_id=product_id,
        movement_type=m_type,
        start_date=start_date,
        end_date=end_date,
        limit=limit
    )
    return jsonify({"movements": movements, "total": len(movements)})

@inventory_bp.route("/inventory/adjustments", methods=["POST"])
@jwt_required
@admin_required
def adjust_stock():
    data = request.get_json() or {}
    product_id = data.get("product_id")
    new_stock = data.get("new_stock")
    reason = data.get("reason", "Physical inventory count reconciliation")

    if product_id is None or new_stock is None:
        return jsonify({"error": "product_id and new_stock are required."}), 400

    try:
        new_stock = float(new_stock)
        if new_stock < 0:
            return jsonify({"error": "new_stock cannot be negative."}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid new_stock."}), 400

    user_id = g.current_user["user_id"]
    updated_prod = InventoryRepo.adjust_stock(product_id, new_stock, reason, user_id=user_id)
    return jsonify({"message": "Stock adjusted successfully.", "product": updated_prod})

@inventory_bp.route("/inventory/wastage", methods=["GET"])
@jwt_required
def list_wastage():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    limit = int(request.args.get("limit", 50))

    wastage = InventoryRepo.list_wastage(start_date=start_date, end_date=end_date, limit=limit)
    total_cost = sum(float(w.get("TOTAL_COST") or 0) for w in wastage)
    return jsonify({"wastage": wastage, "total_cost": total_cost, "total_records": len(wastage)})

@inventory_bp.route("/inventory/wastage", methods=["POST"])
@jwt_required
def record_wastage():
    data = request.get_json() or {}
    validate_wastage_input(data)

    user_id = g.current_user["user_id"]
    record = InventoryRepo.record_wastage(
        product_id=data["product_id"],
        waste_date=data["wastage_date"],
        quantity=data["quantity"],
        reason=data["reason"],
        notes=data.get("notes", ""),
        user_id=user_id
    )
    return jsonify({"message": "Wastage recorded and stock deducted.", "wastage": record}), 201

@inventory_bp.route("/inventory/low-stock", methods=["GET"])
@jwt_required
def get_low_stock():
    alerts = InventoryRepo.get_low_stock_alerts()
    return jsonify({"alerts": alerts, "total_alerts": len(alerts)})

@inventory_bp.route("/inventory/reconcile", methods=["GET"])
@jwt_required
@admin_required
def reconcile_inventory():
    reconciliation = InventoryRepo.reconcile_inventory()
    mismatches = [r for r in reconciliation if r.get("STATUS") == "MISMATCH"]
    return jsonify({
        "reconciliation": reconciliation,
        "is_reconciled": len(mismatches) == 0,
        "mismatches_count": len(mismatches)
    })
