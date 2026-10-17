-- ==============================================================================
-- SMART RETAIL ANALYTICS SYSTEM - SEED CATEGORIES
-- Script: 01_seed_categories.sql
-- ==============================================================================
SET DEFINE OFF;

INSERT INTO CATEGORIES (CATEGORY_ID, CATEGORY_NAME, DESCRIPTION)
VALUES (1, 'Vegetables', 'Fresh farm vegetables, leafy greens, root vegetables and herbs');

INSERT INTO CATEGORIES (CATEGORY_ID, CATEGORY_NAME, DESCRIPTION)
VALUES (2, 'Fruits', 'Fresh seasonal and regular fruits, citrus, berries and melons');

INSERT INTO CATEGORIES (CATEGORY_ID, CATEGORY_NAME, DESCRIPTION)
VALUES (3, 'Groceries', 'Daily staples, rice, pulses, flours, oils, spices and packaged essentials');

INSERT INTO CATEGORIES (CATEGORY_ID, CATEGORY_NAME, DESCRIPTION)
VALUES (4, 'Dairy & Bakery', 'Milk, curd, butter, paneer, bread, rusks and bakery goods');

INSERT INTO CATEGORIES (CATEGORY_ID, CATEGORY_NAME, DESCRIPTION)
VALUES (5, 'Beverages', 'Tea, coffee, health drinks, juice concentrates and herbal beverages');

INSERT INTO CATEGORIES (CATEGORY_ID, CATEGORY_NAME, DESCRIPTION)
VALUES (6, 'Household & Personal Care', 'Cleaning supplies, soaps, detergents and paper products');

COMMIT;
