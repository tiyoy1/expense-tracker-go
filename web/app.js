const API_BASE = "";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        const errorEl = document.getElementById("login-error");
        errorEl.textContent = "";
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            if (!response.ok) {
                const message = await response.text();
                errorEl.textContent = message;
                return;
            }
            const data = await response.json();
            localStorage.setItem("token", data.token);
            window.location.href = "dashboard.html";
        } catch (err) {
            errorEl.textContent = "Could not reach the server.";
        }
    });
}

if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("register-name").value;
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;
        const errorEl = document.getElementById("register-error");
        errorEl.textContent = "";
        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });
            if (!response.ok) {
                const message = await response.text();
                errorEl.textContent = message;
                return;
            }
            errorEl.style.color = "green";
            errorEl.textContent = "Account created — please log in.";
        } catch (err) {
            errorEl.textContent = "Could not reach the server.";
        }
    });
}

const dashboardEl = document.getElementById("total-income");

if (dashboardEl) {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
    }

    function authHeaders() {
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        };
    }

    let toastTimeout;
    function showToast(message) {
        const toast = document.getElementById("toast");
        clearTimeout(toastTimeout);
        toast.textContent = message;
        toast.classList.remove("hidden");
        void toast.offsetWidth;
        toast.classList.add("show");
        toastTimeout = setTimeout(() => toast.classList.remove("show"), 2500);
    }

    function formatNumberInput(el) {
        el.addEventListener("input", () => {
            const digits = el.value.replace(/\D/g, "");
            el.value = digits === "" ? "" : new Intl.NumberFormat("id-ID").format(parseInt(digits, 10));
        });
    }
    function parseFormattedNumber(value) {
        return parseFloat(value.replace(/\./g, "")) || 0;
    }
    formatNumberInput(document.getElementById("tx-amount"));
    formatNumberInput(document.getElementById("budget-amount"));

    let categoriesById = {};

    async function loadCategories() {
        const response = await fetch(`${API_BASE}/categories`);
        const categories = await response.json();
        if (!categories) return;

        const txSelect = document.getElementById("tx-category");
        const filterSelect = document.getElementById("filter-category");
        categories.forEach((cat) => {
            categoriesById[cat.id] = cat.name;

            const opt1 = document.createElement("option");
            opt1.value = cat.id;
            opt1.textContent = cat.name;
            txSelect.appendChild(opt1);

            const opt2 = document.createElement("option");
            opt2.value = cat.id;
            opt2.textContent = cat.name;
            filterSelect.appendChild(opt2);
        });
    }

    function formatRupiah(amount) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(amount);
    }

    function formatDateHeader(dateStr) {
        // Appending T00:00:00 avoids the browser interpreting a bare date as
        // UTC midnight, which can otherwise display as the previous day
        // depending on your timezone offset.
        const date = new Date(dateStr + "T00:00:00");
        return date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
    }

    async function loadDashboard() {
        const statusEl = document.getElementById("dashboard-status");
        statusEl.classList.remove("hidden", "error");
        statusEl.textContent = "Memuat dashboard...";

        try {
            const response = await fetch(`${API_BASE}/dashboard`, { headers: authHeaders() });

            if (response.status === 401) {
                localStorage.removeItem("token");
                window.location.href = "index.html";
                return;
            }
            if (!response.ok) throw new Error("request failed");

            const data = await response.json();
            document.getElementById("total-income").textContent = formatRupiah(data.total_income);
            document.getElementById("total-expense").textContent = formatRupiah(data.total_expense);
            document.getElementById("remaining-balance").textContent = formatRupiah(data.remaining_balance);

            const safeSpendEl = document.getElementById("daily-safe-spend");
            safeSpendEl.textContent = formatRupiah(data.daily_safe_spend);
            safeSpendEl.classList.remove("tight", "healthy");
            safeSpendEl.classList.add(data.daily_safe_spend < 50000 ? "tight" : "healthy");

            const stamp = document.getElementById("date-stamp");
            const today = new Date();
            stamp.textContent = today.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });

            const explainer = document.getElementById("safe-spend-explainer");
            const budgetLeft = data.budget - data.total_expense;
            explainer.textContent = `${formatRupiah(budgetLeft)} sisa anggaran ÷ ${data.days_remaining} hari lagi`;

            const fill = document.getElementById("budget-progress-fill");
            const label = document.getElementById("budget-progress-label");
            fill.classList.remove("warning", "over");
            if (data.budget > 0) {
                const pct = (data.total_expense / data.budget) * 100;
                fill.style.width = `${Math.min(pct, 100)}%`;
                if (pct >= 100) fill.classList.add("over");
                else if (pct >= 80) fill.classList.add("warning");
                label.textContent = `${Math.round(pct)}% dari anggaran terpakai`;
            } else {
                fill.style.width = "0%";
                label.textContent = "Anggaran belum diatur";
            }

            const warningBanner = document.getElementById("overspend-warning");
