# Power BI 6-Page Retail Analytics Dashboard Specification

This document provides visual layout instructions, widget configurations, and chart parameters for building the 6-page interactive business intelligence report in Power BI Desktop.

---

## Page 1: Executive Overview

### Purpose
High-level summary of store financial health, gross margins, and daily sales velocity.

### Visual Components
1. **Top KPI Cards Ribbon (5 Cards):**
   - **Total Net Revenue:** `[Total Revenue]` (formatted as Currency ₹)
   - **Gross Profit:** `[Gross Profit]`
   - **Gross Margin %:** `[Gross Profit Margin %]`
   - **Current Stock Value:** `[Closing Stock Value]`
   - **Wastage Loss:** `[Total Wastage Cost]`
2. **Main Chart (Area / Line Chart):**
   - **Title:** Daily Revenue & Gross Profit Trend
   - **X-Axis:** `Dim_Date[Date]`
   - **Y-Axis:** `[Total Revenue]`, `[Gross Profit]`
   - **Tooltips:** `[Cost of Goods Sold]`, `[Total Quantity Sold]`
3. **Donut Chart:**
   - **Title:** Category Revenue Contribution
   - **Legend:** `Dim_Category[Category_Name]`
   - **Values:** `[Total Revenue]`
4. **Bottom Grid:**
   - **Title:** Recent Daily Sales Batches
   - **Columns:** Sale Date, Batch Ref, Items Sold, Daily Revenue, Daily Profit, Margin %

---

## Page 2: Product Performance & Ranking

### Purpose
Identify hero products, cash cows, slow-moving items, and low-margin products.

### Visual Components
1. **Horizontal Bar Chart:**
   - **Title:** Top 10 Products by Revenue
   - **Y-Axis:** `Dim_Product[Product_Name]`
   - **X-Axis:** `[Total Revenue]`
   - **Data Labels:** On
2. **Horizontal Bar Chart:**
   - **Title:** Top 10 Products by Gross Profit
   - **Y-Axis:** `Dim_Product[Product_Name]`
   - **X-Axis:** `[Gross Profit]`
   - **Color:** Green accent
3. **Scatter Plot / Quadrant Analysis:**
   - **Title:** Margin % vs Quantity Sold (Product Matrix)
   - **X-Axis:** `[Total Quantity Sold]`
   - **Y-Axis:** `[Gross Profit Margin %]`
   - **Details:** `Dim_Product[Product_Name]`
   - **Size:** `[Total Revenue]`
4. **Table:**
   - **Title:** Slow-Moving Inventory Warning (Zero or Low Sales in Last 30 Days)
   - **Columns:** Product Code, Name, Category, Current Stock, Unit Cost, Capital Tied Up

---

## Page 3: Inventory & Stock Management

### Purpose
Prevent stock-outs, monitor reorder levels, and track double-entry inventory ledger movements.

### Visual Components
1. **KPI Banner (3 Cards):**
   - **Total Items in Stock:** `SUM(Dim_Product[CURRENT_STOCK])`
   - **Low Stock Alerts Count:** `[Low Stock Count]`
   - **Total Inventory Capital:** `[Closing Stock Value]`
2. **Table with Conditional Formatting:**
   - **Title:** Real-Time Reorder Alerts & Suggested Orders
   - **Columns:** Code, Product, Category, Stock, Reorder Level, Suggested Order Qty, Preferred Supplier, Supplier Phone
   - **Rules:** Red background when `Current Stock <= Reorder Level`
3. **Clustered Column Chart:**
   - **Title:** Inventory Value by Category
   - **X-Axis:** `Dim_Category[Category_Name]`
   - **Y-Axis:** `[Closing Stock Value]`
4. **Waterfall Chart:**
   - **Title:** Stock Movement Reconciliation
   - **Categories:** Movement Type (Opening Stock, Purchases, Sales, Wastage, Adjustments)
   - **Y-Axis:** Net Quantity Change

---

## Page 4: Fruits & Vegetables Perishables Analysis

### Purpose
Deep dive into perishable categories (Vegetables vs Fruits) and spoilage control.

### Visual Components
1. **Side-by-Side Donut Comparison:**
   - **Left:** Vegetable Revenue vs Profit
   - **Right:** Fruit Revenue vs Profit
2. **Stacked Column Chart:**
   - **Title:** Wastage Loss by Reason & Product
   - **X-Axis:** `Dim_Product[Product_Name]`
   - **Y-Axis:** `[Total Wastage Cost]`
   - **Legend:** `Fact_Wastage[Reason]` ('Spoilage', 'Damage', 'Unsold Perishable')
3. **Decomposition Tree:**
   - **Analyze:** `[Total Wastage Cost]`
   - **Explain by:** Category -> Product Name -> Reason

---

## Page 5: Monthly Business Comparison

### Purpose
Executive period-over-period tracking (Current Month vs Prior Month).

### Visual Components
1. **Comparison KPI Cards (with indicator arrows):**
   - **Current Month Revenue:** with `[Revenue Growth %]`
   - **Current Month Gross Profit:** with `[Profit Growth %]`
   - **Current Month Quantity Sold:** with `[Quantity Growth %]`
2. **Clustered Bar Chart:**
   - **Title:** Monthly Revenue vs Operating Profit
   - **X-Axis:** `Month_Label`
   - **Y-Axis:** Revenue, Gross Profit, Operating Expenses, Net Operating Profit Estimate
3. **Matrix Visual:**
   - **Rows:** Category -> Product
   - **Columns:** Current Period, Previous Period, Variance, % Change

---

## Page 6: Purchases & Supplier Performance

### Purpose
Track procurement costs, supplier reliability, and purchase price variances.

### Visual Components
1. **Bar Chart:**
   - **Title:** Total Purchase Expenditure by Supplier
   - **Y-Axis:** `Dim_Supplier[Supplier_Name]`
   - **X-Axis:** `[Purchase Expenditure]`
2. **Line Chart:**
   - **Title:** Monthly Purchase Outflow Trend
   - **X-Axis:** `Dim_Date[MonthName]`
   - **Y-Axis:** `[Purchase Expenditure]`
3. **Table:**
   - **Title:** Recent Purchase Orders & Receipts
   - **Columns:** Purchase Ref, Date, Supplier, Total Amount, Items Count, Status
