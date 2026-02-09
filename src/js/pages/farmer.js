// فایل: /static/js/pages/farmer.js

// ==================== GLOBAL CHECK ====================
// چک کنید قبلاً تعریف نشده باشد
if (typeof window.__FARMER_LOADED === 'undefined') {
    window.__FARMER_LOADED = true;
    
    const API_BASE = "http://127.0.0.1:8000";
    const TOKEN_KEY = "access_token";

    async function authFetch(path, options = {}) {
        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
            console.warn("No access token in localStorage");
            throw new Error("No token");
        }

        const res = await fetch(`${API_BASE}${path}`, {
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

        if (!tbody || !countEl || !searchInput || !addBtn) return;

        // متغیرهای حالت
        let currentPage = 1;
        let pageSize = 10;
        let totalItems = 0;
        let searchQuery = "";
        const mainContainer = document.getElementById("page-container");
        if (mainContainer) {
            mainContainer.style.height = "calc(100vh - 120px)";
            mainContainer.style.overflowY = "auto";
            mainContainer.classList.add("overflow-y-auto");
        }
        function applySearch() {
            if (!searchQuery) {
                filteredFarmers = [...farmers];
                return;
        }

  filteredFarmers = farmers.filter(f =>
    f.full_name?.toLowerCase().includes(searchQuery) ||
    f.national_code?.includes(searchQuery) ||
    f.mobile?.includes(searchQuery)
  );
}


        /* ===================== API FUNCTIONS ===================== */

        const apiGetAll = async (page = 1, size = 10) => {
            const q = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";
            const res = await authFetch(`/api/farmer/?page=${page}&size=${size}${q}`);
            return res.json();
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
            const res = await authFetch(`/api/farmer/${nationalId}`, {
                method: "PUT",
                body: JSON.stringify(farmerData),
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

        /* ===================== RENDER FUNCTION ===================== */

        const render = async () => {
            try {
                const data = await apiGetAll(currentPage, pageSize);
                const items = data.items || [];
                totalItems = data.total || 0;

                // آپدیت آمار
                if (totalCountEl) totalCountEl.textContent = totalItems.toLocaleString('fa-IR');
                if (countEl) countEl.textContent = `${items.length} مورد`;

                // آپدیت صفحه‌بندی
                const start = ((currentPage - 1) * pageSize) + 1;
                const end = Math.min(currentPage * pageSize, totalItems);
                
                if (pageStartEl) pageStartEl.textContent = start;
                if (pageEndEl) pageEndEl.textContent = end;
                if (totalItemsEl) totalItemsEl.textContent = totalItems;
                if (currentPageEl) currentPageEl.textContent = currentPage;
                
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
                                    <span>کشاورزی یافت نشد</span>
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
                    <tr>
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
                                        class="edit-btn px-3 py-1 text-xs bg-blue-100 text-blue-600 hover:bg-blue-200 rounded">
                                    ویرایش
                                </button>
                                <button data-national-id="${farmer.national_id}" 
                                        class="delete-btn px-3 py-1 text-xs bg-red-100 text-red-600 hover:bg-red-200 rounded">
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
                console.error(e);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="p-4 text-red-600 text-center">
                            ${e.message}
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
                await render();
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
                
                // ذخیره nationalId برای آپدیت
                document.getElementById("farmerId").value = farmer.national_id;
            } else {
                modalTitle.textContent = "ایجاد کشاورز جدید";
                submitBtn.textContent = "ذخیره";
                
                // ریست فرم
                const form = document.querySelector("#farmerForm");
                if (form) form.reset();
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

        // جستجو

        searchInput.addEventListener("input", () => {
            searchQuery = searchInput.value.trim();
            currentPage = 1;
            applySearch();
            renderTable();
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
                
                const farmerData = {
                    national_id: document.getElementById("nationalId").value,
                    first_name: document.getElementById("firstName").value,
                    last_name: document.getElementById("lastName").value,
                    full_name: document.getElementById("fullName").value,
                    father_name: document.getElementById("fatherName").value,
                    phone_number: document.getElementById("phoneNumber").value,
                    sheba_number_1: document.getElementById("shebaNumber1").value,
                    sheba_number_2: document.getElementById("shebaNumber2").value,
                    card_number: document.getElementById("cardNumber").value,
                    address: document.getElementById("address").value
                };

                const isEditing = document.getElementById("farmerId").value !== "";
                const nationalId = document.getElementById("farmerId").value || document.getElementById("nationalId").value;

                try {
                    if (isEditing) {
                        await apiUpdate(nationalId, farmerData);
                        alert("کشاورز با موفقیت بروزرسانی شد");
                    } else {
                        await apiCreate(farmerData);
                        alert("کشاورز با موفقیت ایجاد شد");
                    }
                    
                    closeFarmerModal();
                    await render();
                } catch (error) {
                    console.error('خطا در ذخیره کشاورز:', error);
                    alert('خطا در ذخیره کشاورز: ' + error.message);
                }
            });
        }

        // رندر اولیه
        render();
    }

    window.setupFarmerPage = setupFarmerPage;
    console.log("✅ farmer.js با موفقیت لود شد");
} else {
    console.log("ℹ️ farmer.js قبلاً لود شده است");
}