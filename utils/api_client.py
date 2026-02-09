# utils/api_client.py
import httpx
from typing import Dict, Any, Optional
import json
from config.settings import settings

class EduAPIClient:
    """کلاینت برای ارتباط با API سرور آموزشی"""
    
    def __init__(self):
        self.base_url = settings.SERVER_URL
        self.headers = settings.get_auth_header()
        self.timeout = settings.REQUEST_TIMEOUT
        
    async def test_connection(self):
        """تست اتصال به سرور"""
        try:
            async with httpx.AsyncClient() as client:
                # ابتدا سعی می‌کنیم به روت سرور وصل شویم
                response = await client.get(
                    self.base_url,
                    headers=self.headers,
                    timeout=self.timeout
                )
                return {
                    "success": response.status_code == 200,
                    "status_code": response.status_code,
                    "message": "اتصال برقرار شد" if response.status_code == 200 else "خطا در اتصال"
                }
        except httpx.ConnectError:
            # اگر با آدرس اصلی وصل نشد، با IP امتحان می‌کنیم
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        "http://85.185.235.123",
                        headers=self.headers,
                        timeout=self.timeout
                    )
                    return {
                        "success": response.status_code == 200,
                        "status_code": response.status_code,
                        "message": "اتصال از طریق IP برقرار شد"
                    }
            except Exception as e:
                return {
                    "success": False,
                    "status_code": None,
                    "message": f"خطا در اتصال: {str(e)}"
                }
        except Exception as e:
            return {
                "success": False,
                "status_code": None,
                "message": f"خطای ناشناخته: {str(e)}"
            }
    
    async def get_all_users(self):
        """دریافت تمام کاربران"""
        endpoint = f"{self.base_url}/users/"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    endpoint,
                    headers=self.headers,
                    timeout=self.timeout
                )
                return self._handle_response(response)
        except Exception as e:
            return {"error": f"خطا در دریافت کاربران: {str(e)}"}
    
    async def get_user(self, user_id: int):
        """دریافت کاربر خاص"""
        endpoint = f"{self.base_url}/users/{user_id}"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    endpoint,
                    headers=self.headers,
                    timeout=self.timeout
                )
                return self._handle_response(response)
        except Exception as e:
            return {"error": f"خطا در دریافت کاربر: {str(e)}"}
    
    async def create_user(self, user_data: Dict[str, Any]):
        """ایجاد کاربر جدید"""
        endpoint = f"{self.base_url}/users/admin/"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    endpoint,
                    headers=self.headers,
                    json=user_data,
                    timeout=self.timeout
                )
                return self._handle_response(response)
        except Exception as e:
            return {"error": f"خطا در ایجاد کاربر: {str(e)}"}
    
    async def update_user(self, user_id: int, update_data: Dict[str, Any]):
        """بروزرسانی کاربر"""
        endpoint = f"{self.base_url}/users/{user_id}"
        try:
            # توجه: در API اصلی از GET برای آپدیت استفاده شده
            # اما ما از PUT استفاده می‌کنیم (استانداردتر)
            async with httpx.AsyncClient() as client:
                response = await client.put(
                    endpoint,
                    headers=self.headers,
                    json=update_data,
                    timeout=self.timeout
                )
                return self._handle_response(response)
        except Exception as e:
            return {"error": f"خطا در بروزرسانی کاربر: {str(e)}"}
    
    def _handle_response(self, response: httpx.Response):
        """پردازش پاسخ سرور"""
        try:
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                return {"error": "عدم دسترسی - نام کاربری یا رمز عبور اشتباه است"}
            elif response.status_code == 404:
                return {"error": "منبع مورد نظر یافت نشد"}
            else:
                return {
                    "error": f"خطای سرور: {response.status_code}",
                    "details": response.text
                }
        except json.JSONDecodeError:
            return {
                "error": "خطا در پردازش پاسخ سرور",
                "raw_response": response.text
            }

# ایجاد یک نمونه از کلاینت
api_client = EduAPIClient()