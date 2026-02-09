# config/settings.py
import os
from dotenv import load_dotenv

# بارگذاری متغیرهای محیطی
load_dotenv()

class Settings:
    # اطلاعات سرور
    SERVER_URL = os.getenv("SERVER_URL", "http://edu-api.havirkesht.ir")
    API_USERNAME = os.getenv("API_USERNAME", "edu_user1")
    API_PASSWORD = os.getenv("API_PASSWORD", "edu_pass123")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://edu.havirkesht.ir")
    
    # تنظیمات برنامه
    APP_TITLE = "Edu Server Client"
    APP_VERSION = "1.0.0"
    
    # تایم‌اوت درخواست‌ها (ثانیه)
    REQUEST_TIMEOUT = 30.0
    
    @classmethod
    def get_auth_header(cls):
        """ایجاد هدر احراز هویت Basic Auth"""
        import base64
        credentials = f"{cls.API_USERNAME}:{cls.API_PASSWORD}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode('utf-8')
        return {
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

settings = Settings()