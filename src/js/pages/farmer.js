// جلوگیری از لود چندباره
if (window.__FARMER_LOADED__) {
    console.log("ℹ️ farmer.js قبلاً لود شده");
    return;
}
window.__FARMER_LOADED__ = true;

const API_BASE = "https://edu-api.havirkesht.ir";
const TOKEN_KEY = "access_token";

/* ===================== AUTH FETCH ===================== */

async function authFetch(path, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
        throw new Error("توکن ورود یافت نشد");
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        let msg = "خطای سرور";
        try {
            const err = await res.json();
            msg = err.detail || msg;
        } catch {}
        throw new Error(msg);
    }

    return res.json();
}

/* ===================== API ===================== */

const apiGetAll = () => authFetch("/api/farmer/");
const apiGetByNationalId = (id) => authFetch(`/api/farmer/${id}`);
const apiCreate = (data) =>
    authFetch("/api/farmer/", {
        method: "POST",
        body: JSON.stringify(data),
    });

const apiUpdate = (id, data) =>
    authFetch(`/api/farmer/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });

const apiDelete = (id) =>
    authFetch(`/api/farmer/${id}`, { method: "DELETE" });

/* ===================== PAGE ===================== */

function setupFarmerPage() {
    const page = document.getElementById("farmer-page");
    if (!page || page.dataset.initialized) return;
    page.dataset.initialized = "true";

    const tbody = document.getElementById("farmerTbody");
    const searchInput = document.getElementById("farmerSearch");
    const totalCountEl = document.getElementById("totalFarmersCount");
    const countEl = document.getElementById("farmerCount");

    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");
    const currentPageEl = document.getElementById("currentPage");
    const pageStartEl = document.getElementById("pageStart");
    const pageEndEl = document.getElementById("pageEnd");
    const totalItemsEl = document.getElementById("totalItems");

    let allItems = [];
    let filteredItems = [];
    let currentPage = 1;
    const pageSize = 10;
    let searchQuery = "";

    /* ===================== RENDER ===================== */

    function renderTable() {
        const startIndex = (currentPage - 1) * pageSize;
        const pageItems = filteredItems.slice(
            startIndex,
            startIndex + pageSize
        );

        tbody.innerHTML = "";

        if (!pageItems.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="p-6 text-center text-black/40">
                        موردی یافت نشد
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = pageItems
            .map(
                (f) => `
            <tr>
                <td class="px-4 py-3">${f.full_name || "—"}</td>
                <td class="px-4 py-3 font-mono">${f.national_id}</td>
                <td class="px-4 py-3">${f.father_name || "—"}</td>
                <td class="px-4 py-3 font-mono">${f.phone_number || "—"}</td>
                <td class="px-4 py-3 font-mono">${f.sheba_number_1 || "—"}</td>
                <td class="px-4 py-3">
                    <button class="edit-btn text-blue-600" data-id="${f.national_id}">ویرایش</button>
                    <button class="delete-btn text-red-600 ml-2" data-id="${f.national_id}">حذف</button>
                </td>
            </tr>`
            )
            .join("");

        tbody.querySelectorAll(".edit-btn").forEach((btn) =>
            btn.addEventListener("click", () =>
                handleEdit(btn.dataset.id)
            )
        );

        tbody.querySelectorAll(".delete-btn").forEach((btn) =>
            btn.addEventListener("click", () =>
                handleDelete(btn.dataset.id)
            )
        );
    }

    function renderPagination() {
        const total = filteredItems.length;
        const totalPages = Math.ceil(total / pageSize);

        totalCountEl.textContent = total.toLocaleString("fa-IR");
        countEl.textContent = `${filteredItems.length} مورد`;

        pageStartEl.textContent =
            total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        pageEndEl.textContent = Math.min(
            currentPage * pageSize,
            total
        );
        totalItemsEl.textContent = total;
        currentPageEl.textContent = currentPage;

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage >= totalPages;
    }

    function applyFilter() {
        filteredItems = allItems.filter(
            (f) =>
                f.full_name?.includes(searchQuery) ||
                f.national_id?.includes(searchQuery)
        );
        currentPage = 1;
        renderPagination();
        renderTable();
    }

    /* ===================== LOAD ===================== */

    async function loadData() {
        try {
            allItems = await apiGetAll();
            filteredItems = [...allItems];
            renderPagination();
            renderTable();
        } catch (e) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="p-6 text-center text-red-600">
                        ${e.message}
                    </td>
                </tr>`;
        }
    }

    /* ===================== EVENTS ===================== */

    searchInput.addEventListener("input", () => {
        searchQuery = searchInput.value.trim();
        applyFilter();
    });

    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderPagination();
            renderTable();
        }
    });

    nextBtn.addEventListener("click", () => {
        currentPage++;
        renderPagination();
        renderTable();
    });

    /* ===================== CRUD ===================== */

    async function handleEdit(id) {
        const farmer = await apiGetByNationalId(id);
        openFarmerModal(farmer, true);
    }

    async function handleDelete(id) {
        if (!confirm("حذف شود؟")) return;
        await apiDelete(id);
        await loadData();
    }

    loadData();
}

window.setupFarmerPage = setupFarmerPage;
console.log("✅ farmer.js اصلاح‌شده لود شد");

