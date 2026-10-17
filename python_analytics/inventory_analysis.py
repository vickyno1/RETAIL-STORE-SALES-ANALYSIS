"""
Inventory Analysis Module using Pandas & NumPy
"""

import pandas as pd
import numpy as np
from data_loader import load_products_df, load_wastage_df, load_sales_items_df

def inventory_valuation_summary() -> pd.DataFrame:
    df = load_products_df()
    if df.empty:
        return pd.DataFrame()

    df["INVENTORY_VALUE"] = (df["CURRENT_STOCK"] * df["CURRENT_AVERAGE_COST"]).round(2)
    df["STOCK_STATUS"] = np.where(
        df["CURRENT_STOCK"] <= df["REORDER_LEVEL"], "LOW_STOCK",
        np.where(df["CURRENT_STOCK"] > (df["REORDER_LEVEL"] * 3), "OVERSTOCKED", "OPTIMAL")
    )
    return df.sort_values("INVENTORY_VALUE", ascending=False)

def low_stock_summary() -> pd.DataFrame:
    df = load_products_df()
    if df.empty:
        return pd.DataFrame()

    low = df[df["CURRENT_STOCK"] <= df["REORDER_LEVEL"]].copy()
    low["SUGGESTED_REORDER_QTY"] = (low["REORDER_LEVEL"] * 2) - low["CURRENT_STOCK"]
    return low.sort_values("CURRENT_STOCK", ascending=True)

def wastage_analysis_summary() -> pd.DataFrame:
    df = load_wastage_df()
    if df.empty:
        return pd.DataFrame()

    prod_waste = df.groupby(["PRODUCT_ID", "PRODUCT_CODE", "PRODUCT_NAME", "CATEGORY_NAME"]).agg(
        TOTAL_WASTED_QTY=("QUANTITY", "sum"),
        TOTAL_WASTAGE_LOSS=("TOTAL_COST", "sum"),
        INCIDENTS_COUNT=("WASTAGE_ID", "count")
    ).reset_index()

    reason_waste = df.groupby("REASON").agg(
        TOTAL_WASTAGE_LOSS=("TOTAL_COST", "sum"),
        INCIDENTS_COUNT=("WASTAGE_ID", "count")
    ).reset_index()

    return prod_waste.sort_values("TOTAL_WASTAGE_LOSS", ascending=False)
