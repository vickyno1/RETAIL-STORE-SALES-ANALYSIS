-- ==============================================================================
-- SMART RETAIL ANALYTICS SYSTEM - MASTER DATABASE DEPLOYMENT SCRIPT
-- ==============================================================================

SET ECHO OFF
SET FEEDBACK ON
SET SERVEROUTPUT ON
SET DEFINE OFF

PROMPT *** 1. Deploying Tables ***
@database/schema/01_tables.sql

PROMPT *** 2. Deploying Sequences and Triggers ***
@database/schema/02_sequences.sql

PROMPT *** 3. Deploying Indexes ***
@database/schema/03_indexes.sql

PROMPT *** 4. Deploying Views ***
@database/views/01_analytical_views.sql

PROMPT *** 5. Deploying Packages ***
@database/packages/01_retail_pkg.sql

PROMPT *** 6. Deploying Standalone Procedures ***
@database/procedures/record_purchase.sql
@database/procedures/record_daily_sales.sql

PROMPT *** 7. Seeding Initial Data ***
@database/seed/01_seed_categories.sql
@database/seed/02_seed_suppliers.sql
@database/seed/03_seed_users.sql
@database/seed/04_seed_products.sql
@database/seed/05_seed_transactions.sql

PROMPT *** 8. Synchronizing Sequences Beyond Seeded Primary Keys ***
@database/schema/04_align_sequences.sql

PROMPT *** Deployment Complete! Checking Table Counts ***
SELECT 'USERS' AS TBL, COUNT(*) AS CNT FROM USERS
UNION ALL
SELECT 'CATEGORIES', COUNT(*) FROM CATEGORIES
UNION ALL
SELECT 'SUPPLIERS', COUNT(*) FROM SUPPLIERS
UNION ALL
SELECT 'PRODUCTS', COUNT(*) FROM PRODUCTS
UNION ALL
SELECT 'PURCHASES', COUNT(*) FROM PURCHASES
UNION ALL
SELECT 'SALES', COUNT(*) FROM SALES
UNION ALL
SELECT 'SALES_ITEMS', COUNT(*) FROM SALES_ITEMS
UNION ALL
SELECT 'INVENTORY_MOVEMENTS', COUNT(*) FROM INVENTORY_MOVEMENTS
UNION ALL
SELECT 'WASTAGE', COUNT(*) FROM WASTAGE
UNION ALL
SELECT 'OPERATING_EXPENSES', COUNT(*) FROM OPERATING_EXPENSES;

COMMIT;
EXIT;
