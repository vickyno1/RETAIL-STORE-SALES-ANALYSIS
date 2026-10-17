from app.repositories.oracle_db import db

class ProductRepo:
    @staticmethod
    def list_products(category_id=None, status="ACTIVE", search=None):
        conditions = []
        params = {}
        
        if status and status.upper() != "ALL":
            conditions.append("p.STATUS = :status")
            params["status"] = status.upper()
            
        if category_id:
            conditions.append("p.CATEGORY_ID = :category_id")
            params["category_id"] = int(category_id)
            
        if search:
            conditions.append("(LOWER(p.PRODUCT_NAME) LIKE :search OR LOWER(p.PRODUCT_CODE) LIKE :search)")
            params["search"] = f"%{search.lower()}%"
            
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        sql = f"""
        SELECT 
            p.PRODUCT_ID,
            p.PRODUCT_CODE,
            p.PRODUCT_NAME,
            p.CATEGORY_ID,
            c.CATEGORY_NAME,
            p.UNIT,
            p.PURCHASE_COST,
            p.SELLING_PRICE,
            p.CURRENT_STOCK,
            p.REORDER_LEVEL,
            p.CURRENT_AVERAGE_COST,
            ROUND(p.CURRENT_STOCK * p.CURRENT_AVERAGE_COST, 2) AS INVENTORY_VALUE,
            CASE 
                WHEN p.SELLING_PRICE > 0 
                THEN ROUND(((p.SELLING_PRICE - p.CURRENT_AVERAGE_COST) / p.SELLING_PRICE) * 100, 2)
                ELSE 0 
            END AS PROFIT_MARGIN_PCT,
            p.PREFERRED_SUPPLIER_ID,
            s.SUPPLIER_NAME AS PREFERRED_SUPPLIER,
            p.STATUS,
            p.CREATED_AT,
            p.UPDATED_AT
        FROM PRODUCTS p
        JOIN CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID
        LEFT JOIN SUPPLIERS s ON p.PREFERRED_SUPPLIER_ID = s.SUPPLIER_ID
        {where_clause}
        ORDER BY c.CATEGORY_NAME ASC, p.PRODUCT_NAME ASC
        """
        return db.query(sql, params)

    @staticmethod
    def get_by_id(product_id):
        sql = """
        SELECT 
            p.PRODUCT_ID,
            p.PRODUCT_CODE,
            p.PRODUCT_NAME,
            p.CATEGORY_ID,
            c.CATEGORY_NAME,
            p.UNIT,
            p.PURCHASE_COST,
            p.SELLING_PRICE,
            p.CURRENT_STOCK,
            p.REORDER_LEVEL,
            p.CURRENT_AVERAGE_COST,
            p.PREFERRED_SUPPLIER_ID,
            s.SUPPLIER_NAME AS PREFERRED_SUPPLIER,
            p.STATUS,
            p.CREATED_AT,
            p.UPDATED_AT
        FROM PRODUCTS p
        JOIN CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID
        LEFT JOIN SUPPLIERS s ON p.PREFERRED_SUPPLIER_ID = s.SUPPLIER_ID
        WHERE p.PRODUCT_ID = :product_id
        """
        return db.query_one(sql, {"product_id": int(product_id)})

    @staticmethod
    def create_product(data, user_id=1):
        # Generate product code if not provided
        code = data.get("product_code")
        if not code:
            cat_id = int(data.get("category_id", 1))
            prefix = "VEG" if cat_id == 1 else "FRU" if cat_id == 2 else "GRO"
            cnt = db.query_one("SELECT COUNT(*) AS C FROM PRODUCTS WHERE CATEGORY_ID = :cid", {"cid": cat_id})["C"]
            code = f"{prefix}-{int(cnt) + 1:03d}"

        sql = """
        DECLARE
            v_pid NUMBER;
        BEGIN
            RETAIL_PKG.ADD_PRODUCT(
                p_code => :code,
                p_name => :name,
                p_category_id => :category_id,
                p_unit => :unit,
                p_purchase_cost => :purchase_cost,
                p_selling_price => :selling_price,
                p_initial_stock => :initial_stock,
                p_reorder_level => :reorder_level,
                p_preferred_supplier_id => :supplier_id,
                p_user_id => :user_id,
                p_product_id => v_pid
            );
        END;
        """
        db.execute_plsql(sql, {
            "code": code,
            "name": data["product_name"],
            "category_id": int(data["category_id"]),
            "unit": data.get("unit", "kg"),
            "purchase_cost": float(data.get("purchase_cost", 0)),
            "selling_price": float(data["selling_price"]),
            "initial_stock": float(data.get("initial_stock", 0)),
            "reorder_level": float(data.get("reorder_level", 10)),
            "supplier_id": data.get("preferred_supplier_id"),
            "user_id": user_id
        })
        return db.query_one("SELECT * FROM PRODUCTS WHERE PRODUCT_CODE = :code", {"code": code})

    @staticmethod
    def update_product(product_id, data, user_id=1):
        sql = """
        UPDATE PRODUCTS
        SET PRODUCT_NAME = :name,
            CATEGORY_ID = :category_id,
            UNIT = :unit,
            SELLING_PRICE = :selling_price,
            REORDER_LEVEL = :reorder_level,
            PREFERRED_SUPPLIER_ID = :supplier_id,
            STATUS = :status,
            UPDATED_AT = SYSDATE
        WHERE PRODUCT_ID = :product_id
        """
        db.execute(sql, {
            "name": data["product_name"],
            "category_id": int(data["category_id"]),
            "unit": data["unit"],
            "selling_price": float(data["selling_price"]),
            "reorder_level": float(data.get("reorder_level", 10)),
            "supplier_id": data.get("preferred_supplier_id"),
            "status": data.get("status", "ACTIVE"),
            "product_id": int(product_id)
        })
        return ProductRepo.get_by_id(product_id)

    @staticmethod
    def deactivate_product(product_id, user_id=1):
        sql = """
        UPDATE PRODUCTS
        SET STATUS = 'INACTIVE',
            UPDATED_AT = SYSDATE
        WHERE PRODUCT_ID = :product_id
        """
        db.execute(sql, {"product_id": int(product_id)})
        db.execute("""
        INSERT INTO AUDIT_LOGS (USER_ID, ACTION, TABLE_NAME, RECORD_ID, DETAILS)
        VALUES (:user_id, 'DEACTIVATE_PRODUCT', 'PRODUCTS', :prod_id, 'Deactivated product')
        """, {"user_id": user_id, "prod_id": str(product_id)})
        return True

    @staticmethod
    def list_categories():
        return db.query("SELECT * FROM CATEGORIES ORDER BY CATEGORY_ID ASC")

    @staticmethod
    def create_category(name, description=""):
        sql = "INSERT INTO CATEGORIES (CATEGORY_NAME, DESCRIPTION) VALUES (:name, :desc)"
        db.execute(sql, {"name": name, "desc": description})
        return db.query_one("SELECT * FROM CATEGORIES WHERE CATEGORY_NAME = :name", {"name": name})

    @staticmethod
    def list_suppliers():
        return db.query("SELECT * FROM SUPPLIERS ORDER BY SUPPLIER_NAME ASC")

    @staticmethod
    def create_supplier(code, name, phone="", city=""):
        sql = """
        INSERT INTO SUPPLIERS (SUPPLIER_CODE, SUPPLIER_NAME, PHONE, CITY, STATUS)
        VALUES (:code, :name, :phone, :city, 'ACTIVE')
        """
        db.execute(sql, {"code": code, "name": name, "phone": phone, "city": city})
        return db.query_one("SELECT * FROM SUPPLIERS WHERE SUPPLIER_CODE = :code", {"code": code})
