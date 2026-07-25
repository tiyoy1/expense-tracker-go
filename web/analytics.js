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

function formatRupiah(amount) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
}

document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "index.html";
});

// Fixed palette so the same category gets the same color across reloads.
const CHART_COLORS = ["#2F6F62", "#B9822E", "#A8452F", "#4A5450", "#7F9A8F", "#D4A85C"];

async function loadCategoryChart() {
    const response = await fetch("/analytics/categories", { headers: authHeaders() });
    if (!response.ok) throw new Error("failed to load category breakdown");
    const data = await response.json();

    if (!data || data.length === 0) {
        document.getElementById("category-chart").closest(".chart-wrap").innerHTML =
            '<p class="empty-state">Belum ada pengeluaran bulan ini.</p>';
        return null;
    }

    new Chart(document.getElementById("category-chart"), {
        type: "pie",
        data: {
            labels: data.map((d) => d.category_name),
            datasets: [{ data: data.map((d) => d.total), backgroundColor: CHART_COLORS }],
        },
        options: {
            plugins: {
                legend: { position: "bottom", labels: { font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatRupiah(ctx.raw)}` } },
            },
        },
    });

    return data[0]; // top category, reused by the summary cards below
}

async function loadTrendChart() {
    const response = await fetch("/analytics/trend", { headers: authHeaders() });
    if (!response.ok) throw new Error("failed to load trend");
    const data = await response.json();

    const labels = data.map((d) => {
        const [year, month] = d.month.split("-");
        return new Date(year, month - 1).toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    });

    new Chart(document.getElementById("trend-chart"), {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: "Pemasukan", data: data.map((d) => d.income), backgroundColor: "#2F6F62" },
                { label: "Pengeluaran", data: data.map((d) => d.expense), backgroundColor: "#A8452F" },
            ],
        },
        options: {
            plugins: {
                legend: { position: "bottom", labels: { font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatRupiah(ctx.raw)}` } },
            },
            scales: { y: { ticks: { callback: (v) => formatRupiah(v) } } },
        },
    });

    return data; // used by "vs last month" below
}

async function loadSummary(topCategory, trend) {
    const response = await fetch("/dashboard", { headers: authHeaders() });
    if (!response.ok) throw new Error("failed to load dashboard");
    const dash = await response.json();

    document.getElementById("summary-income").textContent = formatRupiah(dash.total_income);
    document.getElementById("summary-expense").textContent = formatRupiah(dash.total_expense);
    document.getElementById("summary-top-category").textContent = topCategory
        ? `${topCategory.category_name} (${formatRupiah(topCategory.total)})`
        : "-";

    const vsEl = document.getElementById("summary-vs-last-month");
    if (trend && trend.length >= 2) {
        const thisMonth = trend[trend.length - 1].expense;
        const lastMonth = trend[trend.length - 2].expense;
        if (lastMonth > 0) {
            const pctChange = ((thisMonth - lastMonth) / lastMonth) * 100;
            vsEl.textContent = `${pctChange >= 0 ? "naik" : "turun"} ${Math.abs(Math.round(pctChange))}%`;
            vsEl.className = `value ${pctChange > 0 ? "tight" : "healthy"}`;
        } else {
            vsEl.textContent = "-";
        }
    } else {
        vsEl.textContent = "Belum cukup data";
    }
}

async function init() {
    const statusEl = document.getElementById("analytics-status");
    statusEl.textContent = "Memuat analitik...";
    try {
        const topCategory = await loadCategoryChart();
        const trend = await loadTrendChart();
        await loadSummary(topCategory, trend);
        statusEl.classList.add("hidden");
    } catch (err) {
        statusEl.textContent = "Gagal memuat analitik. Coba muat ulang halaman.";
        statusEl.classList.add("error");
    }
}

init();