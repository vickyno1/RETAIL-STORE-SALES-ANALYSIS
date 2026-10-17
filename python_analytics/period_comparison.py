"""
Period Comparison Module using Pandas
"""

import pandas as pd
from datetime import datetime, timedelta
from data_loader import load_sales_items_df

def compare_periods(sales_df: pd.DataFrame, c_start, c_end, p_start, p_end, label: str) -> dict:
    curr_data = sales_df[(sales_df["SALE_DATE"].dt.date >= c_start) & (sales_df["SALE_DATE"].dt.date <= c_end)]
    prev_data = sales_df[(sales_df["SALE_DATE"].dt.date >= p_start) & (sales_df["SALE_DATE"].dt.date <= p_end)]

    c_rev = round(curr_data["LINE_TOTAL"].sum(), 2)
    c_cogs = round(curr_data["COST_OF_GOODS_SOLD"].sum(), 2)
    c_prof = round(c_rev - c_cogs, 2)
    c_qty = round(curr_data["QUANTITY"].sum(), 2)

    p_rev = round(prev_data["LINE_TOTAL"].sum(), 2)
    p_cogs = round(prev_data["COST_OF_GOODS_SOLD"].sum(), 2)
    p_prof = round(p_rev - p_cogs, 2)
    p_qty = round(prev_data["QUANTITY"].sum(), 2)

    def pct_change(c, p):
        if p == 0:
            return "N/A"
        return round(((c - p) / p) * 100, 2)

    return {
        "period_label": label,
        "current": {"revenue": c_rev, "cogs": c_cogs, "gross_profit": c_prof, "quantity": c_qty},
        "previous": {"revenue": p_rev, "cogs": p_cogs, "gross_profit": p_prof, "quantity": p_qty},
        "growth": {
            "revenue_growth_pct": pct_change(c_rev, p_rev),
            "profit_growth_pct": pct_change(c_prof, p_prof),
            "quantity_growth_pct": pct_change(c_qty, p_qty)
        }
    }

def run_all_period_comparisons() -> dict:
    df = load_sales_items_df()
    if df.empty:
        return {}

    today = datetime.now().date()
    
    # 1. Today vs Yesterday
    c1 = today
    p1 = today - timedelta(days=1)
    res_today = compare_periods(df, c1, c1, p1, p1, "Today vs Yesterday")

    # 2. Last 7 Days vs Prior 7 Days
    c2_start = today - timedelta(days=6)
    c2_end = today
    p2_start = today - timedelta(days=13)
    p2_end = today - timedelta(days=7)
    res_week = compare_periods(df, c2_start, c2_end, p2_start, p2_end, "Last 7 Days vs Prior 7 Days")

    # 3. Month to Date vs Prior Month Equivalent
    c3_start = today.replace(day=1)
    c3_end = today
    prev_month_end = c3_start - timedelta(days=1)
    p3_start = prev_month_end.replace(day=1)
    p3_end = p3_start + timedelta(days=(c3_end - c3_start).days)
    res_month = compare_periods(df, c3_start, c3_end, p3_start, p3_end, "Month-to-Date vs Prior Month Equivalent Period")

    return {
        "today_comparison": res_today,
        "week_comparison": res_week,
        "month_comparison": res_month
    }
