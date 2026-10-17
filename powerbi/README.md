# Power BI Integration & Dashboard Setup Guide

This guide walks you through importing the generated datasets into Microsoft Power BI Desktop, defining relationships, applying DAX business measures, and building the 6-page interactive retail intelligence report.

---

## 1. Prerequisites
- **Microsoft Power BI Desktop** (Free download from [powerbi.microsoft.com](https://powerbi.microsoft.com)).
- Datasets generated from Oracle via `python python_analytics/export_datasets.py`.
- Source datasets are located in `powerbi/datasets/`:
  - `daily_sales_summary.csv`
  - `monthly_sales_summary.csv`
  - `product_performance.csv`
  - `category_performance.csv`
  - `inventory_summary.csv`
  - `wastage_analysis.csv`
  - `profit_analysis.csv`
  - `period_comparison.csv`

---

## 2. Ingesting Datasets into Power BI Desktop

1. Open **Power BI Desktop**.
2. Click **Get data** -> **Text/CSV**.
3. Navigate to `powerbi/datasets/` and select all 8 CSV files one by one.
4. Click **Load** for each table.

---

## 3. Configuring Relationships (Data Modeling)

Navigate to the **Model View** tab in Power BI Desktop and confirm the following relationships:
- `product_performance[PRODUCT_ID]` 1 -> Many `inventory_summary[PRODUCT_ID]`
- `category_performance[CATEGORY_NAME]` 1 -> Many `product_performance[CATEGORY_NAME]`
- `category_performance[CATEGORY_NAME]` 1 -> Many `wastage_analysis[CATEGORY_NAME]`

*(Refer to `powerbi/data_model.md` for complete Star Schema definitions).*

---

## 4. Creating DAX Business Measures

Click **New Measure** on the Home Ribbon and create the key measures from `powerbi/dax_measures.md`:

```dax
Total Revenue = SUM(daily_sales_summary[TOTAL_REVENUE])
Total COGS = SUM(daily_sales_summary[TOTAL_COGS])
Gross Profit = [Total Revenue] - [Total COGS]
Gross Profit Margin % = DIVIDE([Gross Profit], [Total Revenue], 0) * 100
Closing Stock Value = SUM(inventory_summary[INVENTORY_VALUE])
Total Wastage Cost = SUM(wastage_analysis[TOTAL_WASTAGE_LOSS])
```

---

## 5. Visual Layout & Pages

Follow the detailed visual layouts documented in `powerbi/dashboard_specification.md` to configure the 6 report pages:
1. **Page 1: Executive Overview** (KPI ribbon, Revenue trend, Category share donut).
2. **Page 2: Product Performance** (Top 10 products by revenue & profit, Slow-moving inventory table).
3. **Page 3: Inventory & Stock** (Low stock reorder alerts with phone numbers, valuation breakdown).
4. **Page 4: Fruits & Vegetables** (Perishables comparison, Spoilage loss by reason).
5. **Page 5: Monthly Business Comparison** (Month-to-Date vs Prior Month, Revenue & Profit growth %).
6. **Page 6: Purchases & Suppliers** (Procurement costs by vendor, Order history).

---

## 6. Scheduled Refresh & Direct Oracle Connectivity

To connect Power BI Desktop directly to Oracle 10g XE:
1. Ensure the Oracle client or 32-bit/64-bit ODBC driver `Oracle in XE` is selected.
2. In Power BI, choose **Get data** -> **Oracle database**.
3. Server: `127.0.0.1:1521/XE`.
4. User: `RETAIL_ADMIN`, Password: `retail123`.
5. DirectQuery or Import: Select views `VW_DAILY_SALES_SUMMARY`, `VW_PRODUCT_PERFORMANCE`, `VW_INVENTORY_VALUATION`.
