"""
Data Loader: Extracts relational tables from Oracle 10g into Pandas DataFrames.
Uses ISO TO_CHAR formatting for dates to guarantee exact headers and fast parsing.
"""

import pandas as pd
from oracle_connection import get_db

db = get_db()

def load_products_df() -> pd.DataFrame:
    rows = db.query("""
    SELECT 
        p.PRODUCT_ID, p.PRODUCT_CODE, p.PRODUCT_NAME, p.CATEGORY_ID,
        c.CATEGORY_NAME, p.UNIT, p.PURCHASE_COST, p.SELLING_PRICE,
        p.CURRENT_STOCK, p.REORDER_LEVEL, p.CURRENT_AVERAGE_COST,
        p.PREFERRED_SUPPLIER_ID, p.STATUS,
        TO_CHAR(p.CREATED_AT, 'YYYY-MM-DD') AS CREATED_AT,
        TO_CHAR(p.UPDATED_AT, 'YYYY-MM-DD') AS UPDATED_AT
    FROM PRODUCTS p
    JOIN CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID
    """)
    df = pd.DataFrame(rows)
    if not df.empty:
        for col in ["PURCHASE_COST", "SELLING_PRICE", "CURRENT_STOCK", "REORDER_LEVEL", "CURRENT_AVERAGE_COST"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    return df

def load_sales_items_df() -> pd.DataFrame:
    rows = db.query("""
    SELECT 
        si.SALES_ITEM_ID, si.SALE_ID, s.SALE_REF,
        TO_CHAR(s.SALE_DATE, 'YYYY-MM-DD') AS SALE_DATE,
        s.STATUS, si.PRODUCT_ID, p.PRODUCT_CODE, p.PRODUCT_NAME,
        c.CATEGORY_NAME, si.QUANTITY, si.SELLING_PRICE,
        si.UNIT_COST_AT_SALE, si.DISCOUNT_AMOUNT,
        si.LINE_TOTAL, si.COST_OF_GOODS_SOLD
    FROM SALES_ITEMS si
    JOIN SALES s ON si.SALE_ID = s.SALE_ID
    JOIN PRODUCTS p ON si.PRODUCT_ID = p.PRODUCT_ID
    JOIN CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID
    WHERE s.STATUS = 'FINALIZED'
    """)
    df = pd.DataFrame(rows)
    if not df.empty:
        for col in ["QUANTITY", "SELLING_PRICE", "UNIT_COST_AT_SALE", "DISCOUNT_AMOUNT", "LINE_TOTAL", "COST_OF_GOODS_SOLD"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
        df["SALE_DATE"] = pd.to_datetime(df["SALE_DATE"], format="%Y-%m-%d", errors="coerce")
    return df

def load_purchases_items_df() -> pd.DataFrame:
    rows = db.query("""
    SELECT 
        pi.PURCHASE_ITEM_ID, pi.PURCHASE_ID, p.PURCHASE_REF,
        TO_CHAR(p.PURCHASE_DATE, 'YYYY-MM-DD') AS PURCHASE_DATE,
        p.SUPPLIER_ID, s.SUPPLIER_NAME, pi.PRODUCT_ID, pr.PRODUCT_CODE,
        pr.PRODUCT_NAME, pi.QUANTITY, pi.UNIT_COST, pi.DISCOUNT_AMOUNT, pi.LINE_TOTAL
    FROM PURCHASE_ITEMS pi
    JOIN PURCHASES p ON pi.PURCHASE_ID = p.PURCHASE_ID
    JOIN SUPPLIERS s ON p.SUPPLIER_ID = s.SUPPLIER_ID
    JOIN PRODUCTS pr ON pi.PRODUCT_ID = pr.PRODUCT_ID
    WHERE p.STATUS = 'COMPLETED'
    """)
    df = pd.DataFrame(rows)
    if not df.empty:
        for col in ["QUANTITY", "UNIT_COST", "DISCOUNT_AMOUNT", "LINE_TOTAL"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
        df["PURCHASE_DATE"] = pd.to_datetime(df["PURCHASE_DATE"], format="%Y-%m-%d", errors="coerce")
    return df

def load_wastage_df() -> pd.DataFrame:
    rows = db.query("""
    SELECT 
        w.WASTAGE_ID, w.PRODUCT_ID, p.PRODUCT_CODE, p.PRODUCT_NAME,
        c.CATEGORY_NAME,
        TO_CHAR(w.WASTAGE_DATE, 'YYYY-MM-DD') AS WASTAGE_DATE,
        w.QUANTITY, w.UNIT_COST, w.TOTAL_COST, w.REASON
    FROM WASTAGE w
    JOIN PRODUCTS p ON w.PRODUCT_ID = p.PRODUCT_ID
    JOIN CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID
    """)
    df = pd.DataFrame(rows)
    if not df.empty:
        for col in ["QUANTITY", "UNIT_COST", "TOTAL_COST"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
        df["WASTAGE_DATE"] = pd.to_datetime(df["WASTAGE_DATE"], format="%Y-%m-%d", errors="coerce")
    return df

def load_expenses_df() -> pd.DataFrame:
    rows = db.query("""
    SELECT 
        EXPENSE_ID,
        TO_CHAR(EXPENSE_DATE, 'YYYY-MM-DD') AS EXPENSE_DATE,
        CATEGORY, AMOUNT, DESCRIPTION 
    FROM OPERATING_EXPENSES
    """)
    df = pd.DataFrame(rows)
    if not df.empty:
        df["AMOUNT"] = pd.to_numeric(df["AMOUNT"], errors="coerce").fillna(0.0)
        df["EXPENSE_DATE"] = pd.to_datetime(df["EXPENSE_DATE"], format="%Y-%m-%d", errors="coerce")
    return df

def load_inventory_movements_df() -> pd.DataFrame:
    rows = db.query("""
    SELECT 
        m.MOVEMENT_ID, m.PRODUCT_ID, p.PRODUCT_CODE, p.PRODUCT_NAME,
        TO_CHAR(m.MOVEMENT_DATE, 'YYYY-MM-DD') AS MOVEMENT_DATE,
        m.MOVEMENT_TYPE, m.QUANTITY_CHANGE, m.UNIT_COST,
        m.REFERENCE_TYPE, m.REFERENCE_ID, m.REASON
    FROM INVENTORY_MOVEMENTS m
    JOIN PRODUCTS p ON m.PRODUCT_ID = p.PRODUCT_ID
    """)
    df = pd.DataFrame(rows)
    if not df.empty:
        for col in ["QUANTITY_CHANGE", "UNIT_COST"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
        df["MOVEMENT_DATE"] = pd.to_datetime(df["MOVEMENT_DATE"], format="%Y-%m-%d", errors="coerce")
    return df
