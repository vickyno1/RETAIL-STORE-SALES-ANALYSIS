"""
Sales Analysis Module using Pandas & NumPy
"""

import pandas as pd
import numpy as np
from data_loader import load_sales_items_df

def daily_sales_summary() -> pd.DataFrame:
    df = load_sales_items_df()
    if df.empty:
        return pd.DataFrame()

    df["DATE_STR"] = df["SALE_DATE"].dt.strftime("%Y-%m-%d")
    daily = df.groupby("DATE_STR").agg(
        TOTAL_ITEMS_SOLD=("QUANTITY", "sum"),
        TOTAL_REVENUE=("LINE_TOTAL", "sum"),
        TOTAL_COGS=("COST_OF_GOODS_SOLD", "sum"),
        TRANSACTION_LINES=("SALES_ITEM_ID", "count")
    ).reset_index()

    daily["GROSS_PROFIT"] = (daily["TOTAL_REVENUE"] - daily["TOTAL_COGS"]).round(2)
    daily["GROSS_MARGIN_PCT"] = np.where(
        daily["TOTAL_REVENUE"] > 0,
        ((daily["GROSS_PROFIT"] / daily["TOTAL_REVENUE"]) * 100).round(2),
        0.0
    )
    return daily.sort_values("DATE_STR", ascending=False)

def monthly_sales_summary() -> pd.DataFrame:
    df = load_sales_items_df()
    if df.empty:
        return pd.DataFrame()

    df["MONTH_KEY"] = df["SALE_DATE"].dt.strftime("%Y-%m")
    df["MONTH_LABEL"] = df["SALE_DATE"].dt.strftime("%b %Y")

    monthly = df.groupby(["MONTH_KEY", "MONTH_LABEL"]).agg(
        TOTAL_ITEMS_SOLD=("QUANTITY", "sum"),
        TOTAL_REVENUE=("LINE_TOTAL", "sum"),
        TOTAL_COGS=("COST_OF_GOODS_SOLD", "sum"),
        TRANSACTION_LINES=("SALES_ITEM_ID", "count")
    ).reset_index()

    monthly["GROSS_PROFIT"] = (monthly["TOTAL_REVENUE"] - monthly["TOTAL_COGS"]).round(2)
    monthly["GROSS_MARGIN_PCT"] = np.where(
        monthly["TOTAL_REVENUE"] > 0,
        ((monthly["GROSS_PROFIT"] / monthly["TOTAL_REVENUE"]) * 100).round(2),
        0.0
    )
    return monthly.sort_values("MONTH_KEY", ascending=False)

def product_performance() -> pd.DataFrame:
    df = load_sales_items_df()
    if df.empty:
        return pd.DataFrame()

    prod = df.groupby(["PRODUCT_ID", "PRODUCT_CODE", "PRODUCT_NAME", "CATEGORY_NAME"]).agg(
        TOTAL_QTY_SOLD=("QUANTITY", "sum"),
        TOTAL_REVENUE=("LINE_TOTAL", "sum"),
        TOTAL_COGS=("COST_OF_GOODS_SOLD", "sum")
    ).reset_index()

    prod["GROSS_PROFIT"] = (prod["TOTAL_REVENUE"] - prod["TOTAL_COGS"]).round(2)
    prod["MARGIN_PCT"] = np.where(
        prod["TOTAL_REVENUE"] > 0,
        ((prod["GROSS_PROFIT"] / prod["TOTAL_REVENUE"]) * 100).round(2),
        0.0
    )
    return prod.sort_values("TOTAL_REVENUE", ascending=False)

def category_performance() -> pd.DataFrame:
    df = load_sales_items_df()
    if df.empty:
        return pd.DataFrame()

    cat = df.groupby("CATEGORY_NAME").agg(
        TOTAL_QTY_SOLD=("QUANTITY", "sum"),
        TOTAL_REVENUE=("LINE_TOTAL", "sum"),
        TOTAL_COGS=("COST_OF_GOODS_SOLD", "sum")
    ).reset_index()

    cat["GROSS_PROFIT"] = (cat["TOTAL_REVENUE"] - cat["TOTAL_COGS"]).round(2)
    total_rev = cat["TOTAL_REVENUE"].sum()
    cat["REVENUE_SHARE_PCT"] = np.where(
        total_rev > 0,
        ((cat["TOTAL_REVENUE"] / total_rev) * 100).round(2),
        0.0
    )
    cat["GROSS_MARGIN_PCT"] = np.where(
        cat["TOTAL_REVENUE"] > 0,
        ((cat["GROSS_PROFIT"] / cat["TOTAL_REVENUE"]) * 100).round(2),
        0.0
    )
    return cat.sort_values("TOTAL_REVENUE", ascending=False)
