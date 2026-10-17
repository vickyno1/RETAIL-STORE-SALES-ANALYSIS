import axios from 'axios';
import { 
  DEMO_CATEGORIES, DEMO_SUPPLIERS, DEMO_PRODUCTS, 
  DEMO_DASHBOARD, DEMO_EXPENSES, DEMO_WASTAGE, DEMO_SALES_HISTORY 
} from './demoData';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Fallback resolver for static cloud hosting (e.g. Netlify) when local Oracle 10g XE instance is offline
function resolveMockResponse(config) {
  const url = (config.url || '').replace(/^\/api/, '');
  const method = (config.method || 'get').toLowerCase();

  // 1. Auth endpoints
  if (url === '/auth/login' && method === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
    const username = (body.username || '').trim().toLowerCase();
    const password = body.password || '';

    if (username === 'admin' && (password === 'Admin@123' || password === 'admin' || password === 'admin123')) {
      return {
        data: {
          message: 'Login successful (Cloud Demo Mode)',
          token: 'demo-admin-jwt-token',
          user: { user_id: 1, username: 'admin', full_name: 'Store Owner (Admin)', role: 'ADMIN' }
        }
      };
    }
    if (username === 'staff' && (password === 'Staff@123' || password === 'staff')) {
      return {
        data: {
          message: 'Login successful (Cloud Demo Mode)',
          token: 'demo-staff-jwt-token',
          user: { user_id: 2, username: 'staff', full_name: 'Floor Cashier (Staff)', role: 'STAFF' }
        }
      };
    }
    // Return unauthorized for wrong credentials
    const err = new Error('Invalid username or password.');
    err.response = { status: 401, data: { error: 'Invalid username or password.' } };
    throw err;
  }

  if (url === '/auth/me' && method === 'get') {
    const saved = localStorage.getItem('user');
    const user = saved ? JSON.parse(saved) : { user_id: 1, username: 'admin', full_name: 'Store Owner', role: 'ADMIN' };
    return { data: user };
  }

  if (url === '/auth/logout') {
    return { data: { message: 'Logged out successfully.' } };
  }

  if (url === '/auth/users' && method === 'get') {
    return {
      data: {
        users: [
          { USER_ID: 1, USERNAME: 'admin', FULL_NAME: 'Store Owner', ROLE: 'ADMIN', STATUS: 'ACTIVE', CREATED_AT: '2026-03-01' },
          { USER_ID: 2, USERNAME: 'staff', FULL_NAME: 'Floor Cashier', ROLE: 'STAFF', STATUS: 'ACTIVE', CREATED_AT: '2026-03-01' }
        ],
        total: 2
      }
    };
  }

  // 2. Dashboard & Analytics
  if (url.startsWith('/analytics/dashboard')) {
    return { data: DEMO_DASHBOARD };
  }

  // 3. Products & Categories
  if (url.startsWith('/products')) {
    return { data: { products: DEMO_PRODUCTS, total: DEMO_PRODUCTS.length } };
  }
  if (url.startsWith('/categories')) {
    return { data: { categories: DEMO_CATEGORIES } };
  }

  // 4. Inventory & Stock Ledger
  if (url === '/inventory') {
    const valuation = DEMO_PRODUCTS.map(p => ({
      ...p,
      INVENTORY_VALUE: p.CURRENT_STOCK * p.PURCHASE_COST
    }));
    return { data: { inventory: valuation, total_stock_value: 75006.50, total_items: valuation.length } };
  }
  if (url.startsWith('/inventory/movements')) {
    return {
      data: {
        movements: [
          { MOVEMENT_ID: 104, MOVEMENT_DATE: '2026-04-17 19:30:00', PRODUCT_NAME: 'Tomato (Country/Nattu)', MOVEMENT_TYPE: 'SALE', QUANTITY_CHANGE: -18.0, BALANCE_AFTER: 45.0, UNIT_COST: 24.0, NOTES: 'End-of-day sales closing' },
          { MOVEMENT_ID: 103, MOVEMENT_DATE: '2026-04-17 19:30:00', PRODUCT_NAME: 'Big Onion (Bellary)', MOVEMENT_TYPE: 'SALE', QUANTITY_CHANGE: -20.0, BALANCE_AFTER: 80.0, UNIT_COST: 28.0, NOTES: 'End-of-day sales closing' },
          { MOVEMENT_ID: 102, MOVEMENT_DATE: '2026-04-16 10:15:00', PRODUCT_NAME: 'Apple (Shimla)', MOVEMENT_TYPE: 'PURCHASE', QUANTITY_CHANGE: 50.0, BALANCE_AFTER: 80.0, UNIT_COST: 110.0, NOTES: 'Inward wholesale delivery' },
          { MOVEMENT_ID: 101, MOVEMENT_DATE: '2026-04-15 09:00:00', PRODUCT_NAME: 'Banana (Robusta)', MOVEMENT_TYPE: 'WASTAGE', QUANTITY_CHANGE: -4.5, BALANCE_AFTER: 35.0, UNIT_COST: 35.0, NOTES: 'Perishable spoilage write-off' },
          { MOVEMENT_ID: 100, MOVEMENT_DATE: '2026-04-01 08:00:00', PRODUCT_NAME: 'Ponni Boiled Rice', MOVEMENT_TYPE: 'OPENING_STOCK', QUANTITY_CHANGE: 120.0, BALANCE_AFTER: 120.0, UNIT_COST: 52.0, NOTES: 'Initial store inventory balance' }
        ],
        total: 5
      }
    };
  }
  if (url === '/inventory/low-stock') {
    const low = DEMO_PRODUCTS.filter(p => p.CURRENT_STOCK <= p.REORDER_LEVEL);
    return { data: { alerts: low, total_alerts: low.length } };
  }
  if (url === '/inventory/reconcile') {
    return {
      data: {
        is_reconciled: true,
        mismatches_count: 0,
        reconciliation: DEMO_PRODUCTS.slice(0, 10).map(p => ({
          PRODUCT_ID: p.PRODUCT_ID,
          PRODUCT_CODE: p.PRODUCT_CODE,
          PRODUCT_NAME: p.PRODUCT_NAME,
          CURRENT_STOCK: p.CURRENT_STOCK,
          LEDGER_STOCK: p.CURRENT_STOCK,
          DIFFERENCE: 0,
          STATUS: 'VERIFIED'
        }))
      }
    };
  }

  // 5. Wastage & Expenses
  if (url.startsWith('/inventory/wastage')) {
    return { data: { wastage: DEMO_WASTAGE, total_cost: 709.50, total_records: DEMO_WASTAGE.length } };
  }
  if (url.startsWith('/expenses')) {
    return { data: { expenses: DEMO_EXPENSES, total_amount: 12850.00, count: DEMO_EXPENSES.length } };
  }

  // 6. Sales History
  if (url.startsWith('/sales') && method === 'get') {
    return { data: { sales: DEMO_SALES_HISTORY, total: DEMO_SALES_HISTORY.length } };
  }

  // 7. Reports
  if (url === '/reports/daily-sales') {
    return { data: DEMO_DASHBOARD.sales_trend.map(t => ({ SALE_DATE: t.SALE_DATE, DAILY_REVENUE: t.DAILY_REVENUE, DAILY_PROFIT: t.DAILY_PROFIT })) };
  }
  if (url === '/reports/monthly-sales') {
    return { data: [
      { MONTH_KEY: '2026-04', MONTH_LABEL: 'Apr 2026', TOTAL_REVENUE: 119294.0, TOTAL_COGS: 89165.0, GROSS_PROFIT: 30129.0, GROSS_MARGIN_PCT: 25.26 },
      { MONTH_KEY: '2026-03', MONTH_LABEL: 'Mar 2026', TOTAL_REVENUE: 75863.0, TOTAL_COGS: 56779.0, GROSS_PROFIT: 19084.0, GROSS_MARGIN_PCT: 25.16 }
    ]};
  }
  if (url === '/reports/product-sales') {
    return { data: DEMO_DASHBOARD.top_by_profit };
  }
  if (url === '/reports/category-sales') {
    return { data: DEMO_DASHBOARD.categories };
  }
  if (url === '/reports/inventory') {
    return { data: DEMO_PRODUCTS };
  }
  if (url === '/reports/wastage') {
    return { data: DEMO_WASTAGE };
  }

  // Default POST success for demo mode mutations
  if (method === 'post' || method === 'put' || method === 'delete') {
    return {
      status: 201,
      data: {
        message: 'Action completed successfully (Cloud Demo Mode)',
        sale: { SALE_ID: 38, TOTAL_REVENUE: 1240.00, TOTAL_PROFIT: 380.00 }
      }
    };
  }

  return { data: {} };
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If running in a static cloud environment like Netlify where /api returns 404 or fails
    if (error.response && error.response.status === 404 && error.config) {
      console.warn('[Cloud Demo Fallback] Backend not reachable. Serving Oracle 10g seed dataset snapshot for:', error.config.url);
      try {
        const mockRes = resolveMockResponse(error.config);
        return Promise.resolve(mockRes);
      } catch (mockErr) {
        return Promise.reject(mockErr);
      }
    }

    // Network errors (e.g., net::ERR_CONNECTION_REFUSED when backend not running)
    if (!error.response && error.config) {
      console.warn('[Cloud Demo Fallback] Network connection refused. Serving Oracle 10g seed snapshot for:', error.config.url);
      try {
        const mockRes = resolveMockResponse(error.config);
        return Promise.resolve(mockRes);
      } catch (mockErr) {
        return Promise.reject(mockErr);
      }
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
