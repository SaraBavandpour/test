// در app.js
// app.js
class PageLoader {
    constructor() {
        this.pages = {
            'dashboard': '../pages/dashboard/content.html',
            'data/crop-year': '../pages/data/crop-year/content.html'
            // اضافه کن بقیه صفحات رو
        };
    }

    async loadPage(pageName) {
        console.log(`لود صفحه: ${pageName}`);

        const pageUrl = this.pages[pageName];
        if (!pageUrl) {
            console.error(`صفحه ${pageName} تعریف نشده!`);
            return;
        }

        try {
            // لود محتوای صفحه
            const response = await fetch(pageUrl);
            if (!response.ok) {
                throw new Error(`خطا در دریافت صفحه: ${response.status}`);
            }

            const html = await response.text();

            // نمایش در container
            const container = document.getElementById('page-container');
            if (container) {
                container.innerHTML = html;
                console.log('صفحه با موفقیت لود شد');

                // به‌روزرسانی URL (بدون رفرش)
                history.pushState({ page: pageName }, '', `/${pageName}`);

                // رویدادهای صفحه جدید رو فعال کن
                eventManager.setupPageEvents();
            } else {
                console.error('عنصر #page-container پیدا نشد!');
            }

        } catch (error) {
            console.error('خطا در لود صفحه:', error);
            this.showError(error.message);
        }
    }

    showError(message) {
        const container = document.getElementById('page-container');
        if (container) {
            container.innerHTML = `
                <div class="p-8 bg-red-50 text-red-700 rounded-lg">
                    <h3 class="text-xl font-bold mb-2">خطا در بارگیری صفحه</h3>
                    <p class="mb-4">${message}</p>
                    <button onclick="app.loadPage('dashboard')" 
                            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        بازگشت به داشبورد
                    </button>
                </div>
            `;
        }
    }
}

class EventManager {
    constructor() {
        this.setupEventDelegation();
        this.setupNavigationEvents();
    }

    setupEventDelegation() {
        // ۱. آکاردئون (با event delegation)
        document.addEventListener('click', (e) => {
            // اگر کلیک روی title آکاردئون بود
            if (e.target.closest('.accr .title')) {
                this.handleAccordionClick(e.target.closest('.accr .item'));
            }

            // اگر کلیک روی دکمه منو بود
            if (e.target.closest('[data-action="toggle-menu"]')) {
                this.togglemenu();
            }

            // اگر کلیک روی دکمه کاربر بود
            if (e.target.closest('[data-action="open-user"]')) {
                this.openuser();
            }

            // اگر کلیک روی دکمه بستن کاربر بود
            if (e.target.closest('[data-action="close-user"]')) {
                this.closeuser();
            }
        });
    }

    setupNavigationEvents() {
        // Event delegation برای لینک‌های منو
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-page]');
            if (link) {
                e.preventDefault();
                const pageName = link.getAttribute('data-page');
                app.loadPage(pageName);
            }
        });

        // دکمه بازگشت/جلو مرورگر
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                app.loadPage(e.state.page);
            }
        });
    }

    setupPageEvents() {
        // این تابع رو بعد از لود هر صفحه صدا بزن
        // برای رویدادهای خاص اون صفحه
        console.log('رویدادهای صفحه جدید تنظیم شد');

        // اگر صفحه داشبورد هست، چارت‌ها رو لود کن
        if (window.location.pathname.includes('dashboard')) {
            this.loadDashboardCharts();
        }
    }

    handleAccordionClick(item) {
        const openitem = document.querySelector(".item.active");
        if (openitem && openitem !== item) {
            openitem.querySelector(".icon")?.classList.remove("rotate-180");
            openitem.classList.remove("active");
            openitem.querySelector(".content").style.maxHeight = null;
        }
        item.classList.toggle("active");
        const content = item.querySelector(".content");
        const icon = item.querySelector(".icon");
        if (item.classList.contains("active")) {
            content.style.maxHeight = content.scrollHeight + "px";
            icon?.classList.add("rotate-180");
        } else {
            content.style.maxHeight = null;
            icon?.classList.remove("rotate-180");
        }
    }

    togglemenu() {
        const menu = document.querySelector("#menu");
        if (menu) {
            menu.classList.toggle("w-0");
            menu.classList.toggle("min-w-xs");
            menu.classList.toggle("py-4");
            menu.classList.toggle("px-8");
            menu.classList.toggle("max-w-md");
        }
    }

    openuser() {
        const user = document.querySelector("#user");
        if (user) {
            user.classList.add("h-full");
            user.classList.remove("h-0");
        }
    }

    closeuser() {
        const user = document.querySelector("#user");
        if (user) {
            user.classList.remove("h-full");
            user.classList.add("h-0");
        }
    }

    loadDashboardCharts() {
        // بعداً چارت‌ها رو اینجا لود کن
        console.log('لود چارت‌های داشبورد');
    }
}

// ایجاد instance های global
const app = new PageLoader();
const eventManager = new EventManager();

// توابع global برای دسترسی از HTML
window.loadPage = (pageName) => app.loadPage(pageName);
window.togglemenu = () => eventManager.togglemenu();
window.openuser = () => eventManager.openuser();
window.closeuser = () => eventManager.closeuser();

// راه‌اندازی اولیه
document.addEventListener('DOMContentLoaded', () => {
    console.log('اپلیکیشن راه‌اندازی شد');

    // لود صفحه اول بر اساس URL
    const path = window.location.pathname.substring(1) || 'dashboard';
    app.loadPage(path);
});