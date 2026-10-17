import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 Starting Smart Retail Analytics Backend API on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
