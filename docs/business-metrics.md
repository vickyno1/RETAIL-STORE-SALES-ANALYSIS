# Business Metrics and Financial Formulations

This document specifies the exact mathematical models and accounting rules implemented in the **Smart Retail Sales, Inventory & Profit Analytics System**.

---

## 1. Inventory Cost Accounting: Moving Weighted-Average Method

In retail produce and groceries, fresh inventory arrives periodically at varying wholesale mandi prices. To prevent distorting profit margins, the system applies the **Moving Weighted-Average Cost (MWAC)** method rather than simple averaging or static list prices.

### Formula
Whenever an inward purchase shipment arrives:

$$\text{New Average Cost} = \frac{(\text{Current Stock} \times \text{Current Average Cost}) + (\text{Inward Quantity} \times \text{Purchase Unit Cost})}{\text{Current Stock} + \text{Inward Quantity}}$$

### Example
1. Opening stock: $20\text{ kg}$ Tomatoes @ ₹$20/\text{kg}$ (Inventory Value = ₹$400$).
2. Inward purchase: $30\text{ kg}$ @ ₹$25/\text{kg}$ (Purchase Value = ₹$750$).
3. New weighted-average cost:
   $$\text{New Cost} = \frac{400 + 750}{20 + 30} = \frac{1150}{50} = ₹23.00/\text{kg}$$

---

## 2. Daily Sales and Cost of Goods Sold (COGS)

When daily sales are submitted:
1. **Line Revenue:**
   $$\text{Line Revenue} = \text{Quantity Sold} \times \text{Selling Price}$$
2. **Line COGS:**
   $$\text{Line COGS} = \text{Quantity Sold} \times \text{Unit Cost Basis at Sale Time}$$
3. **Line Gross Profit:**
   $$\text{Line Gross Profit} = \text{Line Revenue} - \text{Line COGS}$$
4. **Gross Margin Percentage:**
   $$\text{Gross Margin \%} = \frac{\text{Line Gross Profit}}{\text{Line Revenue}} \times 100$$

> **Accounting Rule:** Stock purchases are **not** immediately counted as expenses in the profit report. Purchased inventory remains on the balance sheet as an asset until sold, spoiled, or written off.

---

## 3. Net Store Profit vs Gross Profit

The shop owner calculates bottom-line net profit by subtracting non-merchandise losses and operational overheads from gross profit:

$$\text{Net Profit} = \text{Total Gross Profit} - \text{Perishable Wastage Cost} - \text{Operating Expenses (OPEX)}$$

Where:
- **Total Gross Profit:** $\sum (\text{Revenue} - \text{COGS})$ across all finalized sales batches.
- **Perishable Wastage Cost:** $\sum (\text{Wasted Quantity} \times \text{Unit Purchase Cost})$ logged under spoilage, transit damage, or quality rejections.
- **Operating Expenses:** $\sum \text{Amount}$ logged under shop rent, electricity, helper wages, packaging materials, and maintenance.

---

## 4. Reorder Recommendation Logic

To answer *"Which items should I purchase tomorrow?"*, the system evaluates current inventory against safety reorder thresholds:

$$\text{Stock Deficit} = \max(0, (\text{Reorder Level} \times 2) - \text{Current Stock})$$

$$\text{Estimated Reorder Capital} = \text{Stock Deficit} \times \text{Last Known Purchase Cost}$$

- **Urgency Classification:**
  - **Critical Alert:** $\text{Current Stock} \le 0.25 \times \text{Reorder Level}$ (Risk of stockout within hours).
  - **Standard Reorder:** $\text{Current Stock} \le \text{Reorder Level}$.
  - **Healthy:** $\text{Current Stock} > \text{Reorder Level}$.

---

## 5. Inventory Valuation and Perpetual Ledger Reconciliation

### Valuation
$$\text{Product Inventory Value} = \text{Current Stock} \times \text{Moving Average Purchase Cost}$$

$$\text{Total Shop Inventory Value} = \sum_{\text{all products}} \text{Product Inventory Value}$$

### Perpetual Ledger Reconciliation
Every inventory event must record an entry in `INVENTORY_MOVEMENTS`:
$$\text{Reconciliation Variance} = \text{PRODUCTS.CURRENT\_STOCK} - \sum \text{INVENTORY\_MOVEMENTS.QUANTITY\_CHANGE}$$

If $\text{Variance} = 0$, the ledger is **Perpetually Balanced** and certified auditable.
