from app.repositories.oracle_db import db, OracleError

class InventoryRepo:
    @staticmethod
    def list_movements(product_id=None, movement_type=None, start_date=None, end_date=None, limit=100):
        conditions = []
        params = {}
        
        if product_id:
            conditions.append("m.PRODUCT_ID = :product_id")
            params["product_id"] = int(product_id)
            
        if movement_type and movement_type.upper() != "ALL":
            conditions.append("m.MOVEMENT_TYPE = :m_type")
            params["m_type"] = movement_type.upper()
            
        if start_date:
            conditions.append("m.MOVEMENT_DATE >= TO_DATE(:start_date, 'YYYY-MM-DD')")
            params["start_date"] = start_date
            
        if end_date:
            conditions.append("m.MOVEMENT_DATE <= TO_DATE(:end_date, 'YYYY-MM-DD 23:59:59', 'YYYY-MM-DD HH24:MI:SS')")
            params["end_date"] = end_date
            
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        sql = f"""
        SELECT * FROM (
            SELECT 
                m.MOVEMENT_ID,
                m.PRODUCT_ID,
                p.PRODUCT_CODE,
                p.PRODUCT_NAME,
                c.CATEGORY_NAME,
                p.UNIT,
                m.MOVEMENT_DATE,
                m.MOVEMENT_TYPE,
                m.QUANTITY_CHANGE,
                m.UNIT_COST,
                ROUND(m.QUANTITY_CHANGE * m.UNIT_COST, 2) AS TOTAL_MOVEMENT_VALUE,
                m.REFERENCE_TYPE,
                m.REFERENCE_ID,
                m.REASON,
                u.FULL_NAME AS CREATED_BY_NAME,
                m.CREATED_AT
            FROM INVENTORY_MOVEMENTS m
            JOIN PRODUCTS p ON m.PRODUCT_ID = p.PRODUCT_ID
            JOIN CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID
            LEFT JOIN USERS u ON m.CREATED_BY = u.USER_ID
            {where_clause}
            ORDER BY m.MOVEMENT_DATE DESC, m.MOVEMENT_ID DESC
        ) WHERE ROWNUM <= {int(limit)}
        """
        return db.query(sql, params)

    @staticmethod
    def adjust_stock(product_id, new_stock, reason, user_id=1):
        sql = """
        DECLARE
            v_mid NUMBER;
        BEGIN
            RETAIL_PKG.ADJUST_STOCK(
                p_product_id => :product_id,
                p_new_stock => :new_stock,
                p_reason => :reason,
                p_user_id => :user_id,
                p_movement_id => v_mid
            );
        END;
        """
        db.execute_plsql(sql, {
            "product_id": int(product_id),
            "new_stock": float(new_stock),
            "reason": reason,
            "user_id": user_id
        })
        return db.query_one("SELECT * FROM PRODUCTS WHERE PRODUCT_ID = :pid", {"pid": int(product_id)})

    @staticmethod
    def record_wastage(product_id, waste_date, quantity, reason, notes="", user_id=1):
        sql = """
        DECLARE
            v_wid NUMBER;
        BEGIN
            RETAIL_PKG.RECORD_WASTAGE(
                p_product_id => :product_id,
                p_waste_date => TO_DATE(:waste_date, 'YYYY-MM-DD'),
                p_quantity => :quantity,
                p_reason => :reason,
                p_notes => :notes,
                p_user_id => :user_id,
                p_wastage_id => v_wid
            );
        END;
        """
        db.execute_plsql(sql, {
            "product_id": int(product_id),
            "waste_date": waste_date,
            "quantity": float(quantity),
            "reason": reason,
            "notes": notes,
            "user_id": user_id
        })
        return db.query_one("""
        SELECT w.*, p.PRODUCT_NAME, p.PRODUCT_CODE 
        FROM WASTAGE w
        JOIN PRODUCTS p ON w.PRODUCT_ID = p.PRODUCT_ID
        WHERE w.PRODUCT_ID = :pid 
        ORDER BY w.WASTAGE_ID DESC
        """, {"pid": int(product_id)})

    @staticmethod
    def list_wastage(start_date=None, end_date=None, limit=50):
        conditions = []
        params = {}
        
        if start_date:
            conditions.append("w.WASTAGE_DATE >= TO_DATE(:start_date, 'YYYY-MM-DD')")
            params["start_date"] = start_date
            
        if end_date:
            conditions.append("w.WASTAGE_DATE <= TO_DATE(:end_date, 'YYYY-MM-DD')")
            params["end_date"] = end_date
            
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        sql = f"""
        SELECT * FROM (
            SELECT 
                w.WASTAGE_ID,
                w.PRODUCT_ID,
                p.PRODUCT_CODE,
                p.PRODUCT_NAME,
                c.CATEGORY_NAME,
                p.UNIT,
                w.WASTAGE_DATE,
                w.QUANTITY,
                w.UNIT_COST,
                w.TOTAL_COST,
                w.REASON,
                w.NOTES,
                u.FULL_NAME AS CREATED_BY_NAME
            FROM WASTAGE w
            JOIN PRODUCTS p ON w.PRODUCT_ID = p.PRODUCT_ID
            JOIN CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID
            LEFT JOIN USERS u ON w.CREATED_BY = u.USER_ID
            {where_clause}
            ORDER BY w.WASTAGE_DATE DESC, w.WASTAGE_ID DESC
        ) WHERE ROWNUM <= {int(limit)}
        """
        return db.query(sql, params)

    @staticmethod
    def get_low_stock_alerts():
        sql = "SELECT * FROM VW_LOW_STOCK_ALERTS ORDER BY (REORDER_LEVEL - CURRENT_STOCK) DESC"
        return db.query(sql)

    @staticmethod
    def get_inventory_valuation():
        sql = "SELECT * FROM VW_INVENTORY_VALUATION ORDER BY INVENTORY_VALUE DESC"
        return db.query(sql)

    @staticmethod
    def reconcile_inventory():
        """
        Reconciles double-entry inventory ledger with current stock.
        Returns products with their ledger sum vs current stock.
        """
        sql = """
        SELECT 
            p.PRODUCT_ID,
            p.PRODUCT_CODE,
            p.PRODUCT_NAME,
            p.UNIT,
            p.CURRENT_STOCK,
            NVL(ledger.NET_MOVEMENT, 0) AS LEDGER_TOTAL,
            ROUND(p.CURRENT_STOCK - NVL(ledger.NET_MOVEMENT, 0), 3) AS DISCREPANCY,
            CASE 
                WHEN ABS(p.CURRENT_STOCK - NVL(ledger.NET_MOVEMENT, 0)) < 0.001 THEN 'RECONCILED'
                ELSE 'MISMATCH'
            END AS STATUS
        FROM PRODUCTS p
        LEFT JOIN (
            SELECT PRODUCT_ID, SUM(QUANTITY_CHANGE) AS NET_MOVEMENT
            FROM INVENTORY_MOVEMENTS
            GROUP BY PRODUCT_ID
        ) ledger ON p.PRODUCT_ID = ledger.PRODUCT_ID
        WHERE p.STATUS = 'ACTIVE'
        ORDER BY DISCREPANCY DESC, p.PRODUCT_CODE ASC
        """
        return db.query(sql)
