# Power BI DAX Measures Reference

All business logic measures defined below guarantee mathematical reconciliation between SQL, Python, and Power BI dashboards.

---

### 1. Core Financial Measures

#### Total Revenue
```dax
Total Revenue = 
SUM('Fact_DailySales'[LINE_TOTAL])
```

#### Total Quantity Sold
```dax
Total Quantity Sold = 
SUM('Fact_DailySales'[QUANTITY])
```

#### Cost of Goods Sold (COGS)
```dax
Cost of Goods Sold = 
SUM('Fact_DailySales'[COST_OF_GOODS_SOLD])
```

#### Gross Profit
```dax
Gross Profit = 
[Total Revenue] - [Cost of Goods Sold]
```

#### Gross Profit Margin %
```dax
Gross Profit Margin % = 
DIVIDE(
    [Gross Profit],
    [Total Revenue],
    0
) * 100
```

---

### 2. Inventory & Cost Accounting Measures

#### Closing Stock Value
```dax
Closing Stock Value = 
SUMX(
    'Dim_Product',
    'Dim_Product'[CURRENT_STOCK] * 'Dim_Product'[CURRENT_AVERAGE_COST]
)
```

#### Purchase Expenditure
```dax
Purchase Expenditure = 
SUM('Fact_Purchases'[LINE_TOTAL])
```

#### Total Wastage Cost
```dax
Total Wastage Cost = 
SUM('Fact_Wastage'[TOTAL_COST])
```

#### Net Operating Profit Estimate
```dax
Net Operating Profit Estimate = 
[Gross Profit] - [Total Wastage Cost] - SUM('Fact_Expenses'[AMOUNT])
```

---

### 3. Growth & Contribution Measures

#### Previous Period Revenue (Time Intelligence)
```dax
Previous Period Revenue = 
CALCULATE(
    [Total Revenue],
    DATEADD('Dim_Date'[Date], -1, MONTH)
)
```

#### Revenue Growth %
```dax
Revenue Growth % = 
VAR PrevRev = [Previous Period Revenue]
RETURN
IF(
    ISBLANK(PrevRev) || PrevRev = 0,
    BLANK(),
    DIVIDE([Total Revenue] - PrevRev, PrevRev, 0) * 100
)
```

#### Category Revenue Share %
```dax
Category Revenue Share % = 
DIVIDE(
    [Total Revenue],
    CALCULATE([Total Revenue], ALL('Dim_Category')),
    0
) * 100
```

#### Low Stock Product Count
```dax
Low Stock Count = 
CALCULATE(
    COUNTROWS('Dim_Product'),
    FILTER(
        'Dim_Product',
        'Dim_Product'[CURRENT_STOCK] <= 'Dim_Product'[REORDER_LEVEL] &&
        'Dim_Product'[STATUS] = "ACTIVE"
    )
)
```
