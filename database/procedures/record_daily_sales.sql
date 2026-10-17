-- ==============================================================================
-- SMART RETAIL ANALYTICS SYSTEM - STANDALONE PROCEDURE: RECORD_SALE_ITEM
-- Script: database/procedures/record_daily_sales.sql
-- ==============================================================================

CREATE OR REPLACE PROCEDURE RECORD_SALE_ITEM (
    p_sale_id           IN NUMBER,
    p_product_id        IN NUMBER,
    p_quantity          IN NUMBER,
    p_selling_price     IN NUMBER,
    p_discount_amount   IN NUMBER,
    p_user_id           IN NUMBER
) IS
    v_line_total        NUMBER;
    v_curr_stock        NUMBER;
    v_curr_avg_cost     NUMBER;
    v_cogs              NUMBER;
    v_profit            NUMBER;
    v_si_id             NUMBER;
    v_disc              NUMBER := NVL(p_discount_amount, 0);
    v_price             NUMBER;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE_APPLICATION_ERROR(-20013, 'Sales quantity must be positive.');
    END IF;

    -- Lock and verify stock
    SELECT CURRENT_STOCK, CURRENT_AVERAGE_COST, SELLING_PRICE
    INTO v_curr_stock, v_curr_avg_cost, v_price
    FROM PRODUCTS
    WHERE PRODUCT_ID = p_product_id
    FOR UPDATE;

    IF p_selling_price IS NOT NULL AND p_selling_price >= 0 THEN
        v_price := p_selling_price;
    END IF;

    IF p_quantity > v_curr_stock THEN
        RAISE_APPLICATION_ERROR(-20014, 'Insufficient stock for product #' || p_product_id || 
                               '. Requested: ' || p_quantity || ', Available: ' || v_curr_stock);
    END IF;

    v_line_total := ROUND((p_quantity * v_price) - v_disc, 2);
    IF v_line_total < 0 THEN
        v_line_total := 0;
    END IF;

    v_cogs := ROUND(p_quantity * v_curr_avg_cost, 2);
    v_profit := v_line_total - v_cogs;

    SELECT SEQ_SALES_ITEMS_ID.NEXTVAL INTO v_si_id FROM DUAL;

    INSERT INTO SALES_ITEMS (
        SALES_ITEM_ID, SALE_ID, PRODUCT_ID, QUANTITY, SELLING_PRICE,
        UNIT_COST_AT_SALE, DISCOUNT_AMOUNT, LINE_TOTAL, COST_OF_GOODS_SOLD
    ) VALUES (
        v_si_id, p_sale_id, p_product_id, p_quantity, v_price,
        v_curr_avg_cost, v_disc, v_line_total, v_cogs
    );

    -- Reduce stock
    UPDATE PRODUCTS
    SET CURRENT_STOCK = CURRENT_STOCK - p_quantity,
        UPDATED_AT = SYSDATE
    WHERE PRODUCT_ID = p_product_id;

    -- Update sales header aggregates
    UPDATE SALES
    SET TOTAL_REVENUE = TOTAL_REVENUE + v_line_total,
        TOTAL_COGS = TOTAL_COGS + v_cogs,
        TOTAL_PROFIT = TOTAL_PROFIT + v_profit,
        UPDATED_AT = SYSDATE
    WHERE SALE_ID = p_sale_id;

    -- Record movement
    INSERT INTO INVENTORY_MOVEMENTS (
        PRODUCT_ID, MOVEMENT_DATE, MOVEMENT_TYPE, QUANTITY_CHANGE, UNIT_COST,
        REFERENCE_TYPE, REFERENCE_ID, REASON, CREATED_BY
    ) VALUES (
        p_product_id, SYSDATE, 'SALE', -p_quantity, v_curr_avg_cost,
        'SALE', p_sale_id, 'Sold in daily batch #' || p_sale_id, p_user_id
    );
END RECORD_SALE_ITEM;
/
