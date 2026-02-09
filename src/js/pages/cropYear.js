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

function setupCropYearPage() {
    console.log("📅 صفحه سال زراعی راه‌اندازی شد");

    const container = document.getElementById("page-container");
    if (!container) return;

    const page = container.querySelector("#crop-year-page");
    if (!page) return;

    if (page.dataset.initialized) return;
    page.dataset.initialized = "true";

    const selectEl = page.querySelector("#cropYearSelect");
    const addBtn = page.querySelector("#addCropYearBtn");
    const tbody = page.querySelector("#cropYearTbody");
    const countEl = page.querySelector("#cropYearCount");

    if (!selectEl || !addBtn || !tbody || !countEl) return;

    /* ===================== POPULATE YEARS IN SELECT ===================== */
    const populateYearSelect = () => {
        // حذف گزینه‌های موجود
        selectEl.innerHTML = '';
        
        // سال جاری شمسی
        const currentShamsiYear = 1403; // اینجا می‌توانید از کتابخانه‌ای برای تاریخ شمسی استفاده کنید
        // یا به صورت دستی:
        // const currentGregorianYear = new Date().getFullYear();
        // const currentShamsiYear = gregorianToJalali(currentGregorianYear).year;
        
        // اضافه کردن ۵ سال گذشته و ۵ سال آینده
        for (let i = -5; i <= 5; i++) {
            const year = currentShamsiYear + i;
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            selectEl.appendChild(option);
        }
        
        // انتخاب سال جاری به عنوان پیش‌فرض
        selectEl.value = currentShamsiYear;
    };

    // فراخوانی تابع برای پر کردن select
    populateYearSelect();

    /* ===================== API FUNCTIONS ===================== */

    const apiGetAll = async () => {
        const res = await authFetch("/api/crop-year/");
        const data = await res.json();
        return data.items || data;
    };

    const apiCreate = async (year) => {
        const res = await authFetch("/api/crop-year/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ crop_year_name: year }),
        });

        return res.json();
    };
    
    const apiDelete = async (yearName) => {
        console.log(`🗑️ درخواست حذف سال: ${yearName}`);
        const res = await authFetch(`/api/crop-year/${encodeURIComponent(yearName)}`, {
            method: "DELETE",
        });
        return res.json();
    };

    /* ===================== RENDER FUNCTION ===================== */

    const render = async () => {
        try {
            const items = await apiGetAll();

            if (!items || !items.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="3" class="p-4 text-center text-black/40">
                            هیچ سال زراعی ثبت نشده است
                        </td>
                    </tr>
                `;
                if (countEl) countEl.textContent = "۰ مورد";
                return;
            }

            tbody.innerHTML = items.map(item => {
                const yearName = item.crop_year_name;
                return `
                <tr>
                    <td class="px-4 py-3">${item.crop_year_name || '—'}</td>
                    <td class="px-4 py-3">${item.created_at || "—"}</td>
                    <td class="px-4 py-3">
                        <button data-year="${yearName}" 
                                class="delete-btn px-3 py-1 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded">
                            حذف
                        </button>
                    </td>
                </tr>
                `;
            }).join("");

            if (countEl) countEl.textContent = `تعداد: ${items.length}`;

            // اضافه کردن event listener برای دکمه‌های حذف
            tbody.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const yearName = e.target.dataset.year;
                    console.log(`🎯 کلیک روی حذف سال: ${yearName}`);
                    
                    if (!confirm(`آیا از حذف سال زراعی "${yearName}" مطمئن هستید؟`)) return;
                    
                    try {
                        const result = await apiDelete(yearName);
                        console.log(`✅ حذف موفق:`, result);
                        await render(); // رندر مجدد بعد از حذف
                    } catch (error) {
                        console.error(`❌ خطا در حذف سال ${yearName}:`, error);
                        if (error.message.includes("404")) {
                            alert(`سال "${yearName}" پیدا نشد یا امکان حذف آن وجود ندارد.`);
                        } else if (error.message.includes("409")) {
                            alert(`سال "${yearName}" در حال استفاده است و نمی‌توان آن را حذف کرد.`);
                        } else {
                            alert(`خطا در حذف سال "${yearName}": ${error.message}`);
                        }
                    }
                });
            });

        } catch (e) {
            console.error(e);
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="p-4 text-red-600 text-center">
                        ${e.message}
                    </td>
                </tr>
            `;
        }
    };

    /* ===================== EVENTS ===================== */

    addBtn.addEventListener("click", async () => {
        const year = selectEl.value;
        if (!year) return alert("سال را انتخاب کنید");

        try {
            await apiCreate(year);
            await render();
        } catch (e) {
            alert('خطا در ایجاد سال زراعی: ' + e.message);
        }
    });

    // رندر اولیه
    render();
}

window.setupCropYearPage = setupCropYearPage;