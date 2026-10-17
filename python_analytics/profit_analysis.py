"""
Profit & Loss Analytics Module using Pandas & NumPy
"""

import pandas as pd
from data_loader import load_sales_items_df, load_wastage_df, load_expenses_df

def profit_and_loss_summary() -> pd.DataFrame:
    sales_df = load_sales_items_df()
    waste_df = load_wastage_df()
    exp_df = load_expenses_df()

    if sales_df.empty:
        return pd.DataFrame()

    sales_df["MONTH_KEY"] = sales_df["SALE_DATE"].dt.strftime("%Y-%m")
    sales_agg = sales_df.groupby("MONTH_KEY").agg(
        REVENUE=("LINE_TOTAL", "sum"),
        COGS=("COST_OF_GOODS_SOLD", "sum")
    ).reset_index()
    sales_agg["GROSS_PROFIT"] = (sales_agg["REVENUE"] - sales_agg["COGS"]).round(2)

    waste_agg = pd.DataFrame(columns=["MONTH_KEY", "WASTAGE_COST"])
    if not waste_df.empty:
        waste_df["MONTH_KEY"] = waste_df["WASTAGE_DATE"].dt.strftime("%Y-%m")
        waste_agg = waste_df.groupby("MONTH_KEY")["TOTAL_COST"].sum().reset_index().rename(columns={"TOTAL_COST": "WASTAGE_COST"})

    exp_agg = pd.DataFrame(columns=["MONTH_KEY", "OPERATING_EXPENSES"])
    if not exp_df.empty:
        exp_df["MONTH_KEY"] = exp_df["EXPENSE_DATE"].dt.strftime("%Y-%m")
        exp_agg = exp_df.groupby("MONTH_KEY")["AMOUNT"].sum().reset_index().rename(columns={"AMOUNT": "OPERATING_EXPENSES"})

    merged = pd.merge(sales_agg, waste_agg, on="MONTH_KEY", how="left").fillna(0.0)
    merged = pd.merge(merged, exp_agg, on="MONTH_KEY", how="left").fillna(0.0)

    merged["NET_OPERATING_PROFIT_ESTIMATE"] = (
        merged["GROSS_PROFIT"] - merged["WASTAGE_COST"] - merged["OPERATING_EXPENSES"]
    ).round(2)

    merged["NET_MARGIN_PCT"] = (
        (merged["NET_OPERATING_PROFIT_ESTIMATE"] / merged["REVENUE"]) * 100
    ).round(2)

    return merged.sort_values("MONTH_KEY", ascending=False)
