# Contributing to Smart Retail Analytics System

Thank you for your interest in contributing to the **Smart Retail Sales, Inventory and Profit Analytics System**!

## Code Quality and Conventions
1. **Oracle 10g Compatibility:** Do not introduce Oracle 12c+ syntax (`IDENTITY`, `FETCH FIRST`, etc.). Primary keys must use sequences and triggers. Test all SQL changes against Oracle 10g XE.
2. **Double-Entry Ledger:** Any routine that alters `PRODUCTS.CURRENT_STOCK` must atomically insert a corresponding row into `INVENTORY_MOVEMENTS`.
3. **Cost Accounting:** All stock receipts must compute moving weighted-average costs.
4. **Backend Testing:** Always run `pytest tests/` before submitting pull requests. Ensure all 18 tests pass with 0 failures.
5. **Frontend Conventions:** Ensure `npm run build` succeeds cleanly in `frontend/`. Maintain the custom responsive retail styling system.
