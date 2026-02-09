// فایل: /static/js/pages/province.js

// ==================== GLOBAL CHECK ====================
// چک کنید قبلاً تعریف نشده باشد
if (typeof window.__PROVINCE_LOADED === 'undefined') {
    window.__PROVINCE_LOADED = true;
    
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

    function setupProvincePage() {
        console.log("🏙️ صفحه استان راه‌اندازی شد");

        const container = document.getElementById("page-container");
        if (!container) return;

        const page = container.querySelector("#province-page");
        if (!page) return;

        if (page.dataset.initialized) return;
        page.dataset.initialized = "true";

        const selectEl = page.querySelector("#provinceSelect");
        const addBtn = page.querySelector("#addProvinceBtn");
        const tbody = page.querySelector("#provinceTbody");
        const countEl = page.querySelector("#provinceCount");

        if (!selectEl || !addBtn || !tbody || !countEl) return;

        /* ===================== API FUNCTIONS ===================== */

        const apiGetAll = async () => {
            const res = await authFetch("/api/province/");
            const data = await res.json();
            return data.items || data;
        };

        const apiCreate = async (provinceName) => {
            const res = await authFetch("/api/province/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ province: provinceName }),
            });

            return res.json();
        };
        
        const apiDelete = async (provinceName) => {
            console.log(`🗑️ درخواست حذف استان: ${provinceName}`);
            const res = await authFetch(`/api/province/${encodeURIComponent(provinceName)}`, {
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
                                هیچ استانی ثبت نشده است
                            </td>
                        </tr>
                    `;
                    if (countEl) countEl.textContent = "۰ مورد";
                    return;
                }

                tbody.innerHTML = items.map(item => {
                    // نام استان می‌تواند در فیلدهای مختلف باشد
                    const provinceName = item.province || item.name || item.province_name;
                    return `
                    <tr>
                        <td class="px-4 py-3">${provinceName || '—'}</td>
                        <td class="px-4 py-3">${item.created_at || "—"}</td>
                        <td class="px-4 py-3">
                            <button data-province="${provinceName}" 
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
                        const provinceName = e.target.dataset.province;
                        console.log(`🎯 کلیک روی حذف استان: ${provinceName}`);
                        
                        if (!confirm(`آیا از حذف استان "${provinceName}" مطمئن هستید؟`)) return;
                        
                        try {
                            const result = await apiDelete(provinceName);
                            console.log(`✅ حذف موفق:`, result);
                            await render(); // رندر مجدد بعد از حذف
                        } catch (error) {
                            console.error(`❌ خطا در حذف استان ${provinceName}:`, error);
                            if (error.message.includes("404")) {
                                alert(`استان "${provinceName}" پیدا نشد یا امکان حذف آن وجود ندارد.`);
                            } else if (error.message.includes("409")) {
                                alert(`استان "${provinceName}" در حال استفاده است و نمی‌توان آن را حذف کرد.`);
                            } else {
                                alert(`خطا در حذف استان "${provinceName}": ${error.message}`);
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
            const provinceName = selectEl.value;
            if (!provinceName) return alert("استان را انتخاب کنید");

            try {
                await apiCreate(provinceName);
                await render();
            } catch (e) {
                alert('خطا در ایجاد استان: ' + e.message);
            }
        });

        // رندر اولیه
        render();
    }

    window.setupProvincePage = setupProvincePage;
    console.log("✅ province.js با موفقیت لود شد");
} else {
    console.log("ℹ️ province.js قبلاً لود شده است");
}