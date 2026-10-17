"""
Oracle 10g XE Database Connector & Repository Engine
Supports transactional execution, parameter binding, and result parsing.
"""

import os
import re
import subprocess
import logging
from datetime import datetime, date
from decimal import Decimal
from config import Config

logger = logging.getLogger("oracle_db")
logging.basicConfig(level=logging.INFO)

class OracleError(Exception):
    def __init__(self, message, code=None):
        super().__init__(message)
        self.code = code
        self.message = message

class OracleDB:
    def __init__(self):
        self.user = Config.ORACLE_USER
        self.password = Config.ORACLE_PASSWORD
        self.host = Config.ORACLE_HOST
        self.port = Config.ORACLE_PORT
        self.service = Config.ORACLE_SERVICE
        self.sqlplus_path = Config.ORACLE_SQLPLUS_PATH
        self.connect_str = f"{self.user}/{self.password}@{self.host}:{self.port}/{self.service}"

    def _format_literal(self, val):
        if val is None:
            return "NULL"
        elif isinstance(val, bool):
            return "1" if val else "0"
        elif isinstance(val, (int, float, Decimal)):
            return str(val)
        elif isinstance(val, (datetime, date)):
            d_str = val.strftime("%Y-%m-%d %H:%M:%S") if isinstance(val, datetime) else val.strftime("%Y-%m-%d")
            return f"TO_DATE('{d_str}', 'YYYY-MM-DD HH24:MI:SS')" if isinstance(val, datetime) else f"TO_DATE('{d_str}', 'YYYY-MM-DD')"
        else:
            escaped = str(val).replace("'", "''")
            return f"'{escaped}'"

    def _bind_params(self, sql, params):
        if not params:
            return sql
        
        # Sort keys by length descending to prevent substring collisions (e.g., :param_id vs :param)
        sorted_keys = sorted(params.keys(), key=lambda k: len(k), reverse=True)
        interpolated = sql
        for k in sorted_keys:
            val = params[k]
            literal = self._format_literal(val)
            pattern = rf":{re.escape(k)}\b"
            interpolated = re.sub(pattern, literal, interpolated)
        return interpolated

    def _execute_sqlplus(self, script_body):
        """Executes a SQL*Plus script and returns stdout and stderr."""
        cmd = [self.sqlplus_path, "-S", self.connect_str]
        try:
            p = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace"
            )
            stdout, stderr = p.communicate(script_body, timeout=45)
            
            # Check for fatal Oracle errors
            err_match = re.search(r"ORA-\d{5}:.*", stdout)
            if err_match:
                err_msg = err_match.group(0).strip()
                code_match = re.search(r"ORA-(\d{5})", err_msg)
                code = code_match.group(1) if code_match else None
                logger.error(f"Oracle DB Error: {err_msg}")
                raise OracleError(err_msg, code)
            
            return stdout, stderr
        except subprocess.TimeoutExpired:
            p.kill()
            raise OracleError("Oracle operation timed out.")
        except Exception as e:
            if isinstance(e, OracleError):
                raise
            raise OracleError(f"Database connection failed: {str(e)}")

    def query(self, sql, params=None):
        """Executes a SELECT query and returns a list of dictionaries with typed fields."""
        bound_sql = self._bind_params(sql.strip().rstrip(";"), params)
        script = f"""SET HEADING ON FEEDBACK OFF PAGESIZE 50000 LINESIZE 32767 TRIMSPOOL ON TAB OFF COLSEP '|~|'
SET NUMFORMAT 999999999999.99
SET DEFINE OFF
COLUMN SALE_DATE FORMAT A20
COLUMN PURCHASE_DATE FORMAT A20
COLUMN WASTAGE_DATE FORMAT A20
COLUMN MOVEMENT_DATE FORMAT A20
COLUMN EXPENSE_DATE FORMAT A20
COLUMN CREATED_AT FORMAT A20
COLUMN UPDATED_AT FORMAT A20
{bound_sql};
EXIT;
"""
        stdout, _ = self._execute_sqlplus(script)
        lines = [line.strip() for line in stdout.splitlines() if line.strip() and not line.strip().startswith("---")]
        if not lines:
            return []
        
        # Header is first line
        headers = [h.strip() for h in lines[0].split("|~|")]
        results = []
        for line in lines[1:]:
            parts = [p.strip() for p in line.split("|~|")]
            if len(parts) != len(headers):
                continue
            row = {}
            for col, val in zip(headers, parts):
                # Infer type
                if val == "" or val.upper() == "NULL":
                    row[col] = None
                elif re.match(r"^-?\d+$", val):
                    row[col] = int(val)
                elif re.match(r"^-?(\d+)?\.\d+$", val):
                    try:
                        f_val = float(val)
                        row[col] = int(f_val) if f_val.is_integer() else f_val
                    except ValueError:
                        row[col] = val
                else:
                    row[col] = val
            results.append(row)
        return results

    def query_one(self, sql, params=None):
        rows = self.query(sql, params)
        return rows[0] if rows else None

    def execute(self, sql, params=None):
        """Executes INSERT, UPDATE, DELETE, or PL/SQL block and commits."""
        bound_sql = self._bind_params(sql.strip(), params)
        if not bound_sql.endswith(";") and not bound_sql.endswith("/"):
            bound_sql += ";"
            
        script = f"""SET FEEDBACK ON
SET DEFINE OFF
{bound_sql}
COMMIT;
EXIT;
"""
        stdout, _ = self._execute_sqlplus(script)
        # Parse rows affected if available
        match = re.search(r"(\d+)\s+row[s]?\s+(created|updated|deleted)", stdout, re.IGNORECASE)
        affected = int(match.group(1)) if match else 1
        return affected

    def execute_plsql(self, plsql_block, params=None):
        """Executes an anonymous PL/SQL block."""
        bound_block = self._bind_params(plsql_block.strip(), params)
        if not bound_block.endswith("/"):
            bound_block += "\n/"
            
        script = f"""SET SERVEROUTPUT ON
SET FEEDBACK ON
SET DEFINE OFF
{bound_block}
COMMIT;
EXIT;
"""
        stdout, _ = self._execute_sqlplus(script)
        return stdout

db = OracleDB()
