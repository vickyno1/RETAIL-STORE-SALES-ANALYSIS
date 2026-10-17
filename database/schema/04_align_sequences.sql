-- ==============================================================================
-- 04_align_sequences.sql: Advances Oracle Sequences Beyond Max Seeded IDs
-- Prevents ORA-00001 (Unique Constraint Violation) on subsequent UI inserts.
-- ==============================================================================

SET DEFINE OFF;
SET SERVEROUTPUT ON;

DECLARE
  v_max NUMBER;
  v_val NUMBER;
BEGIN
  -- SEQ_USERS_ID
  SELECT NVL(MAX(USER_ID), 0) INTO v_max FROM USERS;
  LOOP
    SELECT SEQ_USERS_ID.NEXTVAL INTO v_val FROM dual;
    EXIT WHEN v_val > v_max;
  END LOOP;

  -- SEQ_CATEGORIES_ID
  SELECT NVL(MAX(CATEGORY_ID), 0) INTO v_max FROM CATEGORIES;
  LOOP
    SELECT SEQ_CATEGORIES_ID.NEXTVAL INTO v_val FROM dual;
    EXIT WHEN v_val > v_max;
  END LOOP;

  -- SEQ_SUPPLIERS_ID
  SELECT NVL(MAX(SUPPLIER_ID), 0) INTO v_max FROM SUPPLIERS;
  LOOP
    SELECT SEQ_SUPPLIERS_ID.NEXTVAL INTO v_val FROM dual;
    EXIT WHEN v_val > v_max;
  END LOOP;

  -- SEQ_PRODUCTS_ID
  SELECT NVL(MAX(PRODUCT_ID), 0) INTO v_max FROM PRODUCTS;
  LOOP
    SELECT SEQ_PRODUCTS_ID.NEXTVAL INTO v_val FROM dual;
    EXIT WHEN v_val > v_max;
  END LOOP;

  -- SEQ_PURCHASES_ID
  SELECT NVL(MAX(PURCHASE_ID), 0) INTO v_max FROM PURCHASES;
  LOOP
    SELECT SEQ_PURCHASES_ID.NEXTVAL INTO v_val FROM dual;
    EXIT WHEN v_val > v_max;
  END LOOP;

  -- SEQ_PURCHASE_ITEMS_ID
  SELECT NVL(MAX(PURCHASE_ITEM_ID), 0) INTO v_max FROM PURCHASE_ITEMS;
  LOOP
    SELECT SEQ_PURCHASE_ITEMS_ID.NEXTVAL INTO v_val FROM dual;
    EXIT WHEN v_val > v_max;
  END LOOP;

  -- SEQ_SALES_ID
  SELECT NVL(MAX(SALE_ID), 0) INTO v_max FROM SALES;
  LOOP
    SELECT SEQ_SALES_ID.NEXTVAL INTO v_val FROM dual;
    EXIT WHEN v_val > v_max;
  END LOOP;

  -- SEQ_SALES_ITEMS_ID
  SELECT NVL(MAX(SALES_ITEM_ID), 0) INTO v_max FROM SALES_ITEMS;
  LOOP
    SELECT SEQ_SALES_ITEMS_ID.NEXTVAL INTO v_val FROM dual;
    EXIT WHEN v_val > v_max;
  END LOOP;

  -- SEQ_MOVEMENTS_ID
  SELECT NVL(MAX(MOVEMENT_ID), 0) INTO v_max FROM INVENTORY_MOVEMENTS;
  LOOP
    SELECT SEQ_MOVEMENTS_ID.NEXTVAL INTO v_val FROM dual;
    EXIT WHEN v_val > v_max;
  END LOOP;

  -- SEQ_WASTAGE_ID
  SELECT NVL(MAX(WASTAGE_ID), 0) INTO v_max FROM WASTAGE;
  LOOP
    SELECT SEQ_WASTAGE_ID.NEXTVAL INTO v_val FROM dual;
    EXIT WHEN v_val > v_max;
  END LOOP;

  -- SEQ_EXPENSES_ID
  SELECT NVL(MAX(EXPENSE_ID), 0) INTO v_max FROM OPERATING_EXPENSES;
  LOOP
    SELECT SEQ_EXPENSES_ID.NEXTVAL INTO v_val FROM dual;
    EXIT WHEN v_val > v_max;
  END LOOP;

  DBMS_OUTPUT.PUT_LINE('All sequences successfully synchronized with current table states.');
END;
/
