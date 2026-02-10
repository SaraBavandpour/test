// چک کنید قبلاً تعریف نشده باشد
if (typeof window.__FARMER_LOADED === 'undefined') {
    window.__FARMER_LOADED = true;
    
    const API_BASE = "https://edu-api.havirkesht.ir";
    const TOKEN_KEY = "access_token";

    async function authFetch(path, options = {}) {
        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
            console.warn("No access token in localStorage");
            throw new Error("No token");
        }

        // اضافه کردن / در ابتدای path اگر نداشت
        const fullPath = path.startsWith('/') ? path : `/${path}`;

        const res = await fetch(`${API_BASE}${fullPath}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
                Authorization: `Bearer ${token}`,
            },
        });

        if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            throw new Error("Unauthorized");
        }

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        return res;
    }

    /* ===================== PAGE SETUP ===================== */

    function setupFarmerPage() {
        console.log("👨‍🌾 صفحه کشاورزان راه‌اندازی شد");

        const container = document.getElementById("page-container");
        if (!container) return;

        const page = container.querySelector("#farmer-page");
        if (!page) return;

        if (page.dataset.initialized) return;
        page.dataset.initialized = "true";

        const tbody = page.querySelector("#farmerTbody");
        const countEl = page.querySelector("#farmerCount");
        const totalCountEl = page.querySelector("#totalFarmersCount");
        const searchInput = page.querySelector("#farmerSearch");
        const addBtn = page.querySelector("#addFarmerBtn");
        
        // صفحه‌بندی
        const prevBtn = page.querySelector("#prevPage");
        const nextBtn = page.querySelector("#nextPage");
        const currentPageEl = page.querySelector("#currentPage");
        const pageStartEl = page.querySelector("#pageStart");
        const pageEndEl = page.querySelector("#pageEnd");
        const totalItemsEl = page.querySelector("#totalItems");

        if (!tbody || !countEl || !searchInput || !addBtn) {
            console.error("❌ المان‌های ضروری یافت نشد");
            return;
        }

        // متغیرهای حالت
        let currentPage = 1;
        let pageSize = 10;
        let totalItems = 0;
        let searchQuery = "";
        let allFarmers = []; // ذخیره تمام داده‌ها برای فیلتر کردن

        const mainContainer = document.getElementById("page-container");
        if (mainContainer) {
            mainContainer.style.height = "calc(100vh - 120px)";
            mainContainer.style.overflowY = "auto";
            mainContainer.classList.add("overflow-y-auto");
        }

        /* ===================== API FUNCTIONS ===================== */

        const apiGetAll = async () => {
            const res = await authFetch("/api/farmer/");
            const data = await res.json();
            
            // بررسی ساختار پاسخ
            console.log("📦 پاسخ API:", data);
            
            // اگر آرایه مستقیم بود
            if (Array.isArray(data)) {
                return data;
            }
            
            // اگر object با items بود
            if (data.items && Array.isArray(data.items)) {
                return data.items;
            }
            
            // اگر object با data بود
            if (data.data && Array.isArray(data.data)) {
                return data.data;
            }
            
            console.error("❌ ساختار پاسخ نامعتبر:", data);
            return [];
        };

        const apiGetByNationalId = async (nationalId) => {
            const res = await authFetch(`/api/farmer/${nationalId}`);
            return res.json();
        };

        const apiCreate = async (farmerData) => {
            const res = await authFetch("/api/farmer/", {
                method: "POST",
                body: JSON.stringify(farmerData),
            });
            return res.json();
        };
        
        const apiUpdate = async (nationalId, farmerData) => {
            // حذف national_id از داده‌های ارسالی چون در URL هست
            const { national_id, ...updateData } = farmerData;
            
            const res = await authFetch(`/api/farmer/${nationalId}`, {
                method: "PUT",
                body: JSON.stringify(updateData),
            });
            return res.json();
        };
        
        const apiDelete = async (nationalId) => {
            console.log(`🗑️ درخواست حذف کشاورز: ${nationalId}`);
            const res = await authFetch(`/api/farmer/${nationalId}`, {
                method: "DELETE",
            });
            return res.json();
        };

        /* ===================== FILTER & PAGINATION ===================== */

        const filterAndPaginate = () => {
            // فیلتر کردن
            let filtered = allFarmers;
            
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filtered = allFarmers.filter(farmer => {
                    return (
                        (farmer.full_name && farmer.full_name.toLowerCase().includes(query)) ||
                        (farmer.national_id && farmer.national_id.includes(query)) ||
                        (farmer.father_name && farmer.father_name.toLowerCase().includes(query)) ||
                        (farmer.phone_number && farmer.phone_number.includes(query))
                    );
                });
            }
            
            totalItems = filtered.length;
            
            // صفحه‌بندی
            const start = (currentPage - 1) * pageSize;
            const end = start + pageSize;
            const paginatedItems = filtered.slice(start, end);
            
            return paginatedItems;
        };

        /* ===================== RENDER FUNCTION ===================== */

        const render = async (reload = false) => {
            try {
                // اگر reload باشد یا داده‌ها خالی باشد، از API بگیر
                if (reload || allFarmers.length === 0) {
                    allFarmers = await apiGetAll();
                    console.log(`📊 تعداد کل کشاورزان: ${allFarmers.length}`);
                }
                
                const items = filterAndPaginate();
                
                // آپدیت آمار
                if (totalCountEl) {
                    totalCountEl.textContent = allFarmers.length.toLocaleString('fa-IR');
                }
                if (countEl) {
                    countEl.textContent = `${items.length} مورد`;
                }

                // آپدیت صفحه‌بندی
                const start = ((currentPage - 1) * pageSize) + 1;
                const end = Math.min(currentPage * pageSize, totalItems);
                
                if (pageStartEl) pageStartEl.textContent = start.toLocaleString('fa-IR');
                if (pageEndEl) pageEndEl.textContent = end.toLocaleString('fa-IR');
                if (totalItemsEl) totalItemsEl.textContent = totalItems.toLocaleString('fa-IR');
                if (currentPageEl) currentPageEl.textContent = currentPage.toLocaleString('fa-IR');
                
                // فعال/غیرفعال کردن دکمه‌های صفحه‌بندی
                if (prevBtn) prevBtn.disabled = currentPage === 1;
                if (nextBtn) nextBtn.disabled = currentPage * pageSize >= totalItems;

                if (!items || !items.length) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" class="p-8 text-center text-black/40">
                                <div class="flex flex-col items-center gap-2">
                                    <svg class="w-12 h-12 text-black/20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" 
                                            stroke-width="1.5" d="M17 17l4 4M3 11a8 8 0 1016 0a8 8 0 00-16 0z"/>
                                    </svg>
                                    <span>${searchQuery ? 'نتیجه‌ای یافت نشد' : 'کشاورزی یافت نشد'}</span>
                                </div>
                            </td>
                        </tr>
                    `;
                    return;
                }

                tbody.innerHTML = items.map(farmer => {
                    // فرمت شماره تلفن
                    const formatPhone = (phone) => {
                        if (!phone) return '—';
                        return phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
                    };

                    return `
                    <tr class="hover:bg-black/5">
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                                <div class="w-8 h-8 rounded-full bg-[#452829]/10 flex items-center justify-center">
                                    <svg class="w-4 h-4 text-[#452829]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" 
                                            stroke-width="1.5" d="M17 8.5a5 5 0 1 0-10 0a5 5 0 0 0 10 0m-2 12a7 7 0 1 0-14 0"/>
                                    </svg>
                                </div>
                                <div>
                                    <div class="font-medium">${farmer.full_name || '—'}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3 font-mono text-sm">${farmer.national_id || '—'}</td>
                        <td class="px-4 py-3">${farmer.father_name || '—'}</td>
                        <td class="px-4 py-3 font-mono text-sm dir-ltr">${formatPhone(farmer.phone_number)}</td>
                        <td class="px-4 py-3 font-mono text-sm dir-ltr" dir="ltr">${farmer.sheba_number_1 || '—'}</td>
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                                <button data-national-id="${farmer.national_id}" 
                                        class="edit-btn px-3 py-1 text-xs bg-blue-100 text-blue-600 hover:bg-blue-200 rounded transition">
                                    ویرایش
                                </button>
                                <button data-national-id="${farmer.national_id}" 
                                        class="delete-btn px-3 py-1 text-xs bg-red-100 text-red-600 hover:bg-red-200 rounded transition">
                                    حذف
                                </button>
                            </div>
                        </td>
                    </tr>
                    `;
                }).join("");

                // اضافه کردن event listener برای دکمه‌های ویرایش و حذف
                tbody.querySelectorAll('.edit-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const nationalId = e.target.dataset.nationalId;
                        console.log(`🎯 کلیک روی ویرایش کشاورز: ${nationalId}`);
                        await handleEdit(nationalId);
                    });
                });

                tbody.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const nationalId = e.target.dataset.nationalId;
                        console.log(`🎯 کلیک روی حذف کشاورز: ${nationalId}`);
                        await handleDelete(nationalId);
                    });
                });

            } catch (e) {
                console.error("❌ خطا در رندر:", e);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="p-4 text-red-600 text-center">
                            خطا در بارگذاری داده‌ها: ${e.message}
                        </td>
                    </tr>
                `;
            }
        };

        /* ===================== EVENT HANDLERS ===================== */

        const handleEdit = async (nationalId) => {
            try {
                const farmer = await apiGetByNationalId(nationalId);
                openFarmerModal(farmer, true);
            } catch (error) {
                console.error(`❌ خطا در دریافت اطلاعات کشاورز ${nationalId}:`, error);
                alert(`خطا در دریافت اطلاعات کشاورز: ${error.message}`);
            }
        };

        const handleDelete = async (nationalId) => {
            try {
                const farmer = await apiGetByNationalId(nationalId);
                const farmerName = farmer.full_name || farmer.national_id;
                
                if (!confirm(`آیا از حذف کشاورز "${farmerName}" مطمئن هستید؟`)) return;
                
                await apiDelete(nationalId);
                alert('کشاورز با موفقیت حذف شد');
                await render(true); // reload data
            } catch (error) {
                console.error(`❌ خطا در حذف کشاورز ${nationalId}:`, error);
                alert(`خطا در حذف کشاورز: ${error.message}`);
            }
        };

        /* ===================== MODAL FUNCTIONS ===================== */

        const openFarmerModal = (farmer = null, isEditing = false) => {
            const modal = document.querySelector("#farmerModal");
            const modalTitle = document.querySelector("#modalTitle");
            const submitBtn = document.querySelector("#submitBtn");
            const nationalIdInput = document.getElementById("nationalId");
            
            if (!modal || !modalTitle || !submitBtn) {
                console.error("❌ Modal elements not found");
                return;
            }

            if (isEditing && farmer) {
                modalTitle.textContent = "ویرایش کشاورز";
                submitBtn.textContent = "بروزرسانی";
                
                // پر کردن فرم با اطلاعات کشاورز
                document.getElementById("nationalId").value = farmer.national_id || "";
                document.getElementById("firstName").value = farmer.first_name || "";
                document.getElementById("lastName").value = farmer.last_name || "";
                document.getElementById("fullName").value = farmer.full_name || "";
                document.getElementById("fatherName").value = farmer.father_name || "";
                document.getElementById("phoneNumber").value = farmer.phone_number || "";
                document.getElementById("shebaNumber1").value = farmer.sheba_number_1 || "";
                document.getElementById("shebaNumber2").value = farmer.sheba_number_2 || "";
                document.getElementById("cardNumber").value = farmer.card_number || "";
                document.getElementById("address").value = farmer.address || "";
                
                // غیرفعال کردن ویرایش کد ملی
                nationalIdInput.readOnly = true;
                nationalIdInput.classList.add('bg-gray-100');
                
                // ذخیره nationalId برای آپدیت
                document.getElementById("farmerId").value = farmer.national_id;
            } else {
                modalTitle.textContent = "ایجاد کشاورز جدید";
                submitBtn.textContent = "ذخیره";
                
                // فعال کردن ویرایش کد ملی
                nationalIdInput.readOnly = false;
                nationalIdInput.classList.remove('bg-gray-100');
                
                // ریست فرم
                const form = document.querySelector("#farmerForm");
                if (form) form.reset();
                document.getElementById("farmerId").value = "";
            }

            // نمایش مودال
            modal.classList.remove("hidden");
            modal.classList.add("flex");
        };

        const closeFarmerModal = () => {
            const modal = document.querySelector("#farmerModal");
            if (modal) {
                modal.classList.add("hidden");
                modal.classList.remove("flex");
            }
        };

        /* ===================== EVENT LISTENERS ===================== */

        // جستجو با debounce
        let searchTimeout;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchQuery = e.target.value.trim();
                currentPage = 1; // بازگشت به صفحه اول
                render();
            }, 300); // 300ms debounce
        });

        // اضافه کردن کشاورز جدید
        addBtn.addEventListener("click", () => {
            openFarmerModal();
        });

        // صفحه‌بندی
        if (prevBtn) {
            prevBtn.addEventListener("click", () => {
                if (currentPage > 1) {
                    currentPage--;
                    render();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                if (currentPage * pageSize < totalItems) {
                    currentPage++;
                    render();
                }
            });
        }

        // بستن مودال
        const closeModalBtn = document.querySelector("#closeModal");
        const cancelBtn = document.querySelector("#cancelBtn");
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener("click", closeFarmerModal);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener("click", closeFarmerModal);
        }

        // بستن مودال با کلیک روی backdrop
        const modal = document.querySelector("#farmerModal");
        if (modal) {
            modal.addEventListener("click", (e) => {
                if (e.target === modal) {
                    closeFarmerModal();
                }
            });
        }

        // ارسال فرم
        const farmerForm = document.querySelector("#farmerForm");
        if (farmerForm) {
            farmerForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                
                const submitBtn = document.getElementById("submitBtn");
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = "در حال ذخیره...";
                
                try {
                    const farmerData = {
                        national_id: document.getElementById("nationalId").value.trim(),
                        first_name: document.getElementById("firstName").value.trim(),
                        last_name: document.getElementById("lastName").value.trim(),
                        full_name: document.getElementById("fullName").value.trim(),
                        father_name: document.getElementById("fatherName").value.trim(),
                        phone_number: document.getElementById("phoneNumber").value.trim(),
                        sheba_number_1: document.getElementById("shebaNumber1").value.trim(),
                        sheba_number_2: document.getElementById("shebaNumber2").value.trim(),
                        card_number: document.getElementById("cardNumber").value.trim(),
                        address: document.getElementById("address").value.trim()
                    };

                    const isEditing = document.getElementById("farmerId").value !== "";
                    const nationalId = document.getElementById("farmerId").value || farmerData.national_id;

                    if (isEditing) {
                        await apiUpdate(nationalId, farmerData);
                        alert("کشاورز با موفقیت بروزرسانی شد");
                    } else {
                        await apiCreate(farmerData);
                        alert("کشاورز با موفقیت ایجاد شد");
                    }
                    
                    closeFarmerModal();
                    await render(true); // reload data
                } catch (error) {
                    console.error('خطا در ذخیره کشاورز:', error);
                    alert('خطا در ذخیره کشاورز: ' + error.message);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        }

        // رندر اولیه
        console.log("🚀 شروع رندر اولیه...");
        render(true);
    }

    window.setupFarmerPage = setupFarmerPage;
    console.log("✅ farmer.js با موفقیت لود شد");
} else {
    console.log("ℹ️ farmer.js قبلاً لود شده است");
}