if (data.overspending_warning) {
    document.getElementById("overspend-warning-text").textContent =
        `Diperkirakan pengeluaranmu bulan ini mencapai ${formatRupiah(data.predicted_month_total)}, melebihi anggaran ${formatRupiah(data.budget)}.`;
    warningBanner.classList.remove("hidden");
} else {
    warningBanner.classList.add("hidden");
}

            statusEl.classList.add("hidden");
        } catch (err) {
            statusEl.innerHTML = `Gagal memuat dashboard. <button id="dashboard-retry-btn" class="retry-btn">Coba lagi</button>`;
            statusEl.classList.add("error");
            document.getElementById("dashboard-retry-btn").addEventListener("click", loadDashboard);
        }
    }

    let transactionsCache = [];
    let editingTransactionId = null;

    function anyFilterActive() {
        return document.getElementById("filter-type").value ||
               document.getElementById("filter-category").value ||
               document.getElementById("filter-month").value ||
               document.getElementById("filter-search").value.trim();
    }

    function renderTransactions() {
        const list = document.getElementById("transaction-list");
        list.innerHTML = "";

        if (transactionsCache.length === 0) {
            const empty = document.createElement("li");
            empty.className = "empty-state";
            empty.textContent = anyFilterActive()
                ? "Tidak ada transaksi yang cocok dengan filter."
                : "Belum ada transaksi tercatat.";
            list.appendChild(empty);
            return;
        }

        // Grouping relies on the backend's own ordering (date desc, id desc) —
        // object key insertion order preserves that, so no re-sorting needed here.
        const groups = {};
        transactionsCache.forEach((tx) => {
            if (!groups[tx.transaction_date]) groups[tx.transaction_date] = [];
            groups[tx.transaction_date].push(tx);
        });

        Object.keys(groups).forEach((date) => {
            const header = document.createElement("li");
            header.className = "tx-date-header";
            header.textContent = formatDateHeader(date);
            list.appendChild(header);

            groups[date].forEach((tx) => {
                const li = document.createElement("li");
                li.className = "tx-item";

                const info = document.createElement("div");
                const desc = document.createElement("div");
                desc.textContent = tx.description || "(tanpa keterangan)";
                const meta = document.createElement("div");
                meta.className = "tx-meta";
                meta.textContent = tx.category_id ? categoriesById[tx.category_id] : "Tanpa kategori";
                info.appendChild(desc);
                info.appendChild(meta);

                const right = document.createElement("div");
                right.className = "tx-right";
                const amount = document.createElement("span");
                amount.className = `amount ${tx.type}`;
                const sign = tx.type === "expense" ? "-" : "+";
                amount.textContent = `${sign}${formatRupiah(tx.amount)}`;
                const actions = document.createElement("div");
                actions.className = "tx-actions";
                actions.innerHTML = `
                    <button class="edit-btn" data-id="${tx.id}">Ubah</button>
                    <button class="delete-btn" data-id="${tx.id}">Hapus</button>
                `;
                right.appendChild(amount);
                right.appendChild(actions);

                li.appendChild(info);
                li.appendChild(right);
                list.appendChild(li);
            });
        });
    }

    async function loadTransactions() {
        const statusEl = document.getElementById("tx-status");
        const list = document.getElementById("transaction-list");

        statusEl.classList.remove("hidden", "error");
        statusEl.textContent = "Memuat riwayat...";
        list.classList.add("hidden");

        const params = new URLSearchParams();
        const type = document.getElementById("filter-type").value;
        const category = document.getElementById("filter-category").value;
        const month = document.getElementById("filter-month").value;
        const search = document.getElementById("filter-search").value.trim();
        if (type) params.set("type", type);
        if (category) params.set("category_id", category);
        if (month) params.set("month", month);
        if (search) params.set("search", search);

        try {
            const response = await fetch(`${API_BASE}/transactions?${params.toString()}`, {
                headers: authHeaders(),
            });
            if (!response.ok) throw new Error("request failed");

            const transactions = await response.json();
            transactionsCache = transactions || [];
            renderTransactions();

            statusEl.classList.add("hidden");
            list.classList.remove("hidden");
        } catch (err) {
            statusEl.innerHTML = `Gagal memuat riwayat. <button id="tx-retry-btn" class="retry-btn">Coba lagi</button>`;
            statusEl.classList.add("error");
            document.getElementById("tx-retry-btn").addEventListener("click", loadTransactions);
        }
    }

    document.getElementById("filter-type").addEventListener("change", loadTransactions);
    document.getElementById("filter-category").addEventListener("change", loadTransactions);
    document.getElementById("filter-month").addEventListener("change", loadTransactions);

    let searchDebounceTimer;
    document.getElementById("filter-search").addEventListener("input", () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(loadTransactions, 400);
    });

    document.getElementById("filter-reset-btn").addEventListener("click", () => {
        document.getElementById("filter-type").value = "";
        document.getElementById("filter-category").value = "";
        document.getElementById("filter-month").value = "";
        document.getElementById("filter-search").value = "";
        loadTransactions();
    });

    document.getElementById("transaction-list").addEventListener("click", (e) => {
        const id = parseInt(e.target.dataset.id);
        if (!id) return;

        if (e.target.classList.contains("edit-btn")) {
            const tx = transactionsCache.find((t) => t.id === id);
            if (!tx) return;

            editingTransactionId = id;
            document.getElementById("tx-type").value = tx.type;
            document.getElementById("tx-amount").value = new Intl.NumberFormat("id-ID").format(tx.amount);
            document.getElementById("tx-description").value = tx.description || "";
            document.getElementById("tx-category").value = tx.category_id || "";
            document.getElementById("tx-date").value = tx.transaction_date;

            document.getElementById("tx-submit-btn").textContent = "Simpan perubahan";
            document.getElementById("tx-cancel-btn").classList.remove("hidden");
            document.getElementById("transaction-form").scrollIntoView({ behavior: "smooth" });
        }

        if (e.target.classList.contains("delete-btn")) {
            if (!confirm("Hapus transaksi ini?")) return;

            fetch(`${API_BASE}/transactions/${id}`, {
                method: "DELETE",
                headers: authHeaders(),
            }).then((response) => {
                showToast(response.ok ? "Transaksi dihapus" : "Gagal menghapus transaksi");
                loadDashboard();
                loadTransactions();
            });
        }
    });

    function resetTransactionForm() {
        editingTransactionId = null;
        document.getElementById("transaction-form").reset();
        document.getElementById("tx-submit-btn").textContent = "+ Catat";
        document.getElementById("tx-cancel-btn").classList.add("hidden");
    }

    document.getElementById("tx-cancel-btn").addEventListener("click", resetTransactionForm);

    document.getElementById("transaction-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById("tx-submit-btn");
        const isEditing = editingTransactionId !== null;
        submitBtn.disabled = true;
        submitBtn.textContent = "Menyimpan...";

        const categoryValue = document.getElementById("tx-category").value;
        const body = {
            type: document.getElementById("tx-type").value,
            amount: parseFormattedNumber(document.getElementById("tx-amount").value),
            description: document.getElementById("tx-description").value,
            transaction_date: document.getElementById("tx-date").value,
            category_id: categoryValue ? parseInt(categoryValue) : null,
        };

        const url = isEditing
            ? `${API_BASE}/transactions/${editingTransactionId}`
            : `${API_BASE}/transactions`;
        const method = isEditing ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: authHeaders(),
            body: JSON.stringify(body),
        });

        showToast(response.ok
            ? (isEditing ? "Perubahan disimpan" : "Transaksi ditambahkan")
            : "Gagal menyimpan transaksi");

        submitBtn.disabled = false;
        resetTransactionForm();
        loadDashboard();
        loadTransactions();
    });

    document.getElementById("logout-btn").addEventListener("click", () => {
        localStorage.removeItem("token");
        window.location.href = "index.html";
    });

    document.getElementById("budget-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("budget-submit-btn");
        submitBtn.disabled = true;
        submitBtn.textContent = "Menyimpan...";

        const amount = parseFormattedNumber(document.getElementById("budget-amount").value);

        const response = await fetch(`${API_BASE}/budget`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ amount }),
        });

        showToast(response.ok ? "Anggaran disimpan" : "Gagal menyimpan anggaran");
        submitBtn.disabled = false;
        submitBtn.textContent = "Simpan";
        loadDashboard();
    });

    loadDashboard();
    loadTransactions();
    loadCategories();
}