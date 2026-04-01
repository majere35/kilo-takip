// State Management
let state = {
    user: null, 
    logs: [],   
    waterLogs: {},
    usedQuotes: [] // Indices of shown quotes
};

const MOTIVATION_QUOTES = [
    "Disiplin, motivasyonun tükendiği yerde devreye girer.",
    "Süreç sabır ister; bugünkü seçimlerine odaklan.",
    "Küçük ve istikrarlı adımlar, büyük değişimlerin temelidir.",
    "Gelişim her zaman doğrusal değildir; devam etmek en önemli kuraldır.",
    "Önemli olan sadece rakamlar değil, kazandığın yeni alışkanlıklardır.",
    "Dünün çabası, bugünün sonuçlarını hazırlar.",
    "Sadece bugünü yönetmeye ve rutinine sadık kalmaya odaklan.",
    "Vücuduna iyi bakmak, en uzun vadeli yatırımdır.",
    "Kararlılık, hedefe ulaşmadaki en belirleyici değişkendir.",
    "Alışkanlıklar kimliği belirler; bugünkü planına sadık kal.",
    "Her yeni gün, kontrolü ele almak için yeni bir fırsattır.",
    "Mükemmeliyeti değil, sürdürülebilir gelişimi hedefle.",
    "Kendine verdiğin sözü tutmak, öz disiplini güçlendirir.",
    "Başarı, her gün tekrarlanan küçük eylemlerin toplamıdır.",
    "Zorlandığında, bu yola çıkış nedenini hatırla.",
    "Bugünün disiplini, yarının fiziksel rahatlığıdır.",
    "Duygularına göre değil, hedeflerine göre hareket et.",
    "Kontrol edebildiğin değişkenlere (beslenme ve hareket) odaklan.",
    "İstikrar, sonuç almanı sağlayacak en güçlü stratejidir."
];

// DOM Elements
const views = {
    onboarding: document.getElementById('onboarding'),
    dashboard: document.getElementById('dashboard'),
    settings: document.getElementById('settings'),
    modal: document.getElementById('add-modal')
};

let weightChart = null;

// Initialize App
function init() {
    loadState();
    setupEventListeners();
    
    if (!state.user) {
        showView('onboarding');
    } else {
        applyTheme(state.user.theme);
        updateDashboard();
        showView('dashboard');
    }
}

function loadState() {
    const saved = localStorage.getItem('kiloTakipState');
    if (saved) {
        state = { ...state, ...JSON.parse(saved) };
        if (!state.usedQuotes) state.usedQuotes = [];
    }
}

function saveState() {
    localStorage.setItem('kiloTakipState', JSON.stringify(state));
}

function setupEventListeners() {
    // Onboarding Gender Change - Instant Theme Switch
    const onboardGender = document.getElementById('gender');
    if (onboardGender) {
        onboardGender.addEventListener('change', (e) => {
            const theme = e.target.value;
            if (theme) applyTheme(theme);
        });
    }

    // Nav Tabs
    document.querySelectorAll('.tab-item[data-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            showView(target);
            document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // Form Submissions
    document.getElementById('onboarding-form').addEventListener('submit', handleOnboarding);
    document.getElementById('weight-form').addEventListener('submit', handleWeightLog);

    // Modals
    document.getElementById('add-weight-btn').addEventListener('click', () => showModal(true));
    document.getElementById('quick-add-nav').addEventListener('click', () => showModal(true));
    document.getElementById('close-modal').addEventListener('click', () => showModal(false));

    // Theme Toggle
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            state.user.theme = theme;
            applyTheme(theme);
            saveState();
        });
    });

    // Water Tracker
    document.getElementById('add-water-btn').addEventListener('click', addWater);

    // Settings
    document.getElementById('settings-btn').addEventListener('click', () => showView('settings'));
    document.getElementById('back-btn').addEventListener('click', () => showView('dashboard'));
    document.getElementById('reset-data').addEventListener('click', resetData);

    // Chart Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateChart(btn.getAttribute('data-range'));
        });
    });
}

// Handlers
function handleOnboarding(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value;
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const target = parseFloat(document.getElementById('target-weight').value);

    state.user = {
        name, age, gender, height, 
        startWeight: weight, 
        targetWeight: target,
        theme: gender === 'woman' ? 'woman' : 'man'
    };

    const today = getTodayStr();
    state.logs.push({ date: today, weight: weight });
    
    applyTheme(state.user.theme);
    saveState();
    updateDashboard();
    showView('dashboard');
}

function handleWeightLog(e) {
    e.preventDefault();
    const date = document.getElementById('log-date').value;
    const weight = parseFloat(document.getElementById('log-weight').value);

    // Check if entry exists for date
    const index = state.logs.findIndex(l => l.date === date);
    if (index > -1) {
        state.logs[index].weight = weight;
    } else {
        state.logs.push({ date, weight });
    }

    // Sort logs by date
    state.logs.sort((a,b) => new Date(a.date) - new Date(b.date));

    saveState();
    updateDashboard();
    showModal(false);
}

function addWater() {
    const today = getTodayStr();
    state.waterLogs[today] = (state.waterLogs[today] || 0) + 250;
    saveState();
    updateWaterUI();
}

// UI Updates
function showView(viewId) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewId].classList.remove('hidden');
    
    // Auto-fill form date
    if (viewId === 'dashboard') {
        document.getElementById('log-date').value = getTodayStr();
    }
}

function showModal(show) {
    views.modal.classList.toggle('hidden', !show);
    if (show) {
        document.getElementById('log-date').value = getTodayStr();
        const lastLog = state.logs[state.logs.length - 1];
        if (lastLog) document.getElementById('log-weight').value = lastLog.weight;
        
        // Show random unused quote
        displayMotivation();
    }
}

function displayMotivation() {
    if (state.usedQuotes.length >= MOTIVATION_QUOTES.length) {
        state.usedQuotes = [];
    }

    const availableIndices = MOTIVATION_QUOTES.map((_, i) => i)
        .filter(i => !state.usedQuotes.includes(i));

    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    
    document.getElementById('motivation-quote').textContent = `"${MOTIVATION_QUOTES[randomIndex]}"`;
    state.usedQuotes.push(randomIndex);
    saveState();
}

function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
}

function updateDashboard() {
    if (!state.user || state.logs.length === 0) return;

    const currentLog = state.logs[state.logs.length - 1];
    const weight = currentLog.weight;
    
    // Update Text
    document.getElementById('display-name').textContent = state.user.name;
    document.getElementById('current-weight').innerHTML = `${weight.toFixed(1)} <span>kg</span>`;
    document.getElementById('display-target').innerHTML = `${state.user.targetWeight.toFixed(1)} <span>kg</span>`;
    
    // BMI
    const bmi = weight / ((state.user.height / 100) ** 2);
    document.getElementById('bmi-value').textContent = bmi.toFixed(1);
    document.getElementById('bmi-status').textContent = getBMIStatus(bmi);

    // Progress
    const totalToLose = state.user.startWeight - state.user.targetWeight;
    const lostSoFar = state.user.startWeight - weight;
    let progress = (lostSoFar / totalToLose) * 100;
    if (totalToLose === 0) progress = 100;
    progress = Math.min(Math.max(progress, 0), 100);
    document.getElementById('target-progress-fill').style.width = `${progress}%`;

    const diff = weight - state.user.startWeight;
    const diffText = diff === 0 ? "Başlangıçtasın" : 
                    diff < 0 ? `${Math.abs(diff).toFixed(1)}kg Verildi` : 
                    `${diff.toFixed(1)}kg Alındı`;
    document.getElementById('weight-diff').textContent = diffText;

    updateWaterUI();
    updateHistoryList();
    updateChart('7');
}

function updateWaterUI() {
    const today = getTodayStr();
    const amount = state.waterLogs[today] || 0;
    const liters = (amount / 1000).toFixed(2);
    document.getElementById('water-count').innerHTML = `${liters} <span>L</span>`;
    
    const goal = 2000; // 2L default goal
    const progress = Math.min((amount / goal) * 100, 100);
    document.getElementById('water-progress-fill').style.width = `${progress}%`;
}

function updateHistoryList() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    // Show last 5
    const recentLogs = [...state.logs].reverse().slice(0, 5);
    recentLogs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-info">
                <span class="history-date">${formatDate(log.date)}</span>
                <span class="history-weight">${log.weight.toFixed(1)} kg</span>
            </div>
            <div class="history-trend">${getTrendIcon(log, state.logs)}</div>
        `;
        list.appendChild(item);
    });
}

function updateChart(range) {
    const ctx = document.getElementById('weightChart').getContext('2d');
    let filteredLogs = [...state.logs];
    
    if (range === '7') filteredLogs = filteredLogs.slice(-7);
    else if (range === '30') filteredLogs = filteredLogs.slice(-30);

    const labels = filteredLogs.map(l => formatDate(l.date, true));
    const data = filteredLogs.map(l => l.weight);

    if (weightChart) weightChart.destroy();

    const accentColor = getComputedStyle(document.body).getPropertyValue('--accent').trim();

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kilo (kg)',
                data: data,
                borderColor: accentColor,
                backgroundColor: accentColor + '20', // Transparent version
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: accentColor,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { 
                    beginAtZero: false, 
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.7)' }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.7)' }
                }
            }
        },
        plugins: [{
            beforeDraw: (chart) => {
                if (document.body.classList.contains('theme-neutral')) {
                    chart.options.scales.x.ticks.color = '#2c3e50';
                    chart.options.scales.y.ticks.color = '#2c3e50';
                } else {
                    chart.options.scales.x.ticks.color = 'rgba(255,255,255,0.7)';
                    chart.options.scales.y.ticks.color = 'rgba(255,255,255,0.7)';
                }
            }
        }]
    });
}

// Helpers
function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr, short = false) {
    const options = short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'long' };
    return new Date(dateStr).toLocaleDateString('tr-TR', options);
}

function getBMIStatus(bmi) {
    if (bmi < 18.5) return 'Zayıf';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Fazla Kilolu';
    return 'Obez';
}

function getTrendIcon(log, allLogs) {
    const idx = allLogs.findIndex(l => l.date === log.date);
    if (idx === 0) return '🎯';
    const prev = allLogs[idx - 1];
    if (log.weight < prev.weight) return '📉';
    if (log.weight > prev.weight) return '📈';
    return '➡️';
}

function resetData() {
    if (confirm('Tüm verileriniz kalıcı olarak silinecek. Emin misiniz?')) {
        localStorage.removeItem('kiloTakipState');
        location.reload();
    }
}

// Start
init();
