-- ==============================================================================
-- SMART RETAIL ANALYTICS SYSTEM - STANDALONE PROCEDURE: RECORD_PURCHASE
-- Script: database/procedures/record_purchase.sql
-- ==============================================================================

CREATE OR REPLACE PROCEDURE RECORD_PURCHASE_ITEM (
    p_purchase_id       IN NUMBER,
    p_product_id        IN NUMBER,
    p_quantity          IN NUMBER,
    p_unit_cost         IN NUMBER,
    p_discount_amount   IN NUMBER,
    p_user_id           IN NUMBER
) IS
    v_line_total        NUMBER;
    v_curr_stock        NUMBER;
    v_curr_avg_cost     NUMBER;
    v_new_avg_cost      NUMBER;
    v_pi_id             NUMBER;
    v_eff_cost          NUMBER;
    v_disc              NUMBER := NVL(p_discount_amount, 0);
BEGIN
    IF p_quantity <= 0 THEN
        RAISE_APPLICATION_ERROR(-20011, 'Purchase quantity must be positive.');
    END IF;

    IF p_unit_cost < 0 THEN
        RAISE_APPLICATION_ERROR(-20012, 'Unit cost cannot be negative.');
    END IF;

    v_line_total := ROUND((p_quantity * p_unit_cost) - v_disc, 2);
    IF v_line_total < 0 THEN
        v_line_total := 0;
    END IF;

    -- Lock and get product details
    SELECT CURRENT_STOCK, CURRENT_AVERAGE_COST
    INTO v_curr_stock, v_curr_avg_cost
    FROM PRODUCTS
    WHERE PRODUCT_ID = p_product_id
    FOR UPDATE;

    -- Calculate moving weighted-average cost
    v_eff_cost := v_line_total / p_quantity;
    IF (v_curr_stock + p_quantity) > 0 THEN
        v_new_avg_cost := ROUND(((v_curr_stock * v_curr_avg_cost) + (p_quantity * v_eff_cost)) / (v_curr_stock + p_quantity), 2);
    ELSE
        v_new_avg_cost := v_eff_cost;
    END IF;

    SELECT SEQ_PURCHASE_ITEMS_ID.NEXTVAL INTO v_pi_id FROM DUAL;

    INSERT INTO PURCHASE_ITEMS (
        PURCHASE_ITEM_ID, PURCHASE_ID, PRODUCT_ID, QUANTITY, UNIT_COST, DISCOUNT_AMOUNT, LINE_TOTAL
    ) VALUES (
        v_pi_id, p_purchase_id, p_product_id, p_quantity, p_unit_cost, v_disc, v_line_total
    );

    -- Update product stock and average cost
    UPDATE PRODUCTS
    SET CURRENT_STOCK = CURRENT_STOCK + p_quantity,
        CURRENT_AVERAGE_COST = v_new_avg_cost,
        PURCHASE_COST = p_unit_cost,
        UPDATED_AT = SYSDATE
    WHERE PRODUCT_ID = p_product_id;

    -- Update purchase header total
    UPDATE PURCHASES
    SET TOTAL_AMOUNT = TOTAL_AMOUNT + v_line_total
    WHERE PURCHASE_ID = p_purchase_id;

    -- Record movement
    INSERT INTO INVENTORY_MOVEMENTS (
        PRODUCT_ID, MOVEMENT_DATE, MOVEMENT_TYPE, QUANTITY_CHANGE, UNIT_COST,
        REFERENCE_TYPE, REFERENCE_ID, REASON, CREATED_BY
    ) VALUES (
        p_product_id, SYSDATE, 'PURCHASE', p_quantity, v_eff_cost,
        'PURCHASE', p_purchase_id, 'Stock received via purchase #' || p_purchase_id, p_user_id
    );
END RECORD_PURCHASE_ITEM;
/
