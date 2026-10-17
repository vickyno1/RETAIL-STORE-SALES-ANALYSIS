"""
Python Analytics Layer: Oracle Connection Bridge
"""

import sys
import os

# Link to backend repository
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from app.repositories.oracle_db import db

def get_db():
    return db
