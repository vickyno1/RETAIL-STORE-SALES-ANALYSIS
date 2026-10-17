import csv
import io
from flask import Blueprint, request, jsonify, Response
from app.auth.security import jwt_required
from app.repositories.oracle_db import db

report_bp = Blueprint("reports", __name__)

@report_bp.route("/reports/daily-sales", methods=["GET"])
@jwt_required
def report_daily_sales():
    sql = "SELECT * FROM VW_DAILY_SALES_SUMMARY ORDER BY SALE_DATE DESC"
    return jsonify({"data": db.query(sql)})

@report_bp.route("/reports/monthly-sales", methods=["GET"])
@jwt_required
def report_monthly_sales():
    sql = "SELECT * FROM VW_MONTHLY_FINANCIAL_SUMMARY ORDER BY MONTH_KEY DESC"
    return jsonify({"data": db.query(sql)})

@report_bp.route("/reports/product-sales", methods=["GET"])
@jwt_required
def report_product_sales():
    sql = "SELECT * FROM VW_PRODUCT_PERFORMANCE ORDER BY TOTAL_REVENUE DESC"
    return jsonify({"data": db.query(sql)})

@report_bp.route("/reports/category-sales", methods=["GET"])
@jwt_required
def report_category_sales():
    sql = "SELECT * FROM VW_CATEGORY_PERFORMANCE ORDER BY TOTAL_REVENUE DESC"
    return jsonify({"data": db.query(sql)})

@report_bp.route("/reports/inventory", methods=["GET"])
@jwt_required
def report_inventory():
    sql = "SELECT * FROM VW_INVENTORY_VALUATION ORDER BY INVENTORY_VALUE DESC"
    return jsonify({"data": db.query(sql)})

@report_bp.route("/reports/low-stock", methods=["GET"])
@jwt_required
def report_low_stock():
    sql = "SELECT * FROM VW_LOW_STOCK_ALERTS ORDER BY (REORDER_LEVEL - CURRENT_STOCK) DESC"
    return jsonify({"data": db.query(sql)})

@report_bp.route("/reports/wastage", methods=["GET"])
@jwt_required
def report_wastage():
    sql = """
    SELECT 
        w.WASTAGE_ID,
        w.WASTAGE_DATE,
        p.PRODUCT_CODE,
        p.PRODUCT_NAME,
        c.CATEGORY_NAME,
        p.UNIT,
        w.QUANTITY,
        w.UNIT_COST,
        w.TOTAL_COST,
        w.REASON,
        w.NOTES
    FROM WASTAGE w
    JOIN PRODUCTS p ON w.PRODUCT_ID = p.PRODUCT_ID
    JOIN CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID
    ORDER BY w.WASTAGE_DATE DESC, w.WASTAGE_ID DESC
    """
    return jsonify({"data": db.query(sql)})

@report_bp.route("/reports/export", methods=["GET"])
@jwt_required
def export_csv():
    report_type = request.args.get("type", "daily-sales")
    
    query_map = {
        "daily-sales": ("VW_DAILY_SALES_SUMMARY", "daily_sales_report.csv"),
        "monthly-sales": ("VW_MONTHLY_FINANCIAL_SUMMARY", "monthly_financial_report.csv"),
        "products": ("VW_PRODUCT_PERFORMANCE", "product_performance_report.csv"),
        "categories": ("VW_CATEGORY_PERFORMANCE", "category_performance_report.csv"),
        "inventory": ("VW_INVENTORY_VALUATION", "inventory_report.csv"),
        "low-stock": ("VW_LOW_STOCK_ALERTS", "low_stock_alerts.csv")
    }

    if report_type not in query_map:
        return jsonify({"error": f"Invalid export type. Supported: {', '.join(query_map.keys())}"}), 400

    view_name, filename = query_map[report_type]
    rows = db.query(f"SELECT * FROM {view_name}")

    if not rows:
        output = io.StringIO()
        output.write("No records found\n")
        return Response(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})

    headers = list(rows[0].keys())
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers, quoting=csv.QUOTE_MINIMAL)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)

    csv_data = output.getvalue()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
