from datetime import datetime
from app.repositories.oracle_db import db, OracleError

class SalesRepo:
    @staticmethod
    def list_sales(start_date=None, end_date=None, status=None, limit=50):
        conditions = []
        params = {}
        
        if status and status.upper() != "ALL":
            conditions.append("s.STATUS = :status")
            params["status"] = status.upper()
            
        if start_date:
            conditions.append("s.SALE_DATE >= TO_DATE(:start_date, 'YYYY-MM-DD')")
            params["start_date"] = start_date
            
        if end_date:
            conditions.append("s.SALE_DATE <= TO_DATE(:end_date, 'YYYY-MM-DD')")
            params["end_date"] = end_date
            
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        sql = f"""
        SELECT * FROM (
            SELECT 
                s.SALE_ID,
                s.SALE_REF,
                s.SALE_DATE,
                s.TOTAL_REVENUE,
                s.TOTAL_COGS,
                s.TOTAL_PROFIT,
                CASE 
                    WHEN s.TOTAL_REVENUE > 0 
                    THEN ROUND((s.TOTAL_PROFIT / s.TOTAL_REVENUE) * 100, 2)
                    ELSE 0 
                END AS PROFIT_MARGIN_PCT,
                s.STATUS,
                s.NOTES,
                u.FULL_NAME AS CREATED_BY_NAME,
                (SELECT COUNT(*) FROM SALES_ITEMS si WHERE si.SALE_ID = s.SALE_ID) AS ITEM_COUNT,
                (SELECT SUM(QUANTITY) FROM SALES_ITEMS si WHERE si.SALE_ID = s.SALE_ID) AS TOTAL_QUANTITY,
                s.CREATED_AT
            FROM SALES s
            LEFT JOIN USERS u ON s.CREATED_BY = u.USER_ID
            {where_clause}
            ORDER BY s.SALE_DATE DESC, s.SALE_ID DESC
        ) WHERE ROWNUM <= {int(limit)}
        """
        return db.query(sql, params)

    @staticmethod
    def get_by_id(sale_id):
        sql = """
        SELECT 
            s.SALE_ID,
            s.SALE_REF,
            s.SALE_DATE,
            s.TOTAL_REVENUE,
            s.TOTAL_COGS,
            s.TOTAL_PROFIT,
            CASE 
                WHEN s.TOTAL_REVENUE > 0 
                THEN ROUND((s.TOTAL_PROFIT / s.TOTAL_REVENUE) * 100, 2)
                ELSE 0 
            END AS PROFIT_MARGIN_PCT,
            s.STATUS,
            s.NOTES,
            u.FULL_NAME AS CREATED_BY_NAME,
            s.CREATED_AT
        FROM SALES s
        LEFT JOIN USERS u ON s.CREATED_BY = u.USER_ID
        WHERE s.SALE_ID = :sale_id
        """
        sale = db.query_one(sql, {"sale_id": int(sale_id)})
        if not sale:
            return None

        items_sql = """
        SELECT 
            si.SALES_ITEM_ID,
            si.SALE_ID,
            si.PRODUCT_ID,
            p.PRODUCT_CODE,
            p.PRODUCT_NAME,
            c.CATEGORY_NAME,
            p.UNIT,
            si.QUANTITY,
            si.SELLING_PRICE,
            si.UNIT_COST_AT_SALE,
            si.DISCOUNT_AMOUNT,
            si.LINE_TOTAL,
            si.COST_OF_GOODS_SOLD,
            ROUND(si.LINE_TOTAL - si.COST_OF_GOODS_SOLD, 2) AS LINE_PROFIT,
            CASE 
                WHEN si.LINE_TOTAL > 0 
                THEN ROUND(((si.LINE_TOTAL - si.COST_OF_GOODS_SOLD) / si.LINE_TOTAL) * 100, 2)
                ELSE 0 
            END AS LINE_MARGIN_PCT
        FROM SALES_ITEMS si
        JOIN PRODUCTS p ON si.PRODUCT_ID = p.PRODUCT_ID
        JOIN CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID
        WHERE si.SALE_ID = :sale_id
        ORDER BY c.CATEGORY_NAME ASC, p.PRODUCT_NAME ASC
        """
        sale["ITEMS"] = db.query(items_sql, {"sale_id": int(sale_id)})
        return sale

    @staticmethod
    def create_daily_sales(sale_date, items, notes="", user_id=1, status="FINALIZED"):
        """
        Records a daily sales entry transaction.
        items: list of dicts with product_id, quantity, selling_price, discount_amount (optional)
        """
        if not items:
            raise OracleError("Cannot create a sales entry with no items.")

        # Check existing finalized sale for the same date if needed, or create new batch reference
        ref_date = sale_date.replace("-", "") if isinstance(sale_date, str) else sale_date.strftime("%Y%m%d")
        cnt_row = db.query_one("SELECT COUNT(*) AS C FROM SALES WHERE TO_CHAR(SALE_DATE, 'YYYYMMDD') = :d", {"d": ref_date})
        cnt = cnt_row["C"] if cnt_row else 0
        sale_ref = f"SALE-{ref_date}-{int(cnt) + 1:02d}"

        # Insert Header
        header_sql = """
        DECLARE
            v_sid NUMBER;
        BEGIN
            SELECT SEQ_SALES_ID.NEXTVAL INTO v_sid FROM DUAL;
            INSERT INTO SALES (
                SALE_ID, SALE_REF, SALE_DATE, TOTAL_REVENUE, TOTAL_COGS,
                TOTAL_PROFIT, STATUS, NOTES, CREATED_BY
            ) VALUES (
                v_sid, :sale_ref, TO_DATE(:sale_date, 'YYYY-MM-DD'),
                0, 0, 0, :status, :notes, :user_id
            );
            SELECT v_sid INTO :out_sid FROM DUAL;
        END;
        """
        # Execute header and fetch created sale_id
        db.execute("""
        INSERT INTO SALES (
            SALE_REF, SALE_DATE, TOTAL_REVENUE, TOTAL_COGS, TOTAL_PROFIT, STATUS, NOTES, CREATED_BY
        ) VALUES (
            :sale_ref, TO_DATE(:sale_date, 'YYYY-MM-DD'), 0, 0, 0, :status, :notes, :user_id
        )
        """, {
            "sale_ref": sale_ref,
            "sale_date": sale_date,
            "status": status,
            "notes": notes,
            "user_id": user_id
        })
        
        sale_header = db.query_one("SELECT SALE_ID FROM SALES WHERE SALE_REF = :sale_ref", {"sale_ref": sale_ref})
        sale_id = sale_header["SALE_ID"]

        # If FINALIZED, deduct stock and calculate COGS using RECORD_SALE_ITEM procedure
        # If DRAFT, insert into line items without deducting inventory
        for item in items:
            qty = float(item.get("quantity", 0))
            if qty <= 0:
                continue
            
            pid = int(item["product_id"])
            price = float(item.get("selling_price", 0))
            discount = float(item.get("discount_amount", 0))

            if status == "FINALIZED":
                proc_sql = """
                BEGIN
                    RECORD_SALE_ITEM(
                        p_sale_id => :sale_id,
                        p_product_id => :product_id,
                        p_quantity => :quantity,
                        p_selling_price => :price,
                        p_discount_amount => :discount,
                        p_user_id => :user_id
                    );
                END;
                """
                db.execute_plsql(proc_sql, {
                    "sale_id": sale_id,
                    "product_id": pid,
                    "quantity": qty,
                    "price": price,
                    "discount": discount,
                    "user_id": user_id
                })
            else:
                # DRAFT: save line items without inventory deduction
                line_total = max(0, round((qty * price) - discount, 2))
                prod = db.query_one("SELECT CURRENT_AVERAGE_COST FROM PRODUCTS WHERE PRODUCT_ID = :pid", {"pid": pid})
                avg_cost = prod["CURRENT_AVERAGE_COST"] if prod else 0
                cogs = round(qty * avg_cost, 2)
                db.execute("""
                INSERT INTO SALES_ITEMS (
                    SALE_ID, PRODUCT_ID, QUANTITY, SELLING_PRICE, UNIT_COST_AT_SALE,
                    DISCOUNT_AMOUNT, LINE_TOTAL, COST_OF_GOODS_SOLD
                ) VALUES (
                    :sale_id, :pid, :qty, :price, :avg_cost, :discount, :lt, :cogs
                )
                """, {
                    "sale_id": sale_id, "pid": pid, "qty": qty, "price": price,
                    "avg_cost": avg_cost, "discount": discount, "lt": line_total, "cogs": cogs
                })
                db.execute("""
                UPDATE SALES
                SET TOTAL_REVENUE = TOTAL_REVENUE + :lt,
                    TOTAL_COGS = TOTAL_COGS + :cogs,
                    TOTAL_PROFIT = TOTAL_PROFIT + (:lt - :cogs)
                WHERE SALE_ID = :sale_id
                """, {"lt": line_total, "cogs": cogs, "sale_id": sale_id})

        return SalesRepo.get_by_id(sale_id)

    @staticmethod
    def reverse_sale(sale_id, reason="Reversal requested by shop owner", user_id=1):
        proc_sql = """
        BEGIN
            RETAIL_PKG.REVERSE_SALE(
                p_sale_id => :sale_id,
                p_reason => :reason,
                p_user_id => :user_id
            );
        END;
        """
        db.execute_plsql(proc_sql, {
            "sale_id": int(sale_id),
            "reason": reason,
            "user_id": user_id
        })
        return SalesRepo.get_by_id(sale_id)
