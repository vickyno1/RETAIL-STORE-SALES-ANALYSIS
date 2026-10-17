"""
Data Validation & Quality Checks
Reconciles transactional totals with line items, ledger with stock, and gross profit accounting.
"""

import pandas as pd
from data_loader import (
    load_products_df, load_sales_items_df, load_purchases_items_df,
    load_inventory_movements_df
)
from oracle_connection import get_db

db = get_db()

def validate_sales_reconciliation() -> dict:
    header_rows = db.query("SELECT SALE_ID, TOTAL_REVENUE, TOTAL_COGS, TOTAL_PROFIT FROM SALES WHERE STATUS = 'FINALIZED'")
    header_df = pd.DataFrame(header_rows)
    for col in ["TOTAL_REVENUE", "TOTAL_COGS", "TOTAL_PROFIT"]:
        header_df[col] = pd.to_numeric(header_df[col], errors="coerce").fillna(0.0)

    items_df = load_sales_items_df()
    grouped = items_df.groupby("SALE_ID").agg(
        ITEM_REVENUE=("LINE_TOTAL", "sum"),
        ITEM_COGS=("COST_OF_GOODS_SOLD", "sum")
    ).reset_index()

    merged = pd.merge(header_df, grouped, on="SALE_ID", how="left").fillna(0.0)
    merged["REV_DIFF"] = (merged["TOTAL_REVENUE"] - merged["ITEM_REVENUE"]).round(2)
    merged["COGS_DIFF"] = (merged["TOTAL_COGS"] - merged["ITEM_COGS"]).round(2)

    mismatches = merged[(merged["REV_DIFF"].abs() > 0.01) | (merged["COGS_DIFF"].abs() > 0.01)]
    return {
        "check": "Sales Header vs Line Items Reconciliation",
        "passed": bool(len(mismatches) == 0),
        "total_batches_checked": int(len(merged)),
        "mismatches_count": int(len(mismatches)),
        "mismatched_records": mismatches.to_dict(orient="records")
    }

def validate_inventory_reconciliation() -> dict:
    products_df = load_products_df()
    movements_df = load_inventory_movements_df()

    ledger_sum = movements_df.groupby("PRODUCT_ID")["QUANTITY_CHANGE"].sum().reset_index()
    ledger_sum.rename(columns={"QUANTITY_CHANGE": "LEDGER_TOTAL"}, inplace=True)

    merged = pd.merge(products_df, ledger_sum, on="PRODUCT_ID", how="left")
    merged["LEDGER_TOTAL"] = merged["LEDGER_TOTAL"].fillna(0.0)
    merged["STOCK_DIFF"] = (merged["CURRENT_STOCK"] - merged["LEDGER_TOTAL"]).round(3)

    mismatches = merged[merged["STOCK_DIFF"].abs() > 0.001]
    return {
        "check": "Double-entry Inventory Ledger vs Product Stock",
        "passed": bool(len(mismatches) == 0),
        "total_products_checked": int(len(merged)),
        "mismatches_count": int(len(mismatches)),
        "mismatches": mismatches[["PRODUCT_CODE", "PRODUCT_NAME", "CURRENT_STOCK", "LEDGER_TOTAL", "STOCK_DIFF"]].to_dict(orient="records")
    }

def validate_gross_profit_accounting() -> dict:
    items_df = load_sales_items_df()
    items_df["CALC_PROFIT"] = (items_df["LINE_TOTAL"] - items_df["COST_OF_GOODS_SOLD"]).round(2)
    
    total_rev = round(float(items_df["LINE_TOTAL"].sum()), 2)
    total_cogs = round(float(items_df["COST_OF_GOODS_SOLD"].sum()), 2)
    total_calc_profit = round(float(items_df["CALC_PROFIT"].sum()), 2)
    
    expected_profit = round(total_rev - total_cogs, 2)
    is_reconciled = bool(abs(total_calc_profit - expected_profit) < 0.01)

    return {
        "check": "Gross Profit Consistency (Revenue - COGS)",
        "passed": is_reconciled,
        "total_revenue": total_rev,
        "total_cogs": total_cogs,
        "gross_profit": total_calc_profit,
        "discrepancy": round(total_calc_profit - expected_profit, 2)
    }

def run_all_checks() -> dict:
    return {
        "sales": validate_sales_reconciliation(),
        "inventory": validate_inventory_reconciliation(),
        "profit": validate_gross_profit_accounting()
    }

if __name__ == "__main__":
    import json
    print(json.dumps(run_all_checks(), indent=2))
