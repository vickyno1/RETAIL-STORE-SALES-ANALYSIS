# Architecture Specification: Smart Retail Sales, Inventory & Profit Analytics System

## 1. System Overview

The **Smart Retail Sales & Stock Analytics System** is a full-stack, enterprise-grade business intelligence and retail operations platform tailored for independent grocery, fruit, and vegetable shops. It empowers shop owners to answer critical operational questions regarding daily sales, revenue, moving weighted-average profit margins, perishable spoilage, stockouts, and replenishment planning.

```mermaid
graph TD
    subgraph Client Tier ["Frontend Presentation Tier (React + Vite)"]
        UI[React 18 Single Page Application]
        Router[React Router DOM]
        State[AuthContext + Axios Client]
        Charts[Recharts Interactive Visualizations]
    end

    subgraph Server Tier ["Application Backend Tier (Python / Flask)"]
        API[RESTful Flask API Server]
        Auth[JWT Authentication & Scrypt Hashing]
        Val[Schema & Domain Validators]
        Repo[Data Access Repositories]
        Driver[Custom Oracle 10g Transactional Connector]
    end

    subgraph Data Tier ["Database Tier (Oracle Database 10g XE)"]
        Tables[(Relational Tables & Constraints)]
        Triggers[Auto-Increment Triggers & Sequences]
        Procedures[Moving Average & Stock Procedures]
        Packages[RETAIL_PKG Business Package]
        Views[Analytical & Aggregation Views]
        Ledger[Perpetual Double-Entry Stock Ledger]
    end

    subgraph BI Tier ["Business Intelligence Tier (Power BI / Python)"]
        Extractor[Python Data Exporter]
        CSV[(Star Schema CSV Datasets)]
        PowerBI[Power BI Desktop Report & DAX Measures]
    end

    UI --> API
    API --> Driver
    Driver --> Data Tier
    Extractor --> Data Tier
    Extractor --> CSV
    CSV --> PowerBI
```

---

## 2. Component Design

### 2.1 Frontend Architecture (React + Vite)
- **Framework:** React 18, bundled with Vite for near-instant HMR and production minification.
- **Routing:** `react-router-dom` v7 with role-guarded `ProtectedRoute` wrappers separating public authentication routes from authenticated and administrative operations.
- **State Management:** React Context API (`AuthContext`) handling user session tokens, role persistence, and automated request header injection.
- **Design System:** Custom responsive retail UI designed for touchscreens, mobile tablets, and desktop POS terminals with high-contrast badge indicators, modal workflows, and print styles.
- **Visualizations:** `recharts` responsive container charts displaying 30-day sales trajectories, category margin comparisons, and top profit drivers.

### 2.2 Backend Architecture (Python / Flask)
- **Factory Pattern:** `create_app()` modular initialization registering separate feature blueprints:
  - `/api/auth`: Login, JWT verification, user provisioning, active state toggles.
  - `/api/products`: Product catalog, category listings, margin analysis, soft deactivation.
  - `/api/purchases`: Inward multi-item purchase receipt, moving average cost recalculation, reversal.
  - `/api/sales`: Fast table daily sales batch submission, draft management, line item details, reversal.
  - `/api/inventory`: Inventory valuation, perpetual stock movements, physical count adjustment, wastage, low-stock alerts, and ledger reconciliation.
  - `/api/expenses`: Store overhead operational expenses (rent, electricity, labor, packaging).
  - `/api/analytics`: Dashboard KPIs, period comparisons, top revenue/profit rankings.
  - `/api/reports`: Analytical tabular queries and automated CSV data feeds.

### 2.3 Database Architecture (Oracle 10g XE)
- **Engine:** Oracle Database 10g Express Edition Release 10.2.0.1.0 running on `localhost:1521/XE`.
- **Integrity Constraints:** Foreign keys with `ON DELETE CASCADE` where applicable, non-negative quantity check constraints (`CHECK (QUANTITY >= 0)`), status enums, and unique code indexes.
- **Primary Keys:** Supported via Oracle sequences (`SEQ_USERS_ID`, `SEQ_PRODUCTS_ID`, etc.) and `BEFORE INSERT` triggers.
- **Stored Logic:** Moving average inventory cost recalculations and stock deductions are executed atomically inside Oracle PL/SQL procedures and packages, eliminating race conditions.
