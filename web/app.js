// Base URL for API calls. Since Go serves both the frontend AND the API
// from the same origin (localhost:8080), we could technically use relative
// paths like "/login" — but writing it explicit makes the code clearer
// about what's happening, and makes it trivial to change later if the API
// ever moves to a different host.
const API_BASE = "";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

// Guard clauses: app.js gets loaded on every page, but dashboard.html
// won't have a login-form. Without these checks, this code would throw
// on dashboard.html trying to addEventListener on null.
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        // Forms submit and reload the page by default — preventDefault stops
        // that so we can handle the request with fetch() instead.
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
                // Your Go handler returns plain text via http.Error, not JSON,
                // for error cases — so we read it as text here, not .json().
                const message = await response.text();
                errorEl.textContent = message;
                return;
            }

            const data = await response.json();
            // localStorage persists across page loads and browser restarts
            // (unlike a JS variable, which dies the moment the page unloads).
            // This is the browser-native equivalent of what you'd store in
            // Postman's collection variable — except now it's the actual app.
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

            // On successful register, just prompt them to log in — we didn't
            // build /register to auto-issue a token, only /login does that.
            errorEl.style.color = "green";
            errorEl.textContent = "Account created — please log in.";
        } catch (err) {
            errorEl.textContent = "Could not reach the server.";
        }
    });
}

const dashboardEl = document.getElementById("total-income");

// Same guard pattern as before — this block only runs on dashboard.html.
if (dashboardEl) {
    const token = localStorage.getItem("token");

    // No token at all means someone opened this page directly without
    // logging in — bounce them back immediately rather than letting every
    // subsequent fetch() fail with 401.
    if (!token) {
        window.location.href = "index.html";
    }

    // Centralizes the auth header so every API call below doesn't repeat it.
    function authHeaders() {
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        };
    }

    // Keeps id → name so we can show category names in the transaction list too,
// not just populate the dropdown.
let categoriesById = {};

async function loadCategories() {
    const response = await fetch(`${API_BASE}/categories`);
    const categories = await response.json();
    if (!categories) return;

    const select = document.getElementById("tx-category");
    categories.forEach((cat) => {
        categoriesById[cat.id] = cat.name;

        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
    });
}

    // Reusable formatter — Indonesian Rupiah, no decimal places.
    function formatRupiah(amount) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(amount);
    }

    async function loadDashboard() {
    const response = await fetch(`${API_BASE}/dashboard`, {
        headers: authHeaders(),
    });

    if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "index.html";
        return;
    }

    const data = await response.json();
    document.getElementById("total-income").textContent = formatRupiah(data.total_income);
    document.getElementById("total-expense").textContent = formatRupiah(data.total_expense);
    document.getElementById("remaining-balance").textContent = formatRupiah(data.remaining_balance);

    const safeSpendEl = document.getElementById("daily-safe-spend");
    safeSpendEl.textContent = formatRupiah(data.daily_safe_spend);
    // Functional color: tight (red) below a comfort threshold, healthy (teal) above.
    // 50000 is a placeholder — tune it to whatever "comfortable" actually means to you.
    safeSpendEl.classList.remove("tight", "healthy");
    safeSpendEl.classList.add(data.daily_safe_spend < 50000 ? "tight" : "healthy");

    const stamp = document.getElementById("date-stamp");
    const today = new Date();
    stamp.textContent = today.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

    async function loadTransactions() {
    const response = await fetch(`${API_BASE}/transactions`, {
        headers: authHeaders(),
    });
    const transactions = await response.json();

    const list = document.getElementById("transaction-list");
    list.innerHTML = "";

    if (!transactions || transactions.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "Belum ada transaksi tercatat.";
        list.appendChild(empty);
        return;
    }

    transactions.forEach((tx) => {
        const li = document.createElement("li");
        li.className = "tx-item";

        const info = document.createElement("div");
        const desc = document.createElement("div");
        desc.textContent = tx.description || "(tanpa keterangan)";
        const meta = document.createElement("div");
        meta.className = "tx-meta";
        const categoryLabel = tx.category_id ? categoriesById[tx.category_id] : null;
        meta.textContent = [tx.transaction_date, categoryLabel].filter(Boolean).join(" · ");
        info.appendChild(desc);
        info.appendChild(meta);

        const amount = document.createElement("span");
        amount.className = `amount ${tx.type}`;
        const sign = tx.type === "expense" ? "-" : "+";
        amount.textContent = `${sign}${formatRupiah(tx.amount)}`;

        li.appendChild(info);
        li.appendChild(amount);
        list.appendChild(li);
    });
}

    document.getElementById("logout-btn").addEventListener("click", () => {
        localStorage.removeItem("token");
        window.location.href = "index.html";
    });

    document.getElementById("budget-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById("budget-amount").value);

        await fetch(`${API_BASE}/budget`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ amount }),
        });

        loadDashboard(); // refresh numbers immediately after saving
    });

    document.getElementById("transaction-form").addEventListener("submit", async (e) => {
        e.preventDefault();

       const categoryValue = document.getElementById("tx-category").value;
const body = {
    type: document.getElementById("tx-type").value,
    amount: parseFloat(document.getElementById("tx-amount").value),
    description: document.getElementById("tx-description").value,
    transaction_date: document.getElementById("tx-date").value,
    category_id: categoryValue ? parseInt(categoryValue) : null,
};

        await fetch(`${API_BASE}/transactions`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(body),
        });

        e.target.reset();
        loadDashboard();
        loadTransactions();
    });

    // Initial load when the page opens.
    loadDashboard();
    loadTransactions();
    loadCategories();
}