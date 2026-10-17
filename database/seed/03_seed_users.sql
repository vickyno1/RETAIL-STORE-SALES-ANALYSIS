-- ==============================================================================
-- SMART RETAIL ANALYTICS SYSTEM - SEED USERS
-- Script: 03_seed_users.sql
-- Default accounts:
-- 1. admin / Admin@123 (Role: ADMIN)
-- 2. staff / Staff@123 (Role: STAFF)
-- ==============================================================================

INSERT INTO USERS (USER_ID, USERNAME, PASSWORD_HASH, FULL_NAME, ROLE, STATUS, CREATED_AT)
VALUES (
    1, 
    'admin', 
    'scrypt:32768:8:1$xUq2ImuGilweIpIE$cc67bf4aec5dff6a16b92cc6821fbfbab9d8d1fd447473109df3f427286b5c210930847402395e801b44c396a2c835d7777ca3e8299b8e4fc9b9079028873a6c', 
    'Vignesh (Store Owner)', 
    'ADMIN', 
    'ACTIVE', 
    SYSDATE
);

INSERT INTO USERS (USER_ID, USERNAME, PASSWORD_HASH, FULL_NAME, ROLE, STATUS, CREATED_AT)
VALUES (
    2, 
    'staff', 
    'scrypt:32768:8:1$TyHQ9EE1GBoLn4Rk$4151d9ed7d5760ab94461e98552fd8d568d9c0c07fd6f6b2ea3a41ba066aba116e6aad02e6f204542f40acbbe4b0929852e8430ef7d848348b592d5594f00a34', 
    'Karthik (Billing Staff)', 
    'STAFF', 
    'ACTIVE', 
    SYSDATE
);

COMMIT;
