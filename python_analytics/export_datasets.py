"""
Power BI Analytical Datasets Exporter
Generates clean, star-schema ready CSV files for Power BI Desktop ingestion.
"""

import os
import pandas as pd
from sales_analysis import (
    daily_sales_summary, monthly_sales_summary,
    product_performance, category_performance
)
from inventory_analysis import inventory_valuation_summary, wastage_analysis_summary
from profit_analysis import profit_and_loss_summary
from period_comparison import run_all_period_comparisons

def export_all(output_dirs=None):
    if output_dirs is None:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        output_dirs = [
            os.path.join(base_dir, "data"),
            os.path.join(base_dir, "powerbi", "datasets")
        ]

    for d in output_dirs:
        os.makedirs(d, exist_ok=True)

    print("[*] Generating Power BI datasets from Oracle 10g XE...")

    datasets = {
        "daily_sales_summary.csv": daily_sales_summary(),
        "monthly_sales_summary.csv": monthly_sales_summary(),
        "product_performance.csv": product_performance(),
        "category_performance.csv": category_performance(),
        "inventory_summary.csv": inventory_valuation_summary(),
        "wastage_analysis.csv": wastage_analysis_summary(),
        "profit_analysis.csv": profit_and_loss_summary(),
    }

    # Period comparison dataset
    pc = run_all_period_comparisons()
    pc_rows = []
    for k, v in pc.items():
        if v:
            pc_rows.append({
                "COMPARISON_TYPE": v.get("period_label"),
                "CURRENT_REVENUE": v["current"]["revenue"],
                "PREVIOUS_REVENUE": v["previous"]["revenue"],
                "REVENUE_GROWTH_PCT": v["growth"]["revenue_growth_pct"],
                "CURRENT_PROFIT": v["current"]["gross_profit"],
                "PREVIOUS_PROFIT": v["previous"]["gross_profit"],
                "PROFIT_GROWTH_PCT": v["growth"]["profit_growth_pct"],
                "CURRENT_QUANTITY": v["current"]["quantity"],
                "PREVIOUS_QUANTITY": v["previous"]["quantity"],
                "QUANTITY_GROWTH_PCT": v["growth"]["quantity_growth_pct"]
            })
    datasets["period_comparison.csv"] = pd.DataFrame(pc_rows)

    for filename, df in datasets.items():
        for d in output_dirs:
            filepath = os.path.join(d, filename)
            df.to_csv(filepath, index=False, encoding="utf-8")
            print(f"  [+] Saved: {filepath} ({len(df)} rows)")

    print("[SUCCESS] Power BI datasets export completed successfully.")

if __name__ == "__main__":
    export_all()
