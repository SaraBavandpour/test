from fastapi import FastAPI, HTTPException, Request, Depends, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse, RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import os
import httpx
from urllib.parse import quote
from fastapi.middleware.cors import CORSMiddleware

os.environ["HTTP_PROXY"] = ""
os.environ["HTTPS_PROXY"] = ""
os.environ["NO_PROXY"] = "*"

app = FastAPI(
    title="Havirkesht Dashboard",
    description="داشبورد مدیریت - اتصال مستقیم به سرور استاد",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # در حالت توسعه، در production محدود کن
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory="src"), name="static")

EDU_API_URL = "http://edu-api.havirkesht.ir"
EDU_USERNAME = "edu_40111415016"
EDU_PASSWORD = "40111415016"

auth_token = None

async def test_edu_connection():
    """تست مستقیم اتصال به سرور استاد"""
    try:
        # ⭐⭐ ساخت کلاینت بدون پروکسی
        transport = httpx.AsyncHTTPTransport(retries=3)
        
        async with httpx.AsyncClient(
            timeout=10.0,
            transport=transport,  # بدون پروکسی
            verify=False,
        ) as client:
            
            print("🔍 تست اتصال به سرور استاد...")
            
            # تست 1: اتصال پایه
            try:
                response = await client.get(EDU_API_URL, timeout=5)
                connection_test = {
                    "status": response.status_code,
                    "success": response.status_code < 500,
                    "message": "سرور پاسخ داد" if response.status_code < 500 else "سرور خطا داد"
                }
            except (httpx.ConnectError, httpx.TimeoutException) as e:
                connection_test = {
                    "status": 0,
                    "success": False,
                    "message": f"سرور در دسترس نیست: {str(e)}"
                }
            
            # تست 2: احراز هویت
            auth_test = {"success": False, "message": "آزمایش نشد"}
            try:
                form_data = {
                    "username": EDU_USERNAME,
                    "password": EDU_PASSWORD,
                }
                auth_response = await client.post(
                    f"{EDU_API_URL}/token",
                    data=form_data,
                    timeout=5
                )
                
                if auth_response.status_code == 200:
                    global auth_token
                    auth_token = auth_response.json().get("access_token")
                    auth_test = {
                        "success": True,
                        "message": "احراز هویت موفق",
                        "token_received": True if auth_token else False
                    }
                else:
                    auth_test = {
                        "success": False,
                        "message": f"خطای احراز: {auth_response.status_code}",
                        "details": auth_response.text[:100]
                    }
            except Exception as auth_error:
                auth_test = {
                    "success": False,
                    "message": f"خطا در احراز: {str(auth_error)[:100]}"
                }
            
            # تست 3: API endpoint (اگر توکن گرفتیم)
            api_test = {"success": False, "message": "توکن دریافت نشد"}
            if auth_token:
                try:
                    headers = {"Authorization": f"Bearer {auth_token}"}
                    api_response = await client.get(
                        f"{EDU_API_URL}/users/",
                        headers=headers,
                        timeout=5
                    )
                    api_test = {
                        "success": api_response.status_code == 200,
                        "status": api_response.status_code,
                        "message": "API کاربران کار می‌کند" if api_response.status_code == 200 else f"API خطا: {api_response.status_code}"
                    }
                except Exception as api_error:
                    api_test = {
                        "success": False,
                        "message": f"خطای API: {str(api_error)[:100]}"
                    }
            
            return {
                "server": EDU_API_URL,
                "connection": connection_test,
                "authentication": auth_test,
                "api_test": api_test,
                "proxy_status": "غیرفعال (از طریق محیط)",
                "overall_success": connection_test["success"] and auth_test["success"]
            }
            
    except Exception as e:
        return {
            "server": EDU_API_URL,
            "error": str(e)[:200],
            "proxy_status": "غیرفعال",
            "overall_success": False
        }
templates = Jinja2Templates(directory="src")

# صفحه اصلی
@app.get("/")
async def serve_home():
    return FileResponse("index.html")

@app.get("/section/{section_name}", response_class=HTMLResponse)
async def get_section(request: Request, section_name: str):
    return templates.TemplateResponse(
        f"{section_name}.html",
        {"request": request}
    )



# سلامت
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Havirkesht Dashboard",
        "local_server": "http://localhost:8000",
        "proxy": "disabled via os.environ"
    }


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_auth_headers(token: str = None) -> dict:
    """ایجاد headers برای درخواست به سرور استاد"""
    if not token:
        raise HTTPException(
            status_code=401, 
            detail="توکن احراز هویت موجود نیست. لطفا ابتدا وارد شوید."
        )
    return {"Authorization": f"Bearer {token}"}

async def make_edu_request(
    method: str,
    path: str,
    token: str,
    data: dict = None,
    params: dict = None,
):
    headers = get_auth_headers(token)
    full_url = f"{EDU_API_URL}{path}"

    try:
        transport = httpx.AsyncHTTPTransport(retries=3)

        async with httpx.AsyncClient(
            timeout=30.0,
            transport=transport,
            verify=False,
        ) as client:
            response = await client.request(
                method,
                full_url,
                headers=headers,
                json=data if data else None,
                params=params
            )

            if response.status_code >= 400:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"خطا از سرور استاد: {response.text}"
                )

            return response.json()

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"خطا در ارتباط با سرور استاد: {str(e)}"
        )

# ==================== AUTH ENDPOINTS ====================
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
async def login(login_data: LoginRequest):

    try:
        login_url = f"{EDU_API_URL}/token"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                login_url,
                data={
                    "username": login_data.username,
                    "password": login_data.password,
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"خطا در ورود: {response.text}"
            )

        data = response.json()

        # ✅ چک درست توکن
        if "access_token" not in data:
            raise HTTPException(
                status_code=401,
                detail="توکن در پاسخ سرور استاد وجود ندارد"
            )

        # ✅ بدون global ✅ بدون state ✅ OAuth2 واقعی
        return {
            "access_token": data["access_token"],
            "token_type": "bearer",
            "message": "ورود موفقیت‌آمیز بود"
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"خطا در ارتباط با سرور استاد: {str(e)}"
        )


@app.get("/api/check-auth")
async def check_auth(token: str = Depends(oauth2_scheme)):
    """بررسی وضعیت احراز هویت"""
    if token:
        return {"authenticated": True, "message": "کاربر احراز هویت شده"}
    return {"authenticated": False, "message": "لطفا وارد شوید"}

# ==================== DEPENDENCY FOR PROTECTED ROUTES ====================
async def get_current_token(token: str = Depends(oauth2_scheme)):
    """Dependency برای دریافت token از درخواست"""
    if not token:
        raise HTTPException(
            status_code=401,
            detail="توکن احراز هویت ارائه نشده",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token

#  API های CRUD سال زراعی (Crop Year)
 

class CropYearCreate(BaseModel):
    crop_year_name: str

@app.get("/api/crop-year/")
async def get_crop_years(token: str = Depends(get_current_token)):
    """دریافت لیست سال‌های زراعی"""
    try:
        data = await make_edu_request(
            method="GET",
            path="/crop-year/",
            token=token
        )
        # اضافه کردن اطلاعات بیشتر برای فرانت‌اند
        if isinstance(data, dict) and "items" in data:
            for item in data["items"]:
                # اضافه کردن ID برای استفاده در فرانت‌اند
                if "id" not in item and "crop_year_id" in item:
                    item["id"] = item["crop_year_id"]
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"خطای داخلی در دریافت داده‌ها: {str(e)}"
        )

@app.post("/api/crop-year/")
async def create_crop_year(
    crop_year: CropYearCreate,
    token: str = Depends(get_current_token)
):
    """ایجاد سال زراعی جدید"""
    try:
        print(f"🔍 داده ارسالی: {crop_year.dict()}")  # دیباگ
        print(f"🔍 توکن: {token[:20]}...")
        
        data = await make_edu_request(
            method="POST",
            path="/crop-year/",
            token=token,
            data={"crop_year_name": crop_year.crop_year_name}
        )
        print(f"✅ پاسخ: {data}")  # دیباگ
        return data
    except HTTPException as e:
        print(f"❌ HTTP خطا: {e.status_code} - {e.detail}")  # دیباگ
        raise
    except Exception as e:
        print(f"💥 استثنا: {str(e)}")  # دیباگ
        raise HTTPException(
            status_code=500,
            detail=f"خطای داخلی در ایجاد داده: {str(e)}"
        )

@app.delete("/api/crop-year/{crop_year_id}")
async def delete_crop_year(
    crop_year_id: str,
    token: str = Depends(get_current_token)
):
    """حذف سال زراعی"""
    try:
        print(f"🗑️ حذف سال زراعی با ID: {crop_year_id}")
        print(f"🔍 توکن: {token[:20]}...")

        data = await make_edu_request(
            method="DELETE",
            path=f"/crop-year/{crop_year_id}",
            token=token
        )

        print(f"✅ پاسخ حذف: {data}")
        return data

    except HTTPException as e:
        print(f"❌ HTTP خطا: {e.status_code} - {e.detail}")
        raise

    except Exception as e:
        print(f"💥 استثنا: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"خطای داخلی در حذف داده: {str(e)}"
        )
# ==================== MODELS ====================
# ==================== MODELS ====================
class ProvinceCreate(BaseModel):
    province: str  # نام فیلد دقیقاً مطابق API اصلی

# ==================== API ENDPOINTS FOR PROVINCE ====================

@app.get("/api/province/")
async def get_provinces(token: str = Depends(get_current_token)):
    """دریافت لیست استان‌ها"""
    try:
        data = await make_edu_request(
            method="GET",
            path="/province/",
            token=token
        )
        # اضافه کردن اطلاعات بیشتر برای فرانت‌اند
        if isinstance(data, dict) and "items" in data:
            for item in data["items"]:
                # اضافه کردن ID برای استفاده در فرانت‌اند
                if "id" not in item and "province_id" in item:
                    item["id"] = item["province_id"]
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"خطای داخلی در دریافت داده‌ها: {str(e)}"
        )

@app.post("/api/province/")
async def create_province(
    province: ProvinceCreate,
    token: str = Depends(get_current_token)
):
    """ایجاد استان جدید"""
    try:
        print(f"🔍 داده ارسالی: {province.dict()}")  # دیباگ
        print(f"🔍 توکن: {token[:20]}...")
        
        data = await make_edu_request(
            method="POST",
            path="/province/",
            token=token,
            data={"province": province.province}
        )
        print(f"✅ پاسخ: {data}")  # دیباگ
        return data
    except HTTPException as e:
        print(f"❌ HTTP خطا: {e.status_code} - {e.detail}")  # دیباگ
        raise
    except Exception as e:
        print(f"💥 استثنا: {str(e)}")  # دیباگ
        raise HTTPException(
            status_code=500,
            detail=f"خطای داخلی در ایجاد داده: {str(e)}"
        )

@app.delete("/api/province/{province_name}")
async def delete_province(
    province_name: str,
    token: str = Depends(get_current_token)
):
    """حذف استان"""
    try:
        print(f"🗑️ حذف استان: {province_name}")
        print(f"🔍 توکن: {token[:20]}...")

        data = await make_edu_request(
            method="DELETE",
            path=f"/province/{province_name}",
            token=token
        )

        print(f"✅ پاسخ حذف: {data}")
        return data

    except HTTPException as e:
        print(f"❌ HTTP خطا: {e.status_code} - {e.detail}")
        raise

    except Exception as e:
        print(f"💥 استثنا: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"خطای داخلی در حذف داده: {str(e)}"
        )


# ==================== MODELS ====================
class FarmerCreate(BaseModel):
    national_id: str
    first_name: str
    last_name: str
    full_name: str
    father_name: str
    phone_number: str
    sheba_number_1: str
    sheba_number_2: str
    card_number: str
    address: str

class FarmerUpdate(BaseModel):
    first_name: str
    last_name: str
    full_name: str
    father_name: str
    phone_number: str
    sheba_number_1: str
    sheba_number_2: str
    card_number: str
    address: str

# ==================== API ENDPOINTS FOR FARMER ====================

@app.get("/api/farmer/")
async def get_farmers(token: str = Depends(get_current_token)):
    """دریافت لیست تمام کشاورزان"""
    try:
        data = await make_edu_request(
            method="GET",
            path="/farmer/",
            token=token
        )
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"خطای داخلی در دریافت کشاورزان: {str(e)}"
        )

