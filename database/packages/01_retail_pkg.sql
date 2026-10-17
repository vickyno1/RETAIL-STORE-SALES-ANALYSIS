-- ==============================================================================
-- SMART RETAIL ANALYTICS SYSTEM - PL/SQL PACKAGE SPECIFICATION & BODY
-- Script: 01_retail_pkg.sql
-- ==============================================================================

CREATE OR REPLACE PACKAGE RETAIL_PKG AS

    -- Procedures
    PROCEDURE ADD_PRODUCT (
        p_code                  IN  VARCHAR2,
        p_name                  IN  VARCHAR2,
        p_category_id           IN  NUMBER,
        p_unit                  IN  VARCHAR2,
        p_purchase_cost         IN  NUMBER,
        p_selling_price         IN  NUMBER,
        p_initial_stock         IN  NUMBER,
        p_reorder_level         IN  NUMBER,
        p_preferred_supplier_id IN  NUMBER,
        p_user_id               IN  NUMBER,
        p_product_id            OUT NUMBER
    );

    PROCEDURE RECORD_WASTAGE (
        p_product_id    IN  NUMBER,
        p_waste_date    IN  DATE,
        p_quantity      IN  NUMBER,
        p_reason        IN  VARCHAR2,
        p_notes         IN  VARCHAR2,
        p_user_id       IN  NUMBER,
        p_wastage_id    OUT NUMBER
    );

    PROCEDURE ADJUST_STOCK (
        p_product_id    IN  NUMBER,
        p_new_stock     IN  NUMBER,
        p_reason        IN  VARCHAR2,
        p_user_id       IN  NUMBER,
        p_movement_id   OUT NUMBER
    );

    PROCEDURE REVERSE_SALE (
        p_sale_id       IN  NUMBER,
        p_reason        IN  VARCHAR2,
        p_user_id       IN  NUMBER
    );

    PROCEDURE REVERSE_PURCHASE (
        p_purchase_id   IN  NUMBER,
        p_reason        IN  VARCHAR2,
        p_user_id       IN  NUMBER
    );

    -- Functions
    FUNCTION GET_CURRENT_STOCK (
        p_product_id    IN  NUMBER
    ) RETURN NUMBER;

    FUNCTION GET_PRODUCT_REVENUE (
        p_product_id    IN  NUMBER,
        p_start_date    IN  DATE DEFAULT NULL,
        p_end_date      IN  DATE DEFAULT NULL
    ) RETURN NUMBER;

    FUNCTION GET_PRODUCT_GROSS_PROFIT (
        p_product_id    IN  NUMBER,
        p_start_date    IN  DATE DEFAULT NULL,
        p_end_date      IN  DATE DEFAULT NULL
    ) RETURN NUMBER;

    FUNCTION GET_CATEGORY_REVENUE (
        p_category_id   IN  NUMBER,
        p_start_date    IN  DATE DEFAULT NULL,
        p_end_date      IN  DATE DEFAULT NULL
    ) RETURN NUMBER;

    FUNCTION GET_STOCK_VALUE (
        p_product_id    IN  NUMBER DEFAULT NULL
    ) RETURN NUMBER;

END RETAIL_PKG;
/

