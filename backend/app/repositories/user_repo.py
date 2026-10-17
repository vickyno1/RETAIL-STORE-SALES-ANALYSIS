from app.repositories.oracle_db import db

class UserRepo:
    @staticmethod
    def get_by_username(username):
        sql = """
        SELECT USER_ID, USERNAME, PASSWORD_HASH, FULL_NAME, ROLE, STATUS, CREATED_AT
        FROM USERS
        WHERE LOWER(USERNAME) = LOWER(:username)
        """
        return db.query_one(sql, {"username": username})

    @staticmethod
    def get_by_id(user_id):
        sql = """
        SELECT USER_ID, USERNAME, FULL_NAME, ROLE, STATUS, CREATED_AT
        FROM USERS
        WHERE USER_ID = :user_id
        """
        return db.query_one(sql, {"user_id": user_id})

    @staticmethod
    def list_all():
        sql = """
        SELECT USER_ID, USERNAME, FULL_NAME, ROLE, STATUS, CREATED_AT
        FROM USERS
        ORDER BY USER_ID ASC
        """
        return db.query(sql)

    @staticmethod
    def create_user(username, password_hash, full_name, role):
        sql = """
        INSERT INTO USERS (USERNAME, PASSWORD_HASH, FULL_NAME, ROLE, STATUS)
        VALUES (:username, :password_hash, :full_name, :role, 'ACTIVE')
        """
        db.execute(sql, {
            "username": username,
            "password_hash": password_hash,
            "full_name": full_name,
            "role": role
        })
        return UserRepo.get_by_username(username)

    @staticmethod
    def update_status(user_id, status):
        sql = "UPDATE USERS SET STATUS = :status WHERE USER_ID = :user_id"
        db.execute(sql, {"status": status, "user_id": user_id})
        return UserRepo.get_by_id(user_id)