@app.get("/api/farmer/{national_id}")
async def get_farmer_by_national_id(
    national_id: str,
    token: str = Depends(get_current_token)
):
    """دریافت اطلاعات کشاورز بر اساس کد ملی"""
    try:
        data = await make_edu_request(
            method="GET",
            path=f"/farmer/{national_id}",
            token=token
        )
        return data
    except HTTPException as e:
        if e.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"کشاورز با کد ملی {national_id} یافت نشد"
            )
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"خطای داخلی در دریافت کشاورز: {str(e)}"
        )

@app.post("/api/farmer/")
async def create_farmer(
    farmer: FarmerCreate,
    token: str = Depends(get_current_token)
):
    """ایجاد کشاورز جدید"""
    try:
        data = await make_edu_request(
            method="POST",
            path="/farmer/",
            token=token,
            data=farmer.dict()
        )
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"خطای داخلی در ایجاد کشاورز: {str(e)}"
        )

@app.put("/api/farmer/{national_id}")
async def update_farmer(
    national_id: str,
    farmer_update: FarmerUpdate,
    token: str = Depends(get_current_token)
):
    """بروزرسانی اطلاعات کشاورز"""
    try:
        data = await make_edu_request(
            method="PUT",
            path=f"/farmer/{national_id}",
            token=token,
            data=farmer_update.dict()
        )
        return data
    except HTTPException as e:
        if e.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"کشاورز با کد ملی {national_id} یافت نشد"
            )
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"خطای داخلی در بروزرسانی کشاورز: {str(e)}"
        )

@app.delete("/api/farmer/{national_id}")
async def delete_farmer(
    national_id: str,
    token: str = Depends(get_current_token)
):
    """حذف کشاورز"""
    try:
        data = await make_edu_request(
            method="DELETE",
            path=f"/farmer/{national_id}",
            token=token
        )
        return data
    except HTTPException as e:
        if e.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"کشاورز با کد ملی {national_id} یافت نشد"
            )
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"خطای داخلی در حذف کشاورز: {str(e)}"
        )

@app.get("/api/farmer/farmer-id-to-user-id/{farmer_id}")
async def get_user_id_from_farmer_id(
    farmer_id: str,
    token: str = Depends(get_current_token)
):
    """دریافت user_id از farmer_id"""
    try:
        data = await make_edu_request(
            method="GET",
            path=f"/farmer/farmer-id-to-user-id/{farmer_id}",
            token=token
        )
        return data
    except HTTPException as e:
        if e.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"کشاورز با شناسه {farmer_id} یافت نشد"
            )
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"خطای داخلی در دریافت user_id: {str(e)}"
        )
#  API های CRUD کاربران (Users)
 

@app.get("/api/users")
async def get_users(
    page: int = 1,
    size: int = 50,
    token: str = Depends(get_current_token)
):
    return await make_edu_request(
        "GET",
        "/users/",
        token=token,
        params={"page": page, "size": size}
    )



@app.get("/api/test-edu-connection")
async def test_edu():
    return await test_edu_connection()

if __name__ == "__main__":
    import uvicorn
    import socket
    
    # گرفتن آدرس IP محلی
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    print("=" * 60)
    print("🚀 HAVIRKESHT DASHBOARD - نسخه بدون پروکسی")
    print("=" * 60)
    print(f"📡 سرور استاد: {EDU_API_URL}")
    print(f"👤 کاربر: {EDU_USERNAME}")
    print(f"🔗 تست اتصال: http://localhost:8000/api/test-edu-connection")
    print("👥 کاربران: http://localhost:8000/api/users")

    print(f"🏠 صفحه اصلی: http://localhost:8000/")
    print("=" * 60)
    print("🌐 آدرس‌های دسترسی:")
    print(f"   ✅ http://localhost:8000")
    print(f"   ✅ http://127.0.0.1:8000")
    print(f"   ✅ http://{local_ip}:8000 (برای شبکه محلی)")
    print("=" * 60)
    print("⚠️  توجه: VPN/Proxy باید غیرفعال باشد")
    print("⚠️  نکته: در مرورگر از 127.0.0.1 استفاده کن نه 0.0.0.0")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # سرور روی همه اینترفیس‌ها اجرا میشه
        port=8000,
        reload=True,
        log_level="info"
    )