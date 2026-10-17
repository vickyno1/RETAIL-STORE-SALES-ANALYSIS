from flask import Blueprint, request, jsonify
from app.auth.security import jwt_required
from app.repositories.analytics_repo import AnalyticsRepo

analytics_bp = Blueprint("analytics", __name__)

@analytics_bp.route("/analytics/dashboard", methods=["GET"])
@jwt_required
def get_dashboard_summary():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    kpis = AnalyticsRepo.get_kpis(start_date=start_date, end_date=end_date)
    top_revenue = AnalyticsRepo.get_top_products(metric="revenue", limit=5, start_date=start_date, end_date=end_date)
    top_profit = AnalyticsRepo.get_top_products(metric="profit", limit=5, start_date=start_date, end_date=end_date)
    top_qty = AnalyticsRepo.get_top_products(metric="quantity", limit=5, start_date=start_date, end_date=end_date)
    slow_moving = AnalyticsRepo.get_slow_moving_products(limit=5)
    categories = AnalyticsRepo.get_category_performance(start_date=start_date, end_date=end_date)
    daily_trend = AnalyticsRepo.get_sales_trend(start_date=start_date, end_date=end_date, granularity="daily")
    comparison = AnalyticsRepo.get_period_comparison(period_type="month")

    return jsonify({
        "kpis": kpis,
        "top_by_revenue": top_revenue,
        "top_by_profit": top_profit,
        "top_by_quantity": top_qty,
        "slow_moving": slow_moving,
        "categories": categories,
        "sales_trend": daily_trend,
        "period_comparison": comparison
    })

@analytics_bp.route("/analytics/sales-trend", methods=["GET"])
@jwt_required
def get_sales_trend():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    granularity = request.args.get("granularity", "daily")

    trend = AnalyticsRepo.get_sales_trend(start_date=start_date, end_date=end_date, granularity=granularity)
    return jsonify({"trend": trend})

@analytics_bp.route("/analytics/category-performance", methods=["GET"])
@jwt_required
def get_category_performance():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    categories = AnalyticsRepo.get_category_performance(start_date=start_date, end_date=end_date)
    return jsonify({"categories": categories})

@analytics_bp.route("/analytics/product-performance", methods=["GET"])
@jwt_required
def get_product_performance():
    metric = request.args.get("metric", "revenue")
    category_id = request.args.get("category_id")
    limit = int(request.args.get("limit", 10))
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    products = AnalyticsRepo.get_top_products(
        metric=metric,
        category_id=category_id,
        limit=limit,
        start_date=start_date,
        end_date=end_date
    )
    return jsonify({"products": products})

@analytics_bp.route("/analytics/period-comparison", methods=["GET"])
@jwt_required
def get_period_comparison():
    period_type = request.args.get("type", "month") # today, week, month
    comparison = AnalyticsRepo.get_period_comparison(period_type=period_type)
    return jsonify({"comparison": comparison})
