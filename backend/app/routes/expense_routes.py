from flask import Blueprint, request, jsonify, g
from app.auth.security import jwt_required, admin_required
from app.repositories.expense_repo import ExpenseRepo
from app.validation.validators import validate_expense_input, ValidationError

expense_bp = Blueprint("expenses", __name__)

@expense_bp.route("/expenses", methods=["GET"])
@jwt_required
def list_expenses():
    category = request.args.get("category")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    limit = int(request.args.get("limit", 50))

    expenses = ExpenseRepo.list_expenses(
        category=category,
        start_date=start_date,
        end_date=end_date,
        limit=limit
    )
    total_amount = sum(float(e.get("AMOUNT") or 0) for e in expenses)
    return jsonify({"expenses": expenses, "total_amount": total_amount, "count": len(expenses)})

@expense_bp.route("/expenses", methods=["POST"])
@jwt_required
@admin_required
def create_expense():
    data = request.get_json() or {}
    validate_expense_input(data)

    user_id = g.current_user["user_id"]
    new_exp = ExpenseRepo.create_expense(
        expense_date=data["expense_date"],
        category=data["category"],
        amount=data["amount"],
        description=data["description"],
        user_id=user_id
    )
    return jsonify({"message": "Expense recorded successfully.", "expense": new_exp}), 201
