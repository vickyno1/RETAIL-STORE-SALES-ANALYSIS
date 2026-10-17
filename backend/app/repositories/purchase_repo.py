from datetime import datetime
from app.repositories.oracle_db import db, OracleError

class PurchaseRepo:
    @staticmethod
    def list_purchases(supplier_id=None, start_date=None, end_date=None, status=None, limit=50):
        conditions = []
        params = {}
        
        if supplier_id:
            conditions.append("p.SUPPLIER_ID = :supplier_id")
            params["supplier_id"] = int(supplier_id)
            
        if status and status.upper() != "ALL":
            conditions.append("p.STATUS = :status")
            params["status"] = status.upper()
            
        if start_date:
            conditions.append("p.PURCHASE_DATE >= TO_DATE(:start_date, 'YYYY-MM-DD')")
            params["start_date"] = start_date
            
        if end_date:
            conditions.append("p.PURCHASE_DATE <= TO_DATE(:end_date, 'YYYY-MM-DD')")
            params["end_date"] = end_date
            
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        sql = f"""
        SELECT * FROM (
            SELECT 
                p.PURCHASE_ID,
                p.PURCHASE_REF,
                p.SUPPLIER_ID,
                s.SUPPLIER_NAME,
                s.CITY AS SUPPLIER_CITY,
                p.PURCHASE_DATE,
                p.TOTAL_AMOUNT,
                p.STATUS,
                p.NOTES,
                u.FULL_NAME AS CREATED_BY_NAME,
                (SELECT COUNT(*) FROM PURCHASE_ITEMS pi WHERE pi.PURCHASE_ID = p.PURCHASE_ID) AS ITEM_COUNT,
                (SELECT SUM(QUANTITY) FROM PURCHASE_ITEMS pi WHERE pi.PURCHASE_ID = p.PURCHASE_ID) AS TOTAL_QUANTITY,
                p.CREATED_AT
            FROM PURCHASES p
            JOIN SUPPLIERS s ON p.SUPPLIER_ID = s.SUPPLIER_ID
            LEFT JOIN USERS u ON p.CREATED_BY = u.USER_ID
            {where_clause}
            ORDER BY p.PURCHASE_DATE DESC, p.PURCHASE_ID DESC
        ) WHERE ROWNUM <= {int(limit)}
        """
        return db.query(sql, params)

    @staticmethod
    def get_by_id(purchase_id):
        sql = """
        SELECT 
            p.PURCHASE_ID,
            p.PURCHASE_REF,
            p.SUPPLIER_ID,
            s.SUPPLIER_NAME,
            s.PHONE AS SUPPLIER_PHONE,
            s.CITY AS SUPPLIER_CITY,
            p.PURCHASE_DATE,
            p.TOTAL_AMOUNT,
            p.STATUS,
            p.NOTES,
            u.FULL_NAME AS CREATED_BY_NAME,
            p.CREATED_AT
        FROM PURCHASES p
        JOIN SUPPLIERS s ON p.SUPPLIER_ID = s.SUPPLIER_ID
        LEFT JOIN USERS u ON p.CREATED_BY = u.USER_ID
        WHERE p.PURCHASE_ID = :purchase_id
        """
        purchase = db.query_one(sql, {"purchase_id": int(purchase_id)})
        if not purchase:
            return None

        items_sql = """
        SELECT 
            pi.PURCHASE_ITEM_ID,
            pi.PURCHASE_ID,
            pi.PRODUCT_ID,
            pr.PRODUCT_CODE,
            pr.PRODUCT_NAME,
            c.CATEGORY_NAME,
            pr.UNIT,
            pi.QUANTITY,
            pi.UNIT_COST,
            pi.DISCOUNT_AMOUNT,
            pi.LINE_TOTAL
        FROM PURCHASE_ITEMS pi
        JOIN PRODUCTS pr ON pi.PRODUCT_ID = pr.PRODUCT_ID
        JOIN CATEGORIES c ON pr.CATEGORY_ID = c.CATEGORY_ID
        WHERE pi.PURCHASE_ID = :purchase_id
        ORDER BY c.CATEGORY_NAME ASC, pr.PRODUCT_NAME ASC
        """
        purchase["ITEMS"] = db.query(items_sql, {"purchase_id": int(purchase_id)})
        return purchase

    @staticmethod
    def create_purchase(supplier_id, purchase_date, items, notes="", user_id=1):
        if not items:
            raise OracleError("Cannot record a purchase with no items.")

        ref_date = purchase_date.replace("-", "") if isinstance(purchase_date, str) else purchase_date.strftime("%Y%m%d")
        cnt_row = db.query_one("SELECT COUNT(*) AS C FROM PURCHASES WHERE TO_CHAR(PURCHASE_DATE, 'YYYYMMDD') = :d", {"d": ref_date})
        cnt = cnt_row["C"] if cnt_row else 0
        purchase_ref = f"PUR-{ref_date}-{int(cnt) + 1:02d}"

        # Insert Header
        db.execute("""
        INSERT INTO PURCHASES (
            PURCHASE_REF, SUPPLIER_ID, PURCHASE_DATE, TOTAL_AMOUNT, STATUS, NOTES, CREATED_BY
        ) VALUES (
            :purchase_ref, :supplier_id, TO_DATE(:purchase_date, 'YYYY-MM-DD'),
            0, 'COMPLETED', :notes, :user_id
        )
        """, {
            "purchase_ref": purchase_ref,
            "supplier_id": int(supplier_id),
            "purchase_date": purchase_date,
            "notes": notes,
            "user_id": user_id
        })

        header = db.query_one("SELECT PURCHASE_ID FROM PURCHASES WHERE PURCHASE_REF = :ref", {"ref": purchase_ref})
        purchase_id = header["PURCHASE_ID"]

        # Insert items and calculate moving average cost
        for item in items:
            qty = float(item.get("quantity", 0))
            if qty <= 0:
                continue
            
            pid = int(item["product_id"])
            unit_cost = float(item["unit_cost"])
            discount = float(item.get("discount_amount", 0))

            proc_sql = """
            BEGIN
                RECORD_PURCHASE_ITEM(
                    p_purchase_id => :purchase_id,
                    p_product_id => :product_id,
                    p_quantity => :quantity,
                    p_unit_cost => :unit_cost,
                    p_discount_amount => :discount,
                    p_user_id => :user_id
                );
            END;
            """
            db.execute_plsql(proc_sql, {
                "purchase_id": purchase_id,
                "product_id": pid,
                "quantity": qty,
                "unit_cost": unit_cost,
                "discount": discount,
                "user_id": user_id
            })

        return PurchaseRepo.get_by_id(purchase_id)

    @staticmethod
    def reverse_purchase(purchase_id, reason="Purchase reversal requested", user_id=1):
        proc_sql = """
        BEGIN
            RETAIL_PKG.REVERSE_PURCHASE(
                p_purchase_id => :purchase_id,
                p_reason => :reason,
                p_user_id => :user_id
            );
        END;
        """
        db.execute_plsql(proc_sql, {
            "purchase_id": int(purchase_id),
            "reason": reason,
            "user_id": user_id
        })
        return PurchaseRepo.get_by_id(purchase_id)
