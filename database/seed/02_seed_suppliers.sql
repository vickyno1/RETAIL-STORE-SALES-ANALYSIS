-- ==============================================================================
-- SMART RETAIL ANALYTICS SYSTEM - SEED SUPPLIERS
-- Script: 02_seed_suppliers.sql
-- ==============================================================================

INSERT INTO SUPPLIERS (SUPPLIER_ID, SUPPLIER_CODE, SUPPLIER_NAME, PHONE, CITY, STATUS)
VALUES (1, 'SUP-001', 'Kovai Fresh Farm Supplies', '+91 94431 12345', 'Coimbatore', 'ACTIVE');

INSERT INTO SUPPLIERS (SUPPLIER_ID, SUPPLIER_CODE, SUPPLIER_NAME, PHONE, CITY, STATUS)
VALUES (2, 'SUP-002', 'Salem Fruit Wholesale Mandi', '+91 98420 54321', 'Salem', 'ACTIVE');

INSERT INTO SUPPLIERS (SUPPLIER_ID, SUPPLIER_CODE, SUPPLIER_NAME, PHONE, CITY, STATUS)
VALUES (3, 'SUP-003', 'Madurai Agro Provisions', '+91 97890 67890', 'Madurai', 'ACTIVE');

INSERT INTO SUPPLIERS (SUPPLIER_ID, SUPPLIER_CODE, SUPPLIER_NAME, PHONE, CITY, STATUS)
VALUES (4, 'SUP-004', 'Nilgiris Organic Horticulture', '+91 94862 33445', 'Ooty', 'ACTIVE');

INSERT INTO SUPPLIERS (SUPPLIER_ID, SUPPLIER_CODE, SUPPLIER_NAME, PHONE, CITY, STATUS)
VALUES (5, 'SUP-005', 'Thanjavur Grain & Rice Mills', '+91 98694 67853', 'Thanjavur', 'ACTIVE');

INSERT INTO SUPPLIERS (SUPPLIER_ID, SUPPLIER_CODE, SUPPLIER_NAME, PHONE, CITY, STATUS)
VALUES (6, 'SUP-006', 'Dindigul Vegetable Co-op', '+91 93450 78912', 'Dindigul', 'ACTIVE');

COMMIT;