CREATE OR REPLACE PACKAGE BODY RETAIL_PKG AS

    -- 1. ADD_PRODUCT
    PROCEDURE ADD_PRODUCT (
        p_code                  IN  VARCHAR2,
        p_name                  IN  VARCHAR2,
        p_category_id           IN  NUMBER,
        p_unit                  IN  VARCHAR2,
        p_purchase_cost         IN  NUMBER,
        p_selling_price         IN  NUMBER,
        p_initial_stock         IN  NUMBER,
        p_reorder_level         IN  NUMBER,
        p_preferred_supplier_id IN  NUMBER,
        p_user_id               IN  NUMBER,
        p_product_id            OUT NUMBER
    ) IS
        v_prod_id NUMBER;
        v_init_stock NUMBER := NVL(p_initial_stock, 0);
        v_pur_cost NUMBER := NVL(p_purchase_cost, 0);
    BEGIN
        IF p_selling_price < 0 THEN
            RAISE_APPLICATION_ERROR(-20002, 'Selling price cannot be negative.');
        END IF;

        IF v_pur_cost < 0 THEN
            RAISE_APPLICATION_ERROR(-20003, 'Purchase cost cannot be negative.');
        END IF;

        IF v_init_stock < 0 THEN
            RAISE_APPLICATION_ERROR(-20004, 'Initial stock cannot be negative.');
        END IF;

        SELECT SEQ_PRODUCTS_ID.NEXTVAL INTO v_prod_id FROM DUAL;

        INSERT INTO PRODUCTS (
            PRODUCT_ID, PRODUCT_CODE, PRODUCT_NAME, CATEGORY_ID, UNIT,
            PURCHASE_COST, SELLING_PRICE, CURRENT_STOCK, REORDER_LEVEL,
            CURRENT_AVERAGE_COST, PREFERRED_SUPPLIER_ID, STATUS, CREATED_AT, UPDATED_AT
        ) VALUES (
            v_prod_id, p_code, p_name, p_category_id, p_unit,
            v_pur_cost, p_selling_price, v_init_stock, NVL(p_reorder_level, 10),
            v_pur_cost, p_preferred_supplier_id, 'ACTIVE', SYSDATE, SYSDATE
        );

        IF v_init_stock > 0 THEN
            INSERT INTO INVENTORY_MOVEMENTS (
                PRODUCT_ID, MOVEMENT_DATE, MOVEMENT_TYPE, QUANTITY_CHANGE,
                UNIT_COST, REFERENCE_TYPE, REFERENCE_ID, REASON, CREATED_BY
            ) VALUES (
                v_prod_id, SYSDATE, 'OPENING_STOCK', v_init_stock,
                v_pur_cost, 'PRODUCT_INIT', v_prod_id, 'Initial Opening Stock Setup', p_user_id
            );
        END IF;

        INSERT INTO AUDIT_LOGS (USER_ID, ACTION, TABLE_NAME, RECORD_ID, DETAILS)
        VALUES (p_user_id, 'CREATE_PRODUCT', 'PRODUCTS', TO_CHAR(v_prod_id),
                'Created product: ' || p_name || ' (' || p_code || ') with initial stock ' || v_init_stock);

        p_product_id := v_prod_id;
    END ADD_PRODUCT;

    -- 2. RECORD_WASTAGE
    PROCEDURE RECORD_WASTAGE (
        p_product_id    IN  NUMBER,
        p_waste_date    IN  DATE,
        p_quantity      IN  NUMBER,
        p_reason        IN  VARCHAR2,
        p_notes         IN  VARCHAR2,
        p_user_id       IN  NUMBER,
        p_wastage_id    OUT NUMBER
    ) IS
        v_current_stock NUMBER;
        v_avg_cost      NUMBER;
        v_waste_id      NUMBER;
        v_total_cost    NUMBER;
    BEGIN
        IF p_quantity <= 0 THEN
            RAISE_APPLICATION_ERROR(-20005, 'Wastage quantity must be positive.');
        END IF;

        SELECT CURRENT_STOCK, CURRENT_AVERAGE_COST 
        INTO v_current_stock, v_avg_cost
        FROM PRODUCTS 
        WHERE PRODUCT_ID = p_product_id
        FOR UPDATE;

        IF p_quantity > v_current_stock THEN
            RAISE_APPLICATION_ERROR(-20006, 'Wastage quantity (' || p_quantity || ') exceeds available stock (' || v_current_stock || ').');
        END IF;

        v_total_cost := ROUND(p_quantity * v_avg_cost, 2);

        SELECT SEQ_WASTAGE_ID.NEXTVAL INTO v_waste_id FROM DUAL;

        INSERT INTO WASTAGE (
            WASTAGE_ID, PRODUCT_ID, WASTAGE_DATE, QUANTITY, UNIT_COST,
            TOTAL_COST, REASON, NOTES, CREATED_BY
        ) VALUES (
            v_waste_id, p_product_id, NVL(p_waste_date, TRUNC(SYSDATE)), p_quantity,
            v_avg_cost, v_total_cost, p_reason, p_notes, p_user_id
        );

        -- Reduce product stock
        UPDATE PRODUCTS 
        SET CURRENT_STOCK = CURRENT_STOCK - p_quantity,
            UPDATED_AT = SYSDATE
        WHERE PRODUCT_ID = p_product_id;

        -- Record movement
        INSERT INTO INVENTORY_MOVEMENTS (
            PRODUCT_ID, MOVEMENT_DATE, MOVEMENT_TYPE, QUANTITY_CHANGE,
            UNIT_COST, REFERENCE_TYPE, REFERENCE_ID, REASON, CREATED_BY
        ) VALUES (
            p_product_id, NVL(p_waste_date, SYSDATE), 'WASTAGE', -p_quantity,
            v_avg_cost, 'WASTAGE', v_waste_id, p_reason || ': ' || p_notes, p_user_id
        );

        INSERT INTO AUDIT_LOGS (USER_ID, ACTION, TABLE_NAME, RECORD_ID, DETAILS)
        VALUES (p_user_id, 'RECORD_WASTAGE', 'WASTAGE', TO_CHAR(v_waste_id),
                'Recorded wastage of ' || p_quantity || ' units. Reason: ' || p_reason);

        p_wastage_id := v_waste_id;
    END RECORD_WASTAGE;

    -- 3. ADJUST_STOCK
    PROCEDURE ADJUST_STOCK (
        p_product_id    IN  NUMBER,
        p_new_stock     IN  NUMBER,
        p_reason        IN  VARCHAR2,
        p_user_id       IN  NUMBER,
        p_movement_id   OUT NUMBER
    ) IS
        v_current_stock NUMBER;
        v_avg_cost      NUMBER;
        v_delta         NUMBER;
        v_mov_id        NUMBER;
    BEGIN
        IF p_new_stock < 0 THEN
            RAISE_APPLICATION_ERROR(-20007, 'New stock cannot be negative.');
        END IF;

        SELECT CURRENT_STOCK, CURRENT_AVERAGE_COST
        INTO v_current_stock, v_avg_cost
        FROM PRODUCTS
        WHERE PRODUCT_ID = p_product_id
        FOR UPDATE;

        v_delta := p_new_stock - v_current_stock;

        IF v_delta = 0 THEN
            p_movement_id := 0;
            RETURN;
        END IF;

        UPDATE PRODUCTS
        SET CURRENT_STOCK = p_new_stock,
            UPDATED_AT = SYSDATE
        WHERE PRODUCT_ID = p_product_id;

        SELECT SEQ_MOVEMENTS_ID.NEXTVAL INTO v_mov_id FROM DUAL;

        INSERT INTO INVENTORY_MOVEMENTS (
            MOVEMENT_ID, PRODUCT_ID, MOVEMENT_DATE, MOVEMENT_TYPE, QUANTITY_CHANGE,
            UNIT_COST, REFERENCE_TYPE, REFERENCE_ID, REASON, CREATED_BY
        ) VALUES (
            v_mov_id, p_product_id, SYSDATE, 'ADJUSTMENT', v_delta,
            v_avg_cost, 'STOCK_ADJUST', v_mov_id, p_reason, p_user_id
        );

        INSERT INTO AUDIT_LOGS (USER_ID, ACTION, TABLE_NAME, RECORD_ID, DETAILS)
        VALUES (p_user_id, 'ADJUST_STOCK', 'PRODUCTS', TO_CHAR(p_product_id),
                'Adjusted stock from ' || v_current_stock || ' to ' || p_new_stock || ' (delta ' || v_delta || '). Reason: ' || p_reason);

        p_movement_id := v_mov_id;
    END ADJUST_STOCK;

    -- 4. REVERSE_SALE
    PROCEDURE REVERSE_SALE (
        p_sale_id       IN  NUMBER,
        p_reason        IN  VARCHAR2,
        p_user_id       IN  NUMBER
    ) IS
        v_status VARCHAR2(20);
    BEGIN
        SELECT STATUS INTO v_status FROM SALES WHERE SALE_ID = p_sale_id FOR UPDATE;

        IF v_status = 'REVERSED' THEN
            RAISE_APPLICATION_ERROR(-20008, 'Sale transaction is already reversed.');
        END IF;

        FOR r IN (SELECT PRODUCT_ID, QUANTITY, UNIT_COST_AT_SALE FROM SALES_ITEMS WHERE SALE_ID = p_sale_id) LOOP
            -- Restore product stock
            UPDATE PRODUCTS
            SET CURRENT_STOCK = CURRENT_STOCK + r.QUANTITY,
                UPDATED_AT = SYSDATE
            WHERE PRODUCT_ID = r.PRODUCT_ID;

            -- Record reversal movement
            INSERT INTO INVENTORY_MOVEMENTS (
                PRODUCT_ID, MOVEMENT_DATE, MOVEMENT_TYPE, QUANTITY_CHANGE,
                UNIT_COST, REFERENCE_TYPE, REFERENCE_ID, REASON, CREATED_BY
            ) VALUES (
                r.PRODUCT_ID, SYSDATE, 'SALE_REVERSAL', r.QUANTITY,
                r.UNIT_COST_AT_SALE, 'SALE_REVERSAL', p_sale_id, p_reason, p_user_id
            );
        END LOOP;

        UPDATE SALES
        SET STATUS = 'REVERSED',
            UPDATED_AT = SYSDATE
        WHERE SALE_ID = p_sale_id;

        INSERT INTO AUDIT_LOGS (USER_ID, ACTION, TABLE_NAME, RECORD_ID, DETAILS)
        VALUES (p_user_id, 'REVERSE_SALE', 'SALES', TO_CHAR(p_sale_id),
                'Reversed sale batch #' || p_sale_id || '. Reason: ' || p_reason);
    END REVERSE_SALE;

    -- 5. REVERSE_PURCHASE
    PROCEDURE REVERSE_PURCHASE (
        p_purchase_id   IN  NUMBER,
        p_reason        IN  VARCHAR2,
        p_user_id       IN  NUMBER
    ) IS
        v_status VARCHAR2(20);
        v_curr_stock NUMBER;
    BEGIN
        SELECT STATUS INTO v_status FROM PURCHASES WHERE PURCHASE_ID = p_purchase_id FOR UPDATE;

        IF v_status = 'REVERSED' THEN
            RAISE_APPLICATION_ERROR(-20009, 'Purchase transaction is already reversed.');
        END IF;

        -- Verify stock can be safely deducted
        FOR r IN (SELECT PRODUCT_ID, QUANTITY, UNIT_COST FROM PURCHASE_ITEMS WHERE PURCHASE_ID = p_purchase_id) LOOP
            SELECT CURRENT_STOCK INTO v_curr_stock FROM PRODUCTS WHERE PRODUCT_ID = r.PRODUCT_ID FOR UPDATE;
            IF v_curr_stock < r.QUANTITY THEN
                RAISE_APPLICATION_ERROR(-20010, 'Cannot reverse purchase. Current stock (' || v_curr_stock || 
                                       ') is lower than purchased quantity (' || r.QUANTITY || ').');
            END IF;
        END LOOP;

        FOR r IN (SELECT PRODUCT_ID, QUANTITY, UNIT_COST FROM PURCHASE_ITEMS WHERE PURCHASE_ID = p_purchase_id) LOOP
            UPDATE PRODUCTS
            SET CURRENT_STOCK = CURRENT_STOCK - r.QUANTITY,
                UPDATED_AT = SYSDATE
            WHERE PRODUCT_ID = r.PRODUCT_ID;

            INSERT INTO INVENTORY_MOVEMENTS (
                PRODUCT_ID, MOVEMENT_DATE, MOVEMENT_TYPE, QUANTITY_CHANGE,
                UNIT_COST, REFERENCE_TYPE, REFERENCE_ID, REASON, CREATED_BY
            ) VALUES (
                r.PRODUCT_ID, SYSDATE, 'PURCHASE_REVERSAL', -r.QUANTITY,
                r.UNIT_COST, 'PURCHASE_REVERSAL', p_purchase_id, p_reason, p_user_id
            );
        END LOOP;

        UPDATE PURCHASES
        SET STATUS = 'REVERSED'
        WHERE PURCHASE_ID = p_purchase_id;

        INSERT INTO AUDIT_LOGS (USER_ID, ACTION, TABLE_NAME, RECORD_ID, DETAILS)
        VALUES (p_user_id, 'REVERSE_PURCHASE', 'PURCHASES', TO_CHAR(p_purchase_id),
                'Reversed purchase #' || p_purchase_id || '. Reason: ' || p_reason);
    END REVERSE_PURCHASE;

    -- 6. GET_CURRENT_STOCK
    FUNCTION GET_CURRENT_STOCK (
        p_product_id    IN  NUMBER
    ) RETURN NUMBER IS
        v_stock NUMBER;
    BEGIN
        SELECT CURRENT_STOCK INTO v_stock FROM PRODUCTS WHERE PRODUCT_ID = p_product_id;
        RETURN NVL(v_stock, 0);
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN 0;
    END GET_CURRENT_STOCK;

    -- 7. GET_PRODUCT_REVENUE
    FUNCTION GET_PRODUCT_REVENUE (
        p_product_id    IN  NUMBER,
        p_start_date    IN  DATE DEFAULT NULL,
        p_end_date      IN  DATE DEFAULT NULL
    ) RETURN NUMBER IS
        v_rev NUMBER;
    BEGIN
        SELECT NVL(SUM(si.LINE_TOTAL), 0)
        INTO v_rev
        FROM SALES_ITEMS si
        JOIN SALES s ON si.SALE_ID = s.SALE_ID
        WHERE si.PRODUCT_ID = p_product_id
          AND s.STATUS = 'FINALIZED'
          AND (p_start_date IS NULL OR s.SALE_DATE >= p_start_date)
          AND (p_end_date IS NULL OR s.SALE_DATE <= p_end_date);
        RETURN v_rev;
    END GET_PRODUCT_REVENUE;

    -- 8. GET_PRODUCT_GROSS_PROFIT
    FUNCTION GET_PRODUCT_GROSS_PROFIT (
        p_product_id    IN  NUMBER,
        p_start_date    IN  DATE DEFAULT NULL,
        p_end_date      IN  DATE DEFAULT NULL
    ) RETURN NUMBER IS
        v_profit NUMBER;
    BEGIN
        SELECT NVL(SUM(si.LINE_TOTAL - si.COST_OF_GOODS_SOLD), 0)
        INTO v_profit
        FROM SALES_ITEMS si
        JOIN SALES s ON si.SALE_ID = s.SALE_ID
        WHERE si.PRODUCT_ID = p_product_id
          AND s.STATUS = 'FINALIZED'
          AND (p_start_date IS NULL OR s.SALE_DATE >= p_start_date)
          AND (p_end_date IS NULL OR s.SALE_DATE <= p_end_date);
        RETURN v_profit;
    END GET_PRODUCT_GROSS_PROFIT;

    -- 9. GET_CATEGORY_REVENUE
    FUNCTION GET_CATEGORY_REVENUE (
        p_category_id   IN  NUMBER,
        p_start_date    IN  DATE DEFAULT NULL,
        p_end_date      IN  DATE DEFAULT NULL
    ) RETURN NUMBER IS
        v_rev NUMBER;
    BEGIN
        SELECT NVL(SUM(si.LINE_TOTAL), 0)
        INTO v_rev
        FROM SALES_ITEMS si
        JOIN SALES s ON si.SALE_ID = s.SALE_ID
        JOIN PRODUCTS p ON si.PRODUCT_ID = p.PRODUCT_ID
        WHERE p.CATEGORY_ID = p_category_id
          AND s.STATUS = 'FINALIZED'
          AND (p_start_date IS NULL OR s.SALE_DATE >= p_start_date)
          AND (p_end_date IS NULL OR s.SALE_DATE <= p_end_date);
        RETURN v_rev;
    END GET_CATEGORY_REVENUE;

    -- 10. GET_STOCK_VALUE
    FUNCTION GET_STOCK_VALUE (
        p_product_id    IN  NUMBER DEFAULT NULL
    ) RETURN NUMBER IS
        v_val NUMBER;
    BEGIN
        IF p_product_id IS NOT NULL THEN
            SELECT NVL(ROUND(CURRENT_STOCK * CURRENT_AVERAGE_COST, 2), 0)
            INTO v_val
            FROM PRODUCTS
            WHERE PRODUCT_ID = p_product_id;
        ELSE
            SELECT NVL(SUM(ROUND(CURRENT_STOCK * CURRENT_AVERAGE_COST, 2)), 0)
            INTO v_val
            FROM PRODUCTS
            WHERE STATUS = 'ACTIVE';
        END IF;
        RETURN v_val;
    END GET_STOCK_VALUE;

END RETAIL_PKG;
/
