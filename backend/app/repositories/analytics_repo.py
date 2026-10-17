from datetime import datetime, timedelta
from app.repositories.oracle_db import db

class AnalyticsRepo:
    @staticmethod
    def get_kpis(start_date=None, end_date=None):
        date_cond = ""
        params = {}
        if start_date:
            date_cond += " AND s.SALE_DATE >= TO_DATE(:start_date, 'YYYY-MM-DD')"
            params["start_date"] = start_date
        if end_date:
            date_cond += " AND s.SALE_DATE <= TO_DATE(:end_date, 'YYYY-MM-DD')"
            params["end_date"] = end_date

        # Sales aggregates
        sales_sql = f"""
        SELECT 
            COUNT(DISTINCT s.SALE_ID) AS BATCH_COUNT,
            NVL(SUM(si.QUANTITY), 0) AS TOTAL_QUANTITY_SOLD,
            NVL(SUM(si.LINE_TOTAL), 0) AS TOTAL_REVENUE,
            NVL(SUM(si.COST_OF_GOODS_SOLD), 0) AS TOTAL_COGS,
            NVL(SUM(si.LINE_TOTAL - si.COST_OF_GOODS_SOLD), 0) AS GROSS_PROFIT
        FROM SALES s
        LEFT JOIN SALES_ITEMS si ON s.SALE_ID = si.SALE_ID
        WHERE s.STATUS = 'FINALIZED' {date_cond}
        """
        sales_res = db.query_one(sales_sql, params) or {}
        revenue = float(sales_res.get("TOTAL_REVENUE") or 0)
        cogs = float(sales_res.get("TOTAL_COGS") or 0)
        profit = float(sales_res.get("GROSS_PROFIT") or 0)
        margin = round((profit / revenue * 100), 2) if revenue > 0 else 0.0

        # Wastage cost in period
        waste_cond = ""
        waste_params = {}
        if start_date:
            waste_cond += " WHERE WASTAGE_DATE >= TO_DATE(:start_date, 'YYYY-MM-DD')"
            waste_params["start_date"] = start_date
        if end_date:
            waste_cond += (" AND " if waste_cond else " WHERE ") + "WASTAGE_DATE <= TO_DATE(:end_date, 'YYYY-MM-DD')"
            waste_params["end_date"] = end_date
        waste_sql = f"SELECT NVL(SUM(TOTAL_COST), 0) AS TOTAL_WASTE FROM WASTAGE {waste_cond}"
        waste_cost = float((db.query_one(waste_sql, waste_params) or {}).get("TOTAL_WASTE") or 0)

        # Purchase expenditure in period
        pur_cond = " WHERE STATUS = 'COMPLETED'"
        pur_params = {}
        if start_date:
            pur_cond += " AND PURCHASE_DATE >= TO_DATE(:start_date, 'YYYY-MM-DD')"
            pur_params["start_date"] = start_date
        if end_date:
            pur_cond += " AND PURCHASE_DATE <= TO_DATE(:end_date, 'YYYY-MM-DD')"
            pur_params["end_date"] = end_date
        pur_sql = f"SELECT NVL(SUM(TOTAL_AMOUNT), 0) AS TOTAL_PURCHASE FROM PURCHASES {pur_cond}"
        pur_cost = float((db.query_one(pur_sql, pur_params) or {}).get("TOTAL_PURCHASE") or 0)

        # Operating expenses in period
        exp_cond = ""
        exp_params = {}
        if start_date:
            exp_cond += " WHERE EXPENSE_DATE >= TO_DATE(:start_date, 'YYYY-MM-DD')"
            exp_params["start_date"] = start_date
        if end_date:
            exp_cond += (" AND " if exp_cond else " WHERE ") + "EXPENSE_DATE <= TO_DATE(:end_date, 'YYYY-MM-DD')"
            exp_params["end_date"] = end_date
        exp_sql = f"SELECT NVL(SUM(AMOUNT), 0) AS TOTAL_EXPENSE FROM OPERATING_EXPENSES {exp_cond}"
        operating_exp = float((db.query_one(exp_sql, exp_params) or {}).get("TOTAL_EXPENSE") or 0)

        # Current stock valuation & Low stock count
        stock_sql = """
        SELECT 
            NVL(SUM(CURRENT_STOCK * CURRENT_AVERAGE_COST), 0) AS STOCK_VALUE,
            SUM(CASE WHEN CURRENT_STOCK <= REORDER_LEVEL THEN 1 ELSE 0 END) AS LOW_STOCK_COUNT
        FROM PRODUCTS
        WHERE STATUS = 'ACTIVE'
        """
        stock_res = db.query_one(stock_sql) or {}
        stock_val = float(stock_res.get("STOCK_VALUE") or 0)
        low_stock = int(float(stock_res.get("LOW_STOCK_COUNT") or 0))

        net_profit_est = round(profit - waste_cost - operating_exp, 2)

        return {
            "total_revenue": revenue,
            "total_cogs": cogs,
            "gross_profit": profit,
            "gross_margin_pct": margin,
            "total_quantity_sold": float(sales_res.get("TOTAL_QUANTITY_SOLD") or 0),
            "batch_count": int(float(sales_res.get("BATCH_COUNT") or 0)),
            "wastage_cost": waste_cost,
            "purchase_expenditure": pur_cost,
            "operating_expenses": operating_exp,
            "net_operating_profit_estimate": net_profit_est,
            "inventory_valuation": stock_val,
            "low_stock_count": low_stock
        }

    @staticmethod
    def get_sales_trend(start_date=None, end_date=None, granularity="daily"):
        conditions = ["s.STATUS = 'FINALIZED'"]
        params = {}
        if start_date:
            conditions.append("s.SALE_DATE >= TO_DATE(:start_date, 'YYYY-MM-DD')")
            params["start_date"] = start_date
        if end_date:
            conditions.append("s.SALE_DATE <= TO_DATE(:end_date, 'YYYY-MM-DD')")
            params["end_date"] = end_date

        where_clause = "WHERE " + " AND ".join(conditions)

        if granularity == "monthly":
            group_fmt = "TO_CHAR(s.SALE_DATE, 'YYYY-MM')"
            label_fmt = "TO_CHAR(s.SALE_DATE, 'Mon YYYY')"
        elif granularity == "weekly":
            group_fmt = "TO_CHAR(TRUNC(s.SALE_DATE, 'IW'), 'YYYY-MM-DD')"
            label_fmt = "'Wk ' || TO_CHAR(s.SALE_DATE, 'IW YYYY')"
        else:
            group_fmt = "TO_CHAR(s.SALE_DATE, 'YYYY-MM-DD')"
            label_fmt = "TO_CHAR(s.SALE_DATE, 'DD Mon')"

        sql = f"""
        SELECT 
            {group_fmt} AS PERIOD_KEY,
            {label_fmt} AS PERIOD_LABEL,
            NVL(SUM(si.LINE_TOTAL), 0) AS REVENUE,
            NVL(SUM(si.COST_OF_GOODS_SOLD), 0) AS COGS,
            NVL(SUM(si.LINE_TOTAL - si.COST_OF_GOODS_SOLD), 0) AS GROSS_PROFIT,
            NVL(SUM(si.QUANTITY), 0) AS QUANTITY_SOLD
        FROM SALES s
        JOIN SALES_ITEMS si ON s.SALE_ID = si.SALE_ID
        {where_clause}
        GROUP BY {group_fmt}, {label_fmt}
        ORDER BY PERIOD_KEY ASC
        """
        return db.query(sql, params)

    @staticmethod
    def get_category_performance(start_date=None, end_date=None):
        conditions = ["s.STATUS = 'FINALIZED'"]
        params = {}
        if start_date:
            conditions.append("s.SALE_DATE >= TO_DATE(:start_date, 'YYYY-MM-DD')")
            params["start_date"] = start_date
        if end_date:
            conditions.append("s.SALE_DATE <= TO_DATE(:end_date, 'YYYY-MM-DD')")
            params["end_date"] = end_date

        where_clause = "WHERE " + " AND ".join(conditions)

        sql = f"""
        SELECT 
            c.CATEGORY_ID,
            c.CATEGORY_NAME,
            COUNT(DISTINCT p.PRODUCT_ID) AS PRODUCT_COUNT,
            NVL(SUM(si.QUANTITY), 0) AS QUANTITY_SOLD,
            NVL(SUM(si.LINE_TOTAL), 0) AS REVENUE,
            NVL(SUM(si.COST_OF_GOODS_SOLD), 0) AS COGS,
            NVL(SUM(si.LINE_TOTAL - si.COST_OF_GOODS_SOLD), 0) AS GROSS_PROFIT,
            CASE 
                WHEN NVL(SUM(si.LINE_TOTAL), 0) > 0 
                THEN ROUND((SUM(si.LINE_TOTAL - si.COST_OF_GOODS_SOLD) / SUM(si.LINE_TOTAL)) * 100, 2)
                ELSE 0 
            END AS GROSS_MARGIN_PCT
        FROM CATEGORIES c
        JOIN PRODUCTS p ON c.CATEGORY_ID = p.CATEGORY_ID
        LEFT JOIN SALES_ITEMS si ON p.PRODUCT_ID = si.PRODUCT_ID
        LEFT JOIN SALES s ON si.SALE_ID = s.SALE_ID
        {where_clause}
        GROUP BY c.CATEGORY_ID, c.CATEGORY_NAME
        ORDER BY REVENUE DESC
        """
        cats = db.query(sql, params)
        total_rev = sum(float(c.get("REVENUE") or 0) for c in cats)
        for c in cats:
            rev = float(c.get("REVENUE") or 0)
            c["REVENUE_SHARE_PCT"] = round((rev / total_rev * 100), 2) if total_rev > 0 else 0.0
        return cats

    @staticmethod
    def get_top_products(metric="revenue", category_id=None, limit=10, start_date=None, end_date=None):
        conditions = ["s.STATUS = 'FINALIZED'"]
        params = {}
        if category_id:
            conditions.append("p.CATEGORY_ID = :cat_id")
            params["cat_id"] = int(category_id)
        if start_date:
            conditions.append("s.SALE_DATE >= TO_DATE(:start_date, 'YYYY-MM-DD')")
            params["start_date"] = start_date
        if end_date:
            conditions.append("s.SALE_DATE <= TO_DATE(:end_date, 'YYYY-MM-DD')")
            params["end_date"] = end_date

        where_clause = "WHERE " + " AND ".join(conditions)

        order_col = "TOTAL_REVENUE" if metric == "revenue" else "GROSS_PROFIT" if metric == "profit" else "TOTAL_QTY"

        sql = f"""
        SELECT * FROM (
            SELECT 
                p.PRODUCT_ID,
                p.PRODUCT_CODE,
                p.PRODUCT_NAME,
                c.CATEGORY_NAME,
                p.UNIT,
                p.SELLING_PRICE,
                p.CURRENT_AVERAGE_COST,
                p.CURRENT_STOCK,
                NVL(SUM(si.QUANTITY), 0) AS TOTAL_QTY,
                NVL(SUM(si.LINE_TOTAL), 0) AS TOTAL_REVENUE,
                NVL(SUM(si.COST_OF_GOODS_SOLD), 0) AS TOTAL_COGS,
                NVL(SUM(si.LINE_TOTAL - si.COST_OF_GOODS_SOLD), 0) AS GROSS_PROFIT,
                CASE 
                    WHEN NVL(SUM(si.LINE_TOTAL), 0) > 0 
                    THEN ROUND((SUM(si.LINE_TOTAL - si.COST_OF_GOODS_SOLD) / SUM(si.LINE_TOTAL)) * 100, 2)
                    ELSE 0 
                END AS MARGIN_PCT
            FROM PRODUCTS p
            JOIN CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID
            JOIN SALES_ITEMS si ON p.PRODUCT_ID = si.PRODUCT_ID
            JOIN SALES s ON si.SALE_ID = s.SALE_ID
            {where_clause}
            GROUP BY p.PRODUCT_ID, p.PRODUCT_CODE, p.PRODUCT_NAME, c.CATEGORY_NAME, p.UNIT, p.SELLING_PRICE, p.CURRENT_AVERAGE_COST, p.CURRENT_STOCK
            ORDER BY {order_col} DESC
        ) WHERE ROWNUM <= {int(limit)}
        """
        return db.query(sql, params)

    @staticmethod
    def get_slow_moving_products(limit=10):
        sql = f"""
        SELECT * FROM (
            SELECT 
                p.PRODUCT_ID,
                p.PRODUCT_CODE,
                p.PRODUCT_NAME,
                c.CATEGORY_NAME,
                p.UNIT,
                p.CURRENT_STOCK,
                ROUND(p.CURRENT_STOCK * p.CURRENT_AVERAGE_COST, 2) AS STOCK_VALUE,
                NVL(sales_30.QTY_SOLD, 0) AS QTY_SOLD_LAST_30D
            FROM PRODUCTS p
            JOIN CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID
            LEFT JOIN (
                SELECT si.PRODUCT_ID, SUM(si.QUANTITY) AS QTY_SOLD
                FROM SALES_ITEMS si
                JOIN SALES s ON si.SALE_ID = s.SALE_ID
                WHERE s.STATUS = 'FINALIZED' AND s.SALE_DATE >= TRUNC(SYSDATE) - 30
                GROUP BY si.PRODUCT_ID
            ) sales_30 ON p.PRODUCT_ID = sales_30.PRODUCT_ID
            WHERE p.STATUS = 'ACTIVE'
            ORDER BY QTY_SOLD_LAST_30D ASC, STOCK_VALUE DESC
        ) WHERE ROWNUM <= {int(limit)}
        """
        return db.query(sql)

    @staticmethod
    def get_period_comparison(period_type="month"):
        """
        Calculates period-over-period comparisons:
        - today: Today vs Yesterday
        - week: This Week (last 7 days) vs Prior 7 days
        - month: This Month vs Prior Month
        """
        today = datetime.now().date()
        
        if period_type == "today":
            c_start = today
            c_end = today
            p_start = today - timedelta(days=1)
            p_end = today - timedelta(days=1)
            label = "Today vs Yesterday"
        elif period_type == "week":
            c_start = today - timedelta(days=6)
            c_end = today
            p_start = today - timedelta(days=13)
            p_end = today - timedelta(days=7)
            label = "Last 7 Days vs Prior 7 Days"
        else: # month
            # Month to date
            c_start = today.replace(day=1)
            c_end = today
            # Prior month equivalent days
            prev_month_end = c_start - timedelta(days=1)
            p_start = prev_month_end.replace(day=1)
            p_end = p_start + timedelta(days=(c_end - c_start).days)
            label = "Month-to-Date vs Prior Month Equivalent Period"

        curr_kpis = AnalyticsRepo.get_kpis(c_start.strftime("%Y-%m-%d"), c_end.strftime("%Y-%m-%d"))
        prev_kpis = AnalyticsRepo.get_kpis(p_start.strftime("%Y-%m-%d"), p_end.strftime("%Y-%m-%d"))

        def calc_change(curr, prev):
            if prev == 0:
                return "N/A"
            return round(((curr - prev) / prev) * 100, 2)

        return {
            "period_label": label,
            "current_period": {
                "start_date": c_start.strftime("%Y-%m-%d"),
                "end_date": c_end.strftime("%Y-%m-%d"),
                "revenue": curr_kpis["total_revenue"],
                "gross_profit": curr_kpis["gross_profit"],
                "quantity": curr_kpis["total_quantity_sold"],
                "margin_pct": curr_kpis["gross_margin_pct"]
            },
            "previous_period": {
                "start_date": p_start.strftime("%Y-%m-%d"),
                "end_date": p_end.strftime("%Y-%m-%d"),
                "revenue": prev_kpis["total_revenue"],
                "gross_profit": prev_kpis["gross_profit"],
                "quantity": prev_kpis["total_quantity_sold"],
                "margin_pct": prev_kpis["gross_margin_pct"]
            },
            "changes": {
                "revenue_change_pct": calc_change(curr_kpis["total_revenue"], prev_kpis["total_revenue"]),
                "gross_profit_change_pct": calc_change(curr_kpis["gross_profit"], prev_kpis["gross_profit"]),
                "quantity_change_pct": calc_change(curr_kpis["total_quantity_sold"], prev_kpis["total_quantity_sold"])
            }
        }
