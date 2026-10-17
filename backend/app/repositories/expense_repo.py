from app.repositories.oracle_db import db

class ExpenseRepo:
    @staticmethod
    def list_expenses(category=None, start_date=None, end_date=None, limit=50):
        conditions = []
        params = {}
        
        if category and category.upper() != "ALL":
            conditions.append("e.CATEGORY = :cat")
            params["cat"] = category
            
        if start_date:
            conditions.append("e.EXPENSE_DATE >= TO_DATE(:start_date, 'YYYY-MM-DD')")
            params["start_date"] = start_date
            
        if end_date:
            conditions.append("e.EXPENSE_DATE <= TO_DATE(:end_date, 'YYYY-MM-DD')")
            params["end_date"] = end_date
            
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        sql = f"""
        SELECT * FROM (
            SELECT 
                e.EXPENSE_ID,
                e.EXPENSE_DATE,
                e.CATEGORY,
                e.AMOUNT,
                e.DESCRIPTION,
                u.FULL_NAME AS CREATED_BY_NAME,
                e.CREATED_AT
            FROM OPERATING_EXPENSES e
            LEFT JOIN USERS u ON e.CREATED_BY = u.USER_ID
            {where_clause}
            ORDER BY e.EXPENSE_DATE DESC, e.EXPENSE_ID DESC
        ) WHERE ROWNUM <= {int(limit)}
        """
        return db.query(sql, params)

    @staticmethod
    def create_expense(expense_date, category, amount, description, user_id=1):
        sql = """
        INSERT INTO OPERATING_EXPENSES (EXPENSE_DATE, CATEGORY, AMOUNT, DESCRIPTION, CREATED_BY)
        VALUES (TO_DATE(:exp_date, 'YYYY-MM-DD'), :category, :amount, :description, :user_id)
        """
        db.execute(sql, {
            "exp_date": expense_date,
            "category": category,
            "amount": float(amount),
            "description": description,
            "user_id": user_id
        })
        return db.query_one("""
        SELECT * FROM OPERATING_EXPENSES 
        WHERE CATEGORY = :cat AND DESCRIPTION = :desc 
        ORDER BY EXPENSE_ID DESC
        """, {"cat": category, "desc": description})
