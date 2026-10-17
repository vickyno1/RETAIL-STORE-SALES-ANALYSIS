"""
Request input validation module.
"""

from datetime import datetime

class ValidationError(Exception):
    def __init__(self, message, field=None):
        super().__init__(message)
        self.message = message
        self.field = field

def validate_date_str(date_str, field_name="date"):
    if not date_str:
        raise ValidationError(f"{field_name} is required.", field_name)
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise ValidationError(f"{field_name} must be in YYYY-MM-DD format.", field_name)

def validate_product_input(data):
    if not data.get("product_name") or not str(data["product_name"]).strip():
        raise ValidationError("Product name is required.", "product_name")
    
    if not data.get("category_id"):
        raise ValidationError("Category is required.", "category_id")
        
    try:
        price = float(data.get("selling_price", 0))
        if price < 0:
            raise ValidationError("Selling price cannot be negative.", "selling_price")
    except (ValueError, TypeError):
        raise ValidationError("Invalid selling price.", "selling_price")

    try:
        cost = float(data.get("purchase_cost", 0))
        if cost < 0:
            raise ValidationError("Purchase cost cannot be negative.", "purchase_cost")
    except (ValueError, TypeError):
        raise ValidationError("Invalid purchase cost.", "purchase_cost")

    valid_units = {"kg", "g", "piece", "bunch", "packet", "litre"}
    unit = data.get("unit", "kg")
    if unit not in valid_units:
        raise ValidationError(f"Unit must be one of: {', '.join(valid_units)}", "unit")

def validate_purchase_input(data):
    if not data.get("supplier_id"):
        raise ValidationError("Supplier is required.", "supplier_id")
    
    validate_date_str(data.get("purchase_date"), "purchase_date")

    items = data.get("items")
    if not items or not isinstance(items, list):
        raise ValidationError("Purchase must contain at least one item.", "items")
        
    for idx, item in enumerate(items):
        if not item.get("product_id"):
            raise ValidationError(f"Item #{idx+1} missing product_id.", f"items[{idx}].product_id")
        try:
            qty = float(item.get("quantity", 0))
            if qty <= 0:
                raise ValidationError(f"Item #{idx+1} quantity must be greater than zero.", f"items[{idx}].quantity")
        except (ValueError, TypeError):
            raise ValidationError(f"Item #{idx+1} invalid quantity.", f"items[{idx}].quantity")

        try:
            cost = float(item.get("unit_cost", 0))
            if cost < 0:
                raise ValidationError(f"Item #{idx+1} unit cost cannot be negative.", f"items[{idx}].unit_cost")
        except (ValueError, TypeError):
            raise ValidationError(f"Item #{idx+1} invalid unit cost.", f"items[{idx}].unit_cost")

def validate_sales_input(data):
    validate_date_str(data.get("sale_date"), "sale_date")

    items = data.get("items")
    if not items or not isinstance(items, list):
        raise ValidationError("Sales entry must contain at least one item.", "items")

    valid_count = 0
    for idx, item in enumerate(items):
        if not item.get("product_id"):
            raise ValidationError(f"Item #{idx+1} missing product_id.", f"items[{idx}].product_id")
        try:
            qty = float(item.get("quantity", 0))
            if qty < 0:
                raise ValidationError(f"Item #{idx+1} quantity cannot be negative.", f"items[{idx}].quantity")
            if qty > 0:
                valid_count += 1
        except (ValueError, TypeError):
            raise ValidationError(f"Item #{idx+1} invalid quantity.", f"items[{idx}].quantity")

        try:
            price = float(item.get("selling_price", 0))
            if price < 0:
                raise ValidationError(f"Item #{idx+1} selling price cannot be negative.", f"items[{idx}].selling_price")
        except (ValueError, TypeError):
            raise ValidationError(f"Item #{idx+1} invalid selling price.", f"items[{idx}].selling_price")

    if valid_count == 0:
        raise ValidationError("Please enter a positive sold quantity for at least one item.", "items")

def validate_wastage_input(data):
    if not data.get("product_id"):
        raise ValidationError("Product is required.", "product_id")
    
    validate_date_str(data.get("wastage_date"), "wastage_date")

    try:
        qty = float(data.get("quantity", 0))
        if qty <= 0:
            raise ValidationError("Wastage quantity must be positive.", "quantity")
    except (ValueError, TypeError):
        raise ValidationError("Invalid wastage quantity.", "quantity")

    valid_reasons = {"Spoilage", "Damage", "Unsold Perishable", "Quality Rejection", "Expired", "Other"}
    reason = data.get("reason")
    if not reason or reason not in valid_reasons:
        raise ValidationError(f"Reason must be one of: {', '.join(valid_reasons)}", "reason")

def validate_expense_input(data):
    validate_date_str(data.get("expense_date"), "expense_date")

    valid_categories = {"Rent", "Electricity", "Transport", "Packaging", "Salaries", "Maintenance", "Waste Disposal", "Other"}
    cat = data.get("category")
    if not cat or cat not in valid_categories:
        raise ValidationError(f"Category must be one of: {', '.join(valid_categories)}", "category")

    try:
        amt = float(data.get("amount", 0))
        if amt <= 0:
            raise ValidationError("Expense amount must be positive.", "amount")
    except (ValueError, TypeError):
        raise ValidationError("Invalid expense amount.", "amount")

    if not data.get("description") or not str(data["description"]).strip():
        raise ValidationError("Expense description is required.", "description")
