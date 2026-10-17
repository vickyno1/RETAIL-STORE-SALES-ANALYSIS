from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from app.repositories.oracle_db import OracleError
from app.validation.validators import ValidationError

from app.routes.auth_routes import auth_bp
from app.routes.product_routes import product_bp
from app.routes.sales_routes import sales_bp
from app.routes.purchase_routes import purchase_bp
from app.routes.inventory_routes import inventory_bp
from app.routes.expense_routes import expense_bp
from app.routes.analytics_routes import analytics_bp
from app.routes.report_routes import report_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable restricted CORS
    CORS(app, resources={r"/api/*": {"origins": Config.ALLOWED_ORIGINS}}, supports_credentials=True)

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(product_bp, url_prefix="/api")
    app.register_blueprint(sales_bp, url_prefix="/api")
    app.register_blueprint(purchase_bp, url_prefix="/api")
    app.register_blueprint(inventory_bp, url_prefix="/api")
    app.register_blueprint(expense_bp, url_prefix="/api")
    app.register_blueprint(analytics_bp, url_prefix="/api")
    app.register_blueprint(report_bp, url_prefix="/api")

    # Error Handlers
    @app.errorhandler(ValidationError)
    def handle_validation_error(e):
        return jsonify({"error": e.message, "field": e.field}), 400

    @app.errorhandler(OracleError)
    def handle_oracle_error(e):
        return jsonify({"error": e.message, "oracle_code": e.code}), 400

    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({"error": "Resource not found."}), 404

    @app.errorhandler(500)
    def handle_internal_error(e):
        return jsonify({"error": "An internal server error occurred."}), 500

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy", "database": "Oracle 10g XE", "version": "1.0.0"})

    return app
