// Preline Dashboard App - Main Application
// API Keys
const FINNHUB_API_KEY = 'd18ueuhr01qkcat4uip0d18ueuhr01qkcat4uipg';

class PrelineDashboard {
  constructor() {
    this.currentPage = 'dashboard';
    this.isDarkMode = true;
    this.monitors = [];
    this.charts = {};
    this.newsData = [];
    this.fibChart = null;
    this.fibCandlestickSeries = null;
    this.stockSymbol = 'AAPL';
    this.marketSymbols = ['QQQ', 'SPY', 'DXY', 'VIX', 'AAPL', 'MSFT', 'TSLA', 'SMCI'];
    this.todos = JSON.parse(localStorage.getItem('dashboardTodos') || '[]');
    this.worldClocks = JSON.parse(localStorage.getItem('customWorldClocks') || '[]');
    this.clockOrder = JSON.parse(localStorage.getItem('clockOrder') || '["ny", "london", "tokyo", "sydney"]');
    this.marketOrder = JSON.parse(localStorage.getItem('marketOrder') || '[]');
    this.draggedElement = null;
    this.init();
  }

  init() {
    this.setupThemeToggle();
    this.setupNavigation();
    this.setupMobileMenu();
    this.loadPage('dashboard');
    this.startRealtimeUpdates();
  }

  // Theme Management
  setupThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
      this.isDarkMode = false;
    }

    toggle.addEventListener('click', () => {
      this.isDarkMode = !this.isDarkMode;
      document.documentElement.classList.toggle('dark', this.isDarkMode);
      localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
      this.updateCharts();
    });
  }

  // Navigation
  setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        this.loadPage(page);
        
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        if (window.innerWidth < 640) {
          document.getElementById('sidebar').classList.add('-translate-x-full');
        }
      });
    });
  }

  // Mobile Menu
  setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    
    btn.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });

    document.addEventListener('click', (e) => {
      if (window.innerWidth < 640 && !sidebar.contains(e.target) && !btn.contains(e.target)) {
        sidebar.classList.add('-translate-x-full');
      }
    });
  }

  // Page Router
  loadPage(page) {
    this.currentPage = page;
    const content = document.getElementById('main-content');
    
    switch(page) {
      case 'dashboard':
        content.innerHTML = this.renderDashboard();
        this.initDashboard();
        break;
      case 'news':
        content.innerHTML = this.renderNews();
        this.initNews();
        break;
      case 'charts':
        content.innerHTML = this.renderCharts();
        this.initChartsPage();
        break;
      case 'api':
        content.innerHTML = this.renderAPI();
        this.initAPI();
        break;
      case 'fib':
        content.innerHTML = this.renderFib();
        this.initFib();
        break;
      case 'settings':
        content.innerHTML = this.renderSettings();
        this.initSettings();
        break;
    }
  }

  // Dashboard Page - New Design with World Clocks, Market, and To-Do List
  renderDashboard() {
    return `
      <div class="page-content p-6">
        <!-- World Clocks Section -->
        <div class="mb-6">
          <h2 class="text-xl font-bold text-slate-800 dark:text-white mb-4">World Clocks</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="world-clocks-container">
            <!-- Clocks will be rendered here dynamically -->
          </div>
        </div>

        <!-- Market Section -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-slate-800 dark:text-white">Market</h2>
            <div class="flex items-center gap-3">
              <span class="text-xs text-slate-500 dark:text-slate-400" id="market-last-updated">Last updated: --</span>
              <button onclick="app.refreshMarketData()" class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>
          <div class="flex gap-2 mb-4">
            <input type="text" id="market-symbol-input" placeholder="Enter symbol (e.g., AAPL, TSLA, MSFT)" 
              class="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <button onclick="app.addMarketSymbol()" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors">
              + Add Symbol
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="market-cards-container" data-sortable="true">
            <!-- Market cards will be rendered here -->
          </div>
        </div>

        <!-- Today's To-Do List Section -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-slate-800 dark:text-white">Today's To-Do List</h2>
            <div class="flex items-center gap-2">
              <span class="text-sm text-slate-500 dark:text-slate-400" id="todo-stats">0 tasks</span>
            </div>
          </div>
          <div class="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 mb-4">
            <div class="flex gap-2">
              <input type="text" id="todo-input" placeholder="What needs to be done?" 
                class="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
              <button onclick="app.addTodo()" class="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Add Task
              </button>
            </div>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 min-h-[300px]">
            <div id="todos-container" class="p-4">
              <!-- Todos will be rendered here -->
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderActivityItems() {
    const activities = [
      { type: 'order', user: 'Sarah Johnson', action: 'placed a new order', amount: '$245.00', time: '2 min ago', color: 'emerald' },
      { type: 'user', user: 'Mike Chen', action: 'signed up for premium', amount: '$49.99/mo', time: '15 min ago', color: 'blue' },
      { type: 'review', user: 'Emma Wilson', action: 'left a 5-star review', amount: '', time: '1 hour ago', color: 'amber' },
      { type: 'order', user: 'James Brown', action: 'completed checkout', amount: '$1,240.00', time: '2 hours ago', color: 'emerald' },
      { type: 'refund', user: 'Lisa Anderson', action: 'requested a refund', amount: '$89.00', time: '3 hours ago', color: 'red' },
    ];

    return activities.map(a => `
      <div class="timeline-item flex items-start gap-4">
        <div class="w-10 h-10 rounded-full bg-${a.color}-100 dark:bg-${a.color}-900/30 flex items-center justify-center flex-shrink-0">
          <span class="w-2 h-2 rounded-full bg-${a.color}-500"></span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-slate-800 dark:text-white">
            <span class="font-semibold">${a.user}</span> ${a.action}
            ${a.amount ? `<span class="font-semibold text-${a.color}-600 dark:text-${a.color}-400">${a.amount}</span>` : ''}
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${a.time}</p>
        </div>
      </div>
    `).join('');
  }

  renderTopProducts() {
    const products = [
      { name: 'Premium Subscription', sales: 2847, revenue: '$142,350', growth: 12.5 },
      { name: 'Pro Plan', sales: 1923, revenue: '$96,150', growth: 8.3 },
      { name: 'Enterprise License', sales: 847, revenue: '$254,100', growth: 23.1 },
      { name: 'Starter Pack', sales: 4521, revenue: '$45,210', growth: -2.4 },
    ];

    return products.map((p, i) => `
      <div class="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        <span class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">${i + 1}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-slate-800 dark:text-white truncate">${p.name}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">${p.sales.toLocaleString()} sales</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold text-slate-800 dark:text-white">${p.revenue}</p>
          <p class="text-xs ${p.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}">${p.growth >= 0 ? '+' : ''}${p.growth}%</p>
        </div>
      </div>
    `).join('');
  }

  initDashboard() {
    this.renderWorldClocks();
    this.initWorldClocks();
    this.initDragAndDrop();
    this.initTodos();
    this.loadMarketSymbols();
  }

  renderWorldClocks() {
    const container = document.getElementById('world-clocks-container');
    if (!container) return;

    const defaultClocks = [
      { id: 'ny', city: 'New York', country: 'United States', tz: 'America/New_York' },
      { id: 'london', city: 'London', country: 'United Kingdom', tz: 'Europe/London' },
      { id: 'tokyo', city: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo' },
      { id: 'sydney', city: 'Sydney', country: 'Australia', tz: 'Australia/Sydney' }
    ];

    const allClocks = [...defaultClocks, ...this.worldClocks];
    const orderedClocks = this.clockOrder.map(id => allClocks.find(c => c.id === id)).filter(Boolean);
    const remainingClocks = allClocks.filter(c => !this.clockOrder.includes(c.id));
    const finalOrder = [...orderedClocks, ...remainingClocks];

    container.innerHTML = finalOrder.map(clock => `
      <div class="draggable-clock bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md border border-slate-200 dark:border-slate-700 cursor-move hover:shadow-lg transition-all" 
           draggable="true" data-clock-id="${clock.id}">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">${clock.city}</p>
          ${clock.id.startsWith('custom-') ? `
            <button onclick="app.removeCustomClock('${clock.id}')" class="text-slate-400 hover:text-red-500 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          ` : `
            <svg class="w-4 h-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
            </svg>
          `}
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">${clock.country}</p>
        <p class="text-lg font-bold text-slate-800 dark:text-white" id="clock-${clock.id}-time">--:--:--</p>
        <p class="text-xs text-slate-500 dark:text-slate-400" id="clock-${clock.id}-date">--</p>
      </div>
    `).join('');

    this.initClockDragAndDrop();
  }

  initDragAndDrop() {
    // Market cards drag and drop
    const marketContainer = document.getElementById('market-cards-container');
    if (marketContainer) {
      marketContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = this.getDragAfterElement(marketContainer, e.clientY);
        const dragging = document.querySelector('.dragging-market');
        if (dragging && afterElement == null) {
          marketContainer.appendChild(dragging);
        } else if (dragging && afterElement) {
          marketContainer.insertBefore(dragging, afterElement);
        }
      });
    }
  }

  initClockDragAndDrop() {
    const clocks = document.querySelectorAll('.draggable-clock');
    clocks.forEach(clock => {
      clock.addEventListener('dragstart', (e) => {
        clock.classList.add('opacity-50', 'dragging-clock');
        e.dataTransfer.effectAllowed = 'move';
      });

      clock.addEventListener('dragend', () => {
        clock.classList.remove('opacity-50', 'dragging-clock');
        this.saveClockOrder();
      });

      clock.addEventListener('dragover', (e) => {
        e.preventDefault();
        const container = document.getElementById('world-clocks-container');
        const afterElement = this.getDragAfterElement(container, e.clientY);
        const dragging = document.querySelector('.dragging-clock');
        
        if (dragging && afterElement == null) {
          container.appendChild(dragging);
        } else if (dragging && afterElement) {
          container.insertBefore(dragging, afterElement);
        }
      });
    });
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable-clock:not(.dragging-clock), .draggable-market:not(.dragging-market)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  saveClockOrder() {
    const container = document.getElementById('world-clocks-container');
    if (!container) return;
    const clocks = Array.from(container.querySelectorAll('.draggable-clock'));
    this.clockOrder = clocks.map(c => c.dataset.clockId);
    localStorage.setItem('clockOrder', JSON.stringify(this.clockOrder));
  }

  saveMarketOrder() {
    const container = document.getElementById('market-cards-container');
    if (!container) return;
    const cards = Array.from(container.querySelectorAll('.draggable-market'));
    this.marketOrder = cards.map(c => c.dataset.symbol);
    localStorage.setItem('marketOrder', JSON.stringify(this.marketOrder));
  }

  // World Clocks
  initWorldClocks() {
    const defaultClocks = [
      { id: 'ny', city: 'New York', country: 'United States', tz: 'America/New_York' },
      { id: 'london', city: 'London', country: 'United Kingdom', tz: 'Europe/London' },
      { id: 'tokyo', city: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo' },
      { id: 'sydney', city: 'Sydney', country: 'Australia', tz: 'Australia/Sydney' }
    ];
    const allClocks = [...defaultClocks, ...this.worldClocks];

    const updateClocks = () => {
      allClocks.forEach(clock => {
        try {
          const now = new Date();
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: clock.tz,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
          const dateFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: clock.tz,
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          
          const timeEl = document.getElementById(`clock-${clock.id}-time`);
          const dateEl = document.getElementById(`clock-${clock.id}-date`);
          if (timeEl) timeEl.textContent = formatter.format(now);
          if (dateEl) dateEl.textContent = dateFormatter.format(now);
        } catch (e) {
          console.error(`Error updating clock for ${clock.city}:`, e);
        }
      });
    };

    updateClocks();
    setInterval(updateClocks, 1000);
  }

  addCustomWorldClock(city, country, timezone) {
    const newClock = {
      id: `custom-${Date.now()}`,
      city,
      country,
      tz: timezone
    };
    this.worldClocks.push(newClock);
    localStorage.setItem('customWorldClocks', JSON.stringify(this.worldClocks));
    this.renderWorldClocks();
    this.initWorldClocks();
  }

  removeCustomClock(clockId) {
    this.worldClocks = this.worldClocks.filter(c => c.id !== clockId);
    this.clockOrder = this.clockOrder.filter(id => id !== clockId);
    localStorage.setItem('customWorldClocks', JSON.stringify(this.worldClocks));
    localStorage.setItem('clockOrder', JSON.stringify(this.clockOrder));
    this.renderWorldClocks();
    this.initWorldClocks();
  }

  showAddClockModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-xl max-w-md w-full mx-4">
        <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-4">Add World Clock</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">City</label>
            <input type="text" id="clock-city-input" placeholder="e.g., Paris" 
              class="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Country</label>
            <input type="text" id="clock-country-input" placeholder="e.g., France" 
              class="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Timezone (IANA)</label>
            <input type="text" id="clock-timezone-input" placeholder="e.g., Europe/Paris" 
              class="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white">
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Use IANA timezone format (e.g., Europe/Paris, Asia/Dubai)</p>
          </div>
          <div class="flex gap-3 pt-2">
            <button onclick="this.closest('.fixed').remove()" 
              class="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
              Cancel
            </button>
            <button onclick="app.handleAddClock()" 
              class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
              Add Clock
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('clock-city-input').focus();
  }

  handleAddClock() {
    const city = document.getElementById('clock-city-input').value.trim();
    const country = document.getElementById('clock-country-input').value.trim();
    const timezone = document.getElementById('clock-timezone-input').value.trim();
    
    if (!city || !country || !timezone) {
      alert('Please fill in all fields');
      return;
    }
    
    this.addCustomWorldClock(city, country, timezone);
    document.querySelector('.fixed.inset-0').remove();
  }

  // Market Data
  async loadMarketSymbols() {
    const saved = localStorage.getItem('dashboardMarketSymbols');
    if (saved) {
      this.marketSymbols = JSON.parse(saved);
    }
    await this.refreshMarketData();
  }

  async refreshMarketData() {
    const container = document.getElementById('market-cards-container');
    if (!container) return;

    container.innerHTML = '<div class="col-span-full text-center py-4 text-slate-400">Loading market data...</div>';

    const promises = this.marketSymbols.map(symbol => this.fetchMarketQuote(symbol));
    const results = await Promise.allSettled(promises);

    // Create array of cards with symbols
    const cards = results.map((result, index) => {
      const symbol = this.marketSymbols[index];
      if (result.status === 'fulfilled' && result.value) {
        const data = result.value;
        return { symbol, html: this.renderMarketCard(symbol, data) };
      } else {
        return { symbol, html: this.renderMarketCard(symbol, null) };
      }
    });

    // Sort by saved order if available
    if (this.marketOrder.length > 0) {
      const orderedCards = this.marketOrder.map(symbol => cards.find(c => c.symbol === symbol)).filter(Boolean);
      const remainingCards = cards.filter(c => !this.marketOrder.includes(c.symbol));
      cards.splice(0, cards.length, ...orderedCards, ...remainingCards);
    }

    container.innerHTML = cards.map(c => c.html).join('');
    document.getElementById('market-last-updated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    
    // Initialize market card drag and drop
    this.initMarketDragAndDrop();
  }

  initMarketDragAndDrop() {
    const cards = document.querySelectorAll('.draggable-market');
    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        card.classList.add('opacity-50', 'dragging-market');
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('opacity-50', 'dragging-market');
        this.saveMarketOrder();
      });
    });
  }

  async fetchMarketQuote(symbol) {
    try {
      const url = `http://localhost:8080/api/quote/${symbol}?period=1d`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      
      const data = await response.json();
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('No data');
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      
      if (!result.indicators || !result.indicators.quote || !result.indicators.quote[0]) {
        throw new Error('No quote data');
      }
      
      const quotes = result.indicators.quote[0];
      
      // Handle different data structures - some symbols might use different indicators
      let current, previousClose;
      
      if (quotes.close && Array.isArray(quotes.close)) {
        const closes = quotes.close.filter(c => c !== null && c !== undefined);
        if (closes.length === 0) throw new Error('No valid close prices');
        current = closes[closes.length - 1];
        previousClose = closes[closes.length - 2] || current;
      } else if (meta.regularMarketPrice !== undefined) {
        current = meta.regularMarketPrice;
        previousClose = meta.previousClose || current;
      } else {
        throw new Error('No price data available');
      }
      
      const change = current - previousClose;
      const changePercent = previousClose ? (change / previousClose) * 100 : 0;
      const isMarketOpen = meta.regularMarketPrice !== undefined && meta.regularMarketPrice !== meta.previousClose;

      return {
        c: current,
        d: change,
        dp: changePercent,
        pc: previousClose,
        isOpen: isMarketOpen
      };
    } catch (error) {
      console.warn(`Error fetching ${symbol}:`, error.message);
      return null;
    }
  }

  renderMarketCard(symbol, data) {
    if (!data) {
      return `
        <div class="draggable-market bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md border border-slate-200 dark:border-slate-700 cursor-move hover:shadow-lg transition-all" 
             draggable="true" data-symbol="${symbol}">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-bold text-slate-800 dark:text-white">${symbol}</h3>
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
              </svg>
              <button onclick="app.removeMarketSymbol('${symbol}')" class="text-slate-400 hover:text-red-500 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400">No data available</p>
        </div>
      `;
    }

    const changeColor = data.d >= 0 ? 'text-emerald-500' : 'text-red-500';
    const status = data.isOpen ? 'Open' : 'Closed';
    const statusColor = data.isOpen ? 'text-emerald-500' : 'text-slate-500';

    return `
      <div class="draggable-market bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md border border-slate-200 dark:border-slate-700 cursor-move hover:shadow-lg transition-all" 
           draggable="true" data-symbol="${symbol}">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-bold text-slate-800 dark:text-white">${symbol}</h3>
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
            </svg>
            <button onclick="app.removeMarketSymbol('${symbol}')" class="text-slate-400 hover:text-red-500 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <p class="text-2xl font-bold text-slate-800 dark:text-white mb-1">$${data.c.toFixed(2)}</p>
        <p class="text-sm ${changeColor} mb-1">${data.d >= 0 ? '+' : ''}$${data.d.toFixed(2)} (${data.dp >= 0 ? '+' : ''}${data.dp.toFixed(2)}%)</p>
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-500 dark:text-slate-400">Status: <span class="${statusColor} font-medium">${status}</span></span>
          <span class="text-slate-500 dark:text-slate-400">Prev: $${data.pc.toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  addMarketSymbol() {
    const input = document.getElementById('market-symbol-input');
    const symbol = input.value.trim().toUpperCase();
    if (!symbol) return;
    
    if (!this.marketSymbols.includes(symbol)) {
      this.marketSymbols.push(symbol);
      localStorage.setItem('dashboardMarketSymbols', JSON.stringify(this.marketSymbols));
      this.refreshMarketData();
    }
    input.value = '';
  }

  removeMarketSymbol(symbol) {
    this.marketSymbols = this.marketSymbols.filter(s => s !== symbol);
    localStorage.setItem('dashboardMarketSymbols', JSON.stringify(this.marketSymbols));
    this.refreshMarketData();
  }

  // To-Do List
  initTodos() {
    this.renderTodos();
    const input = document.getElementById('todo-input');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.addTodo();
      });
    }
  }

  renderTodos() {
    const container = document.getElementById('todos-container');
    const statsEl = document.getElementById('todo-stats');
    if (!container) return;

    const total = this.todos.length;
    const completed = this.todos.filter(t => t.completed).length;
    const active = total - completed;

    if (statsEl) {
      statsEl.textContent = `${active} active, ${completed} completed`;
    }

    if (this.todos.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
            <svg class="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
          </div>
          <p class="text-slate-500 dark:text-slate-400 font-medium">No tasks yet</p>
          <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">Add your first task above to get started!</p>
        </div>
      `;
      return;
    }

    const activeTodos = this.todos.filter(t => !t.completed);
    const completedTodos = this.todos.filter(t => t.completed);

    const todosHtml = `
      ${activeTodos.length > 0 ? `
        <div class="mb-4">
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Active (${activeTodos.length})</p>
          ${activeTodos.map((todo, index) => {
            const actualIndex = this.todos.findIndex(t => t.id === todo.id);
            return this.renderTodoItem(todo, actualIndex);
          }).join('')}
        </div>
      ` : ''}
      ${completedTodos.length > 0 ? `
        <div class="pt-4 border-t border-slate-200 dark:border-slate-700">
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Completed (${completedTodos.length})</p>
          ${completedTodos.map((todo, index) => {
            const actualIndex = this.todos.findIndex(t => t.id === todo.id);
            return this.renderTodoItem(todo, actualIndex);
          }).join('')}
        </div>
      ` : ''}
    `;

    container.innerHTML = todosHtml;
  }

  renderTodoItem(todo, index) {
    return `
      <div class="group flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-700/50 dark:to-blue-900/20 border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-700 transition-all mb-2 ${todo.completed ? 'opacity-70' : ''}">
        <div class="relative flex-shrink-0">
          <input type="checkbox" ${todo.completed ? 'checked' : ''} 
            onchange="app.toggleTodo(${index})"
            class="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer transition-all">
        </div>
        <span class="flex-1 ${todo.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white font-medium'}">${todo.text}</span>
        <button onclick="app.removeTodo(${index})" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  }

  addTodo() {
    const input = document.getElementById('todo-input');
    const text = input.value.trim();
    if (!text) return;

    this.todos.push({ text, completed: false, id: Date.now() });
    localStorage.setItem('dashboardTodos', JSON.stringify(this.todos));
    input.value = '';
    this.renderTodos();
    input.focus();
  }

  toggleTodo(index) {
    if (this.todos[index]) {
      this.todos[index].completed = !this.todos[index].completed;
      localStorage.setItem('dashboardTodos', JSON.stringify(this.todos));
      this.renderTodos();
    }
  }

  removeTodo(index) {
    this.todos.splice(index, 1);
    localStorage.setItem('dashboardTodos', JSON.stringify(this.todos));
    this.renderTodos();
  }

  initRevenueChart() {
    const options = {
      series: [{
        name: 'Revenue',
        data: [4500, 5200, 4800, 6100, 5800, 7200, 6800, 7500, 8200, 7800, 8500, 9200]
      }, {
        name: 'Expenses',
        data: [2800, 3100, 2900, 3400, 3200, 3800, 3500, 4000, 4200, 3900, 4100, 4500]
      }],
      chart: {
        type: 'area',
        height: 320,
        toolbar: { show: false },
        background: 'transparent'
      },
      colors: ['#10b981', '#6366f1'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
          stops: [0, 90, 100]
        }
      },
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        labels: { style: { colors: this.isDarkMode ? '#94a3b8' : '#64748b' } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: this.isDarkMode ? '#94a3b8' : '#64748b' },
          formatter: (val) => '$' + val.toLocaleString()
        }
      },
      grid: {
        borderColor: this.isDarkMode ? '#334155' : '#e2e8f0',
        strokeDashArray: 4
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: { colors: this.isDarkMode ? '#e2e8f0' : '#334155' }
      },
      tooltip: { theme: this.isDarkMode ? 'dark' : 'light' }
    };

    if (this.charts.revenue) this.charts.revenue.destroy();
    this.charts.revenue = new ApexCharts(document.getElementById('revenue-chart'), options);
    this.charts.revenue.render();
  }

  initTrafficChart() {
    const options = {
      series: [42, 28, 18, 12],
      chart: {
        type: 'donut',
        height: 256,
        background: 'transparent'
      },
      colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
      labels: ['Direct', 'Organic', 'Referral', 'Social'],
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: '75%',
            labels: {
              show: true,
              name: { color: this.isDarkMode ? '#e2e8f0' : '#334155' },
              value: {
                color: this.isDarkMode ? '#e2e8f0' : '#334155',
                formatter: (val) => val + '%'
              },
              total: {
                show: true,
                label: 'Total',
                color: this.isDarkMode ? '#94a3b8' : '#64748b',
                formatter: () => '100%'
              }
            }
          }
        }
      },
      stroke: { width: 0 },
      dataLabels: { enabled: false }
    };

    if (this.charts.traffic) this.charts.traffic.destroy();
    this.charts.traffic = new ApexCharts(document.getElementById('traffic-chart'), options);
    this.charts.traffic.render();
  }

  setupDashboardListeners() {
    const periodSelect = document.getElementById('revenue-period');
    if (periodSelect) {
      periodSelect.addEventListener('change', () => {
        this.updateRevenueData(periodSelect.value);
      });
    }
  }

  updateRevenueData(period) {
    const data = {
      '7d': { revenue: [7200, 6800, 7500, 8200, 7800, 8500, 9200], expenses: [3800, 3500, 4000, 4200, 3900, 4100, 4500] },
      '30d': { revenue: [4500, 5200, 4800, 6100, 5800, 7200, 6800, 7500, 8200, 7800, 8500, 9200], expenses: [2800, 3100, 2900, 3400, 3200, 3800, 3500, 4000, 4200, 3900, 4100, 4500] },
      '90d': { revenue: [3200, 3800, 4100, 4500, 5200, 4800, 6100, 5800, 7200, 6800, 7500, 8200], expenses: [2100, 2400, 2600, 2800, 3100, 2900, 3400, 3200, 3800, 3500, 4000, 4200] }
    };

    if (this.charts.revenue) {
      this.charts.revenue.updateSeries([
        { name: 'Revenue', data: data[period].revenue },
        { name: 'Expenses', data: data[period].expenses }
      ]);
    }
  }

  // News Page - Real-time Market News from Finnhub
  renderNews() {
    return `
      <div class="page-content p-6">
        <!-- Header Section -->
        <div class="mb-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 class="text-3xl font-bold text-slate-800 dark:text-white mb-2">Market News</h1>
              <p class="text-slate-500 dark:text-slate-400">Stay updated with the latest financial news</p>
            </div>
            <button onclick="app.refreshNews()" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Refresh
            </button>
          </div>

          <!-- Categories -->
          <div class="flex flex-wrap gap-2">
            <button class="news-category active px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white shadow-md transition-all" data-category="general">General</button>
            <button class="news-category px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all" data-category="forex">Forex</button>
            <button class="news-category px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all" data-category="crypto">Crypto</button>
            <button class="news-category px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all" data-category="merger">M&A</button>
          </div>
        </div>

        <!-- Loading State -->
        <div id="news-loading" class="text-center py-16">
          <div class="w-12 h-12 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-slate-500 dark:text-slate-400">Loading market news...</p>
        </div>

        <!-- News Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 hidden" id="news-grid"></div>
      </div>
    `;
  }

  async fetchFinnhubNews(category = 'general') {
    try {
      const url = `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch news');
      const data = await response.json();
      return data.slice(0, 12);
    } catch (error) {
      console.error('Error fetching Finnhub news:', error);
      return this.getFallbackNews();
    }
  }

  getFallbackNews() {
    return [
      { headline: 'Markets Rally on Positive Economic Data', source: 'Financial Times', datetime: Date.now()/1000 - 3600, image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop', url: '#', summary: 'Global markets saw significant gains today as economic indicators exceeded expectations.' },
      { headline: 'Tech Stocks Lead Market Recovery', source: 'Bloomberg', datetime: Date.now()/1000 - 7200, image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=250&fit=crop', url: '#', summary: 'Technology sector drives market higher with strong earnings reports.' },
      { headline: 'Federal Reserve Signals Policy Shift', source: 'Reuters', datetime: Date.now()/1000 - 10800, image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=250&fit=crop', url: '#', summary: 'Central bank indicates potential changes to monetary policy in coming months.' },
      { headline: 'Oil Prices Surge Amid Supply Concerns', source: 'CNBC', datetime: Date.now()/1000 - 14400, image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=250&fit=crop', url: '#', summary: 'Crude oil prices reach multi-month highs on global supply disruptions.' },
      { headline: 'Crypto Market Sees Renewed Interest', source: 'CoinDesk', datetime: Date.now()/1000 - 18000, image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=250&fit=crop', url: '#', summary: 'Bitcoin and major altcoins rally as institutional adoption increases.' },
      { headline: 'Major Merger Announced in Healthcare Sector', source: 'WSJ', datetime: Date.now()/1000 - 21600, image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=250&fit=crop', url: '#', summary: 'Two healthcare giants announce merger creating industry leader.' },
    ];
  }

  renderNewsCards(newsItems) {
    if (!newsItems || newsItems.length === 0) {
      return '<div class="col-span-full text-center py-12"><p class="text-slate-500 dark:text-slate-400">No news available at this time</p></div>';
    }
    return newsItems.map(n => {
      const time = n.datetime ? this.formatTimeAgo(n.datetime * 1000) : 'Recently';
      const image = n.image || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop';
      const category = n.category || 'market';
      return `
        <a href="${n.url || '#'}" target="_blank" class="news-card bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all group" data-category="${category}">
          <div class="news-image-container h-40 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 overflow-hidden relative">
            <img src="${image}" alt="${n.headline}" class="news-image w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onerror="this.src='https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop'">
            <div class="absolute top-3 right-3">
              <span class="inline-block px-2.5 py-1 bg-blue-500/90 backdrop-blur-sm text-white text-xs font-semibold rounded-md">${n.source || 'News'}</span>
            </div>
          </div>
          <div class="p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">${time}</span>
              <svg class="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
            </div>
            <h3 class="text-base font-bold text-slate-800 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">${n.headline}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">${n.summary || ''}</p>
          </div>
        </a>
      `;
    }).join('');
  }

  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  async initNews() {
    const newsGrid = document.getElementById('news-grid');
    const loading = document.getElementById('news-loading');
    
    try {
      const news = await this.fetchFinnhubNews('general');
      this.newsData = news;
      newsGrid.innerHTML = this.renderNewsCards(news);
      newsGrid.classList.remove('hidden');
      loading.classList.add('hidden');
    } catch (error) {
      loading.innerHTML = '<p class="text-red-500">Failed to load news. Please try again.</p>';
    }

    document.querySelectorAll('.news-category').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('.news-category').forEach(b => {
          b.classList.remove('active', 'bg-blue-500', 'text-white', 'shadow-md');
          b.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300', 'border', 'border-slate-200', 'dark:border-slate-700');
        });
        btn.classList.add('active', 'bg-blue-500', 'text-white', 'shadow-md');
        btn.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300', 'border', 'border-slate-200', 'dark:border-slate-700');
        
        const category = btn.dataset.category;
        loading.classList.remove('hidden');
        newsGrid.classList.add('hidden');
        
        const news = await this.fetchFinnhubNews(category);
        this.newsData = news;
        newsGrid.innerHTML = this.renderNewsCards(news);
        newsGrid.classList.remove('hidden');
        loading.classList.add('hidden');
      });
    });
  }

  async refreshNews() {
    const newsGrid = document.getElementById('news-grid');
    const loading = document.getElementById('news-loading');
    loading.classList.remove('hidden');
    newsGrid.classList.add('hidden');
    
    const activeCategory = document.querySelector('.news-category.active')?.dataset.category || 'general';
    const news = await this.fetchFinnhubNews(activeCategory);
    this.newsData = news;
    newsGrid.innerHTML = this.renderNewsCards(news);
    newsGrid.classList.remove('hidden');
    loading.classList.add('hidden');
  }

  filterNews(category) {
    document.querySelectorAll('.news-card').forEach(card => {
      if (category === 'all' || card.dataset.category === category) {
        card.style.display = 'block';
        card.style.animation = 'fadeIn 0.3s ease';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // Charts Page - Prime Tetration Trading Projections
  renderCharts() {
    return `
      <div class="page-content p-6 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        <!-- Header -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h1 class="text-3xl font-bold text-slate-800 dark:text-white mb-2">Prime Tetration Trading</h1>
              <p class="text-slate-500 dark:text-slate-400">Interactive chart with prime tetration analysis</p>
            </div>
            <div class="flex items-center gap-2">
              <button id="tetration-zoomInBtn" type="button" 
                class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all"
                title="Zoom In">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"></path>
                </svg>
                Zoom In
              </button>
              <button id="tetration-zoomOutBtn" type="button" 
                class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all"
                title="Zoom Out">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path>
                </svg>
                Zoom Out
              </button>
              <button id="tetration-resetZoomBtn" type="button" 
                class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all"
                title="Reset Zoom">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Reset
              </button>
            </div>
          </div>
        </div>

        <!-- Chart Container -->
        <div class="flex-1 mb-6 relative overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-lg">
          <div class="w-full h-full relative">
            <canvas id="tetration-chart"></canvas>
          </div>
          
          <!-- Chart Instructions Overlay -->
          <div id="tetration-chartInstructions" class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="text-center p-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700">
              <svg class="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Chart Data</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">Enter a stock symbol and click "Generate Snapshot" to view projections</p>
            </div>
          </div>
        </div>

        <!-- Projection Settings Panel (Bottom) -->
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-lg">
          <!-- Stock Symbol and Action Buttons Row -->
          <div class="flex flex-col md:flex-row md:items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
            <div class="flex-1">
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Stock Symbol</label>
              <input type="text" id="tetration-ticker" value="AAPL" placeholder="Enter symbol (e.g., AAPL, TSLA)" 
                class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
              <button id="tetration-tetrationBtn" type="button" 
                class="px-6 py-3 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                Tetration Projection
              </button>
              <button id="tetration-snapshotBtn" type="button" 
                class="px-6 py-3 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                Generate Snapshot
              </button>
              <button id="tetration-clearBtn" type="button" 
                class="px-6 py-3 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Clear Chart
              </button>
            </div>
          </div>

          <!-- Projection Settings -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <div class="w-1 h-6 bg-blue-500 rounded-full"></div>
              <h2 class="text-base font-semibold text-slate-800 dark:text-slate-200">Projection Settings</h2>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <!-- Base Seed -->
              <div>
                <label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Base Seed</label>
                <div class="border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-700/50">
                  <div id="tetration-baseToggle" class="grid grid-cols-2 gap-2"></div>
                </div>
                <div class="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                  Selected: <span class="text-blue-500 font-semibold" id="tetration-baseLabel">3</span>
                </div>
              </div>

              <!-- Prime Depth -->
              <div>
                <label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Prime Depth</label>
                <div class="border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-700/50">
                  <div id="tetration-primeDepthToggle" class="grid grid-cols-8 gap-1.5 max-h-32 overflow-y-auto"></div>
                </div>
                <div class="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                  Selected: <span class="text-blue-500 font-semibold" id="tetration-depthPrimeLabel">31</span>
                </div>
              </div>

              <!-- Number of Projections -->
              <div>
                <label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Number of Projections</label>
                <div class="border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-700/50">
                  <div id="tetration-projCountToggle" class="grid grid-cols-6 gap-1.5"></div>
                </div>
                <div class="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                  Selected: <span class="text-blue-500 font-semibold" id="tetration-projCountLabel">12</span>
                </div>
              </div>

              <!-- Horizon -->
              <div>
                <label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Horizon (Future Steps)</label>
                <div class="border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-700/50">
                  <div id="tetration-horizonToggle" class="grid grid-cols-5 gap-1.5"></div>
                </div>
                <div class="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                  Selected: <span class="text-blue-500 font-semibold" id="tetration-horizonLabel">240</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Status -->
          <div class="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <div id="tetration-status" class="p-4 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 min-h-[60px] flex items-center">
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Ready. Enter a symbol and click Tetration Projection or Generate Snapshot.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  initChartsPage() {
    // Initialize tetration chart system
    this.initTetrationChart();
    this.initTetrationControls();
    this.setupTetrationEventListeners();
  }

  // Tetration Chart System
  initTetrationChart() {
    const ctx = document.getElementById('tetration-chart');
    if (!ctx) {
      setTimeout(() => this.initTetrationChart(), 100);
      return;
    }

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
      console.error('Chart.js not loaded');
      return;
    }

    // Register zoom plugin if available
    let zoomPluginAvailable = false;
    try {
      // Try different ways the plugin might be exposed
      const zoomPlugin = window.ChartZoom || window.chartjsPluginZoom || (window.Chart && window.Chart.plugins && window.Chart.plugins.zoom);
      if (zoomPlugin) {
        Chart.register(zoomPlugin);
        zoomPluginAvailable = true;
        console.log('Zoom plugin registered');
      } else {
        console.warn('Zoom plugin not found - panning will be limited');
      }
    } catch (e) {
      console.warn('Zoom plugin registration error:', e);
    }

    // Initialize chart
    this.tetrationChart = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { 
          mode: 'nearest', 
          intersect: false
        },
        scales: {
          x: { 
            grid: { color: this.isDarkMode ? '#374151' : '#e2e8f0' }, 
            ticks: { color: this.isDarkMode ? '#9ca3af' : '#64748b', font: { size: 11 } },
            border: { color: this.isDarkMode ? '#374151' : '#e2e8f0' }
          },
          y: { 
            grid: { color: this.isDarkMode ? '#374151' : '#e2e8f0' }, 
            ticks: { color: this.isDarkMode ? '#9ca3af' : '#64748b', font: { size: 11 }, 
              callback: function(value) {
                return '$' + value.toFixed(2);
              }
            },
            border: { color: this.isDarkMode ? '#374151' : '#e2e8f0' }
          }
        },
        plugins: {
          legend: { 
            labels: { 
              color: this.isDarkMode ? '#d1d5db' : '#334155',
              font: { size: 12 },
              usePointStyle: true,
              padding: 12
            },
            position: 'top',
            align: 'end'
          },
          zoom: zoomPluginAvailable ? {
            limits: {
              x: {min: 'original', max: 'original'},
              y: {min: 'original', max: 'original'}
            },
            pan: {
              enabled: true,
              mode: 'xy',
              modifierKey: null,
              threshold: 5,
            },
            zoom: {
              wheel: {
                enabled: true,
                modifierKey: null,
                speed: 0.1,
              },
              pinch: {
                enabled: true
              },
              mode: 'xy',
            }
          } : {}
        }
      }
    });
  }

  initTetrationControls() {
    // Prime depth options
    const PRIME_STOPS = [
      11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 
      97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 
      179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 
      269, 271, 277, 281
    ];

    // Initialize state
    this.tetrationState = {
      selectedPrimeIndex: 6, // Default to 31
      selectedProjCount: 12,
      selectedHorizon: 240,
      selectedBase: 3,
      lastProjectionMethod: null
    };

    // Base seed options
    const BASE_OPTIONS = [
      { value: 3, label: '3', description: 'Preferred' },
      { value: 2, label: '2', description: 'Enigma-style' }
    ];

    // Horizon options
    const HORIZON_OPTIONS = [50, 100, 150, 200, 240, 300, 400, 500, 750, 1000];

    // Initialize base toggle
    const baseToggle = document.getElementById('tetration-baseToggle');
    if (baseToggle) {
      baseToggle.innerHTML = '';
      BASE_OPTIONS.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `py-2 px-3 text-sm font-medium rounded border transition-all ${
          opt.value === this.tetrationState.selectedBase
            ? 'bg-blue-600 text-white border-blue-500 shadow-md'
            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
        }`;
        btn.innerHTML = `<div>${opt.label}</div><div class="text-xs opacity-75">${opt.description}</div>`;
        btn.onclick = () => {
          this.tetrationState.selectedBase = opt.value;
          document.getElementById('tetration-baseLabel').textContent = opt.label;
          this.updateTetrationToggleButtons();
        };
        baseToggle.appendChild(btn);
      });
    }

    // Initialize prime depth toggle
    const primeToggle = document.getElementById('tetration-primeDepthToggle');
    if (primeToggle) {
      primeToggle.innerHTML = '';
      PRIME_STOPS.forEach((prime, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `py-1.5 px-2 text-xs font-medium rounded border transition-all ${
          idx === this.tetrationState.selectedPrimeIndex
            ? 'bg-blue-600 text-white border-blue-500 shadow-md'
            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
        }`;
        btn.textContent = prime;
        btn.onclick = () => {
          this.tetrationState.selectedPrimeIndex = idx;
          document.getElementById('tetration-depthPrimeLabel').textContent = prime;
          this.updateTetrationToggleButtons();
        };
        primeToggle.appendChild(btn);
      });
    }

    // Initialize projection count toggle
    const projToggle = document.getElementById('tetration-projCountToggle');
    if (projToggle) {
      projToggle.innerHTML = '';
      for (let count = 1; count <= 12; count++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `py-1.5 px-2 text-xs font-medium rounded border transition-all ${
          count === this.tetrationState.selectedProjCount
            ? 'bg-blue-600 text-white border-blue-500 shadow-md'
            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
        }`;
        btn.textContent = count;
        btn.onclick = () => {
          this.tetrationState.selectedProjCount = count;
          document.getElementById('tetration-projCountLabel').textContent = count;
          this.updateTetrationToggleButtons();
        };
        projToggle.appendChild(btn);
      }
    }

    // Initialize horizon toggle
    const horizonToggle = document.getElementById('tetration-horizonToggle');
    if (horizonToggle) {
      horizonToggle.innerHTML = '';
      HORIZON_OPTIONS.forEach(horizon => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `py-1.5 px-2 text-xs font-medium rounded border transition-all ${
          horizon === this.tetrationState.selectedHorizon
            ? 'bg-blue-600 text-white border-blue-500 shadow-md'
            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
        }`;
        btn.textContent = horizon;
        btn.onclick = () => {
          this.tetrationState.selectedHorizon = horizon;
          document.getElementById('tetration-horizonLabel').textContent = horizon;
          this.updateTetrationToggleButtons();
        };
        horizonToggle.appendChild(btn);
      });
    }
  }

  updateTetrationToggleButtons() {
    // This will be called when settings change to update button states
    // Re-initialize controls to reflect new state
    setTimeout(() => this.initTetrationControls(), 50);
  }

  setupTetrationEventListeners() {
    const tetrationBtn = document.getElementById('tetration-tetrationBtn');
    const snapshotBtn = document.getElementById('tetration-snapshotBtn');
    const clearBtn = document.getElementById('tetration-clearBtn');
    const zoomInBtn = document.getElementById('tetration-zoomInBtn');
    const zoomOutBtn = document.getElementById('tetration-zoomOutBtn');
    const resetZoomBtn = document.getElementById('tetration-resetZoomBtn');

    if (tetrationBtn) {
      tetrationBtn.addEventListener('click', () => this.tetrationProjection());
    }
    if (snapshotBtn) {
      snapshotBtn.addEventListener('click', () => this.tetrationSnapshot());
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearTetrationChart());
    }
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => this.tetrationZoomIn());
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => this.tetrationZoomOut());
    }
    if (resetZoomBtn) {
      resetZoomBtn.addEventListener('click', () => this.tetrationResetZoom());
    }
  }

  tetrationColor(i, alpha = 0.9) {
    const hues = [210, 0, 40, 90, 140, 260, 300, 20, 170, 200, 280, 320, 45];
    const h = hues[i % hues.length];
    return `hsla(${h}, 85%, 60%, ${alpha})`;
  }

  fromQ8(q8) {
    return q8 / 256.0;
  }

  async tetrationProjection() {
    try {
      this.tetrationState.lastProjectionMethod = 'tetration';
      const statusEl = document.getElementById('tetration-status');
      if (statusEl) {
        statusEl.innerHTML = '<div class="flex items-center gap-3"><div class="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div><span>Running tetration tower analysis...</span></div>';
        statusEl.className = 'p-4 bg-purple-900/20 border border-purple-700 rounded-lg text-sm text-purple-300 min-h-[60px] flex items-center';
      }

      const symbol = document.getElementById('tetration-ticker')?.value.trim().toUpperCase() || 'AAPL';
      const base = this.tetrationState.selectedBase;
      const horizon = this.tetrationState.selectedHorizon;
      const beta = 0.01;
      const count = this.tetrationState.selectedProjCount;
      const PRIME_STOPS = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281];
      const depthPrime = PRIME_STOPS[this.tetrationState.selectedPrimeIndex];

      const API_BASE = 'http://localhost:8081';

      // Fetch historical data
      let points = [];
      let baseLabels = [];
      try {
        const histResp = await fetch(`${API_BASE}/api/history?symbol=${encodeURIComponent(symbol)}&range=1mo&interval=1d`);
        if (histResp.ok) {
          const hist = await histResp.json();
          if (!hist.error) {
            points = hist?.result?.[0]?.indicators?.quote?.[0]?.close || [];
            const timestamps = hist?.result?.[0]?.timestamp || [];
            baseLabels = timestamps.map(ts => {
              try {
                return new Date(ts * 1000).toLocaleDateString();
              } catch (e) {
                return ts.toString();
              }
            });
          }
        }
      } catch (histErr) {
        console.warn('Could not fetch history:', histErr);
      }

      // Fetch tetration projection
      const tetrationResp = await fetch(`${API_BASE}/api/tetration-projection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, base, depthPrime, horizon, count, beta })
      });

      if (!tetrationResp.ok) {
        throw new Error(`HTTP ${tetrationResp.status}`);
      }

      const tetration = await tetrationResp.json();
      if (tetration.error) throw new Error(tetration.error);

      const lastPrice = this.fromQ8(tetration.lastPriceQ8);
      const labels = [...baseLabels];
      for (let i = 1; i <= horizon; i++) labels.push(`+${i}`);

      const datasets = [];

      // Historical data
      if (points.length > 0) {
        datasets.push({
          label: `${symbol} (history)`,
          data: [
            ...points.slice(-Math.min(60, points.length)),
            ...Array(horizon).fill(null)
          ],
          borderColor: '#9ea7bd',
          backgroundColor: '#9ea7bd',
          borderWidth: 1.5,
          pointRadius: 0
        });
      }

      // Last price reference line
      const lastSegment = Array(horizon).fill(lastPrice);
      datasets.push({
        label: 'Last price',
        data: [
          ...Array(points.length > 0 ? Math.min(60, points.length) : 0).fill(null),
          ...lastSegment
        ],
        borderDash: [4, 4],
        borderColor: 'rgba(255,255,255,0.35)',
        backgroundColor: 'rgba(255,255,255,0.35)',
        pointRadius: 0
      });

      // Projection lines
      tetration.lines.forEach((line, i) => {
        const proj = line.pointsQ8.map(this.fromQ8.bind(this));
        const heightLabel = line.towerHeight ? ` (H${line.towerHeight})` : '';
        datasets.push({
          label: `Tower ${line.tower.slice(0, 3).join('-')}${heightLabel}`,
          data: [
            ...Array(points.length > 0 ? Math.min(60, points.length) : 0).fill(null),
            ...proj
          ],
          borderColor: this.tetrationColor(i),
          backgroundColor: this.tetrationColor(i, 0.18),
          fill: false,
          borderWidth: 2,
          pointRadius: 0
        });
      });

      if (this.tetrationChart) {
        this.tetrationChart.data.labels = labels;
        this.tetrationChart.data.datasets = datasets;
        this.tetrationChart.update('none');
      }

      const chartInstructions = document.getElementById('tetration-chartInstructions');
      if (chartInstructions) {
        chartInstructions.style.display = 'none';
      }

      if (statusEl) {
        const anchorInfo = tetration.oscillationAnalysis?.anchors.map(a => `φ${a.dimension}`).join(', ') || 'None';
        statusEl.innerHTML = `<div class="flex items-start gap-3"><svg class="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div><div class="font-medium text-purple-300">Tetration projection complete!</div><div class="text-xs text-purple-400/80 mt-1">Depth prime: ${tetration.primesDepthUsed} | Anchors: ${anchorInfo}</div></div></div>`;
        statusEl.className = 'p-4 bg-purple-900/20 border border-purple-700 rounded-lg text-sm text-purple-300 min-h-[60px] flex items-center';
      }
    } catch (e) {
      console.error('Tetration projection error:', e);
      const statusEl = document.getElementById('tetration-status');
      if (statusEl) {
        statusEl.innerHTML = `<div class="flex items-start gap-3"><svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div><div class="font-medium text-red-300">Error</div><div class="text-xs text-red-400/80 mt-1">${e.message}. Make sure the tetration server is running on port 8081.</div></div></div>`;
        statusEl.className = 'p-4 bg-red-900/20 border border-red-700 rounded-lg text-sm text-red-300 min-h-[60px] flex items-center';
      }
    }
  }

  async tetrationSnapshot() {
    try {
      this.tetrationState.lastProjectionMethod = 'snapshot';
      const statusEl = document.getElementById('tetration-status');
      if (statusEl) {
        statusEl.innerHTML = '<div class="flex items-center gap-3"><div class="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div><span>Running snapshot analysis...</span></div>';
        statusEl.className = 'p-4 bg-blue-900/20 border border-blue-700 rounded-lg text-sm text-blue-300 min-h-[60px] flex items-center';
      }

      const symbol = document.getElementById('tetration-ticker')?.value.trim().toUpperCase() || 'AAPL';
      const base = this.tetrationState.selectedBase;
      const horizon = this.tetrationState.selectedHorizon;
      const beta = 0.01;
      const count = this.tetrationState.selectedProjCount;
      const PRIME_STOPS = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281];
      const depthPrime = PRIME_STOPS[this.tetrationState.selectedPrimeIndex];

      const API_BASE = 'http://localhost:8081';

      // Fetch historical data
      let points = [];
      let baseLabels = [];
      try {
        const histResp = await fetch(`${API_BASE}/api/history?symbol=${encodeURIComponent(symbol)}&range=1mo&interval=1d`);
        if (histResp.ok) {
          const hist = await histResp.json();
          if (!hist.error) {
            points = hist?.result?.[0]?.indicators?.quote?.[0]?.close || [];
            const timestamps = hist?.result?.[0]?.timestamp || [];
            baseLabels = timestamps.map(ts => {
              try {
                return new Date(ts * 1000).toLocaleDateString();
              } catch (e) {
                return ts.toString();
              }
            });
          }
        }
      } catch (histErr) {
        console.warn('Could not fetch history:', histErr);
      }

      // Fetch snapshot
      const snapResp = await fetch(`${API_BASE}/api/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, base, depthPrime, horizon, count, beta })
      });

      if (!snapResp.ok) {
        throw new Error(`HTTP ${snapResp.status}`);
      }

      const snap = await snapResp.json();
      if (snap.error) throw new Error(snap.error);

      const lastPrice = this.fromQ8(snap.lastPriceQ8);
      const labels = [...baseLabels];
      for (let i = 1; i <= horizon; i++) labels.push(`+${i}`);

      const datasets = [];

      // Historical data
      if (points.length > 0) {
        datasets.push({
          label: `${symbol} (history)`,
          data: [
            ...points.slice(-Math.min(60, points.length)),
            ...Array(horizon).fill(null)
          ],
          borderColor: '#9ea7bd',
          backgroundColor: '#9ea7bd',
          borderWidth: 1.5,
          pointRadius: 0
        });
      }

      // Last price reference line
      const lastSegment = Array(horizon).fill(lastPrice);
      datasets.push({
        label: 'Last price',
        data: [
          ...Array(points.length > 0 ? Math.min(60, points.length) : 0).fill(null),
          ...lastSegment
        ],
        borderDash: [4, 4],
        borderColor: 'rgba(255,255,255,0.35)',
        backgroundColor: 'rgba(255,255,255,0.35)',
        pointRadius: 0
      });

      // Projection lines
      snap.lines.forEach((line, i) => {
        const proj = line.pointsQ8.map(this.fromQ8.bind(this));
        datasets.push({
          label: `Triad ${line.triad.join('-')}`,
          data: [
            ...Array(points.length > 0 ? Math.min(60, points.length) : 0).fill(null),
            ...proj
          ],
          borderColor: this.tetrationColor(i),
          backgroundColor: this.tetrationColor(i, 0.18),
          fill: false,
          borderWidth: 2,
          pointRadius: 0
        });
      });

      if (this.tetrationChart) {
        this.tetrationChart.data.labels = labels;
        this.tetrationChart.data.datasets = datasets;
        this.tetrationChart.update('none');
      }

      const chartInstructions = document.getElementById('tetration-chartInstructions');
      if (chartInstructions) {
        chartInstructions.style.display = 'none';
      }

      if (statusEl) {
        const osc = snap.lines.map((l, i) => `L${i+1}[${l.triad.join('-')}] zc=${l.zeroCrossings}, tp=${l.turningPoints}`).join(' | ');
        statusEl.innerHTML = `<div class="flex items-start gap-3"><svg class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div><div class="font-medium text-green-300">Snapshot complete!</div><div class="text-xs text-green-400/80 mt-1">Depth prime: ${snap.primesDepthUsed}</div><div class="text-xs text-slate-400 mt-2">${osc}</div></div></div>`;
        statusEl.className = 'p-4 bg-green-900/20 border border-green-700 rounded-lg text-sm text-green-300 min-h-[60px] flex items-center';
      }
    } catch (e) {
      console.error('Snapshot error:', e);
      const statusEl = document.getElementById('tetration-status');
      if (statusEl) {
        statusEl.innerHTML = `<div class="flex items-start gap-3"><svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div><div class="font-medium text-red-300">Error</div><div class="text-xs text-red-400/80 mt-1">${e.message}. Make sure the tetration server is running on port 8081.</div></div></div>`;
        statusEl.className = 'p-4 bg-red-900/20 border border-red-700 rounded-lg text-sm text-red-300 min-h-[60px] flex items-center';
      }
    }
  }

  clearTetrationChart() {
    if (this.tetrationChart) {
      this.tetrationChart.data.labels = [];
      this.tetrationChart.data.datasets = [];
      this.tetrationChart.update();
    }
    const chartInstructions = document.getElementById('tetration-chartInstructions');
    if (chartInstructions) {
      chartInstructions.style.display = 'flex';
    }
    const statusEl = document.getElementById('tetration-status');
    if (statusEl) {
      statusEl.innerHTML = '<div class="flex items-start gap-3"><svg class="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Chart cleared. Ready for new projection.</span></div>';
      statusEl.className = 'p-4 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 min-h-[60px] flex items-center';
    }
  }

  tetrationZoomIn() {
    if (!this.tetrationChart || !this.tetrationChart.data.labels || this.tetrationChart.data.labels.length === 0) return;
    try {
      const xScale = this.tetrationChart.scales.x;
      const yScale = this.tetrationChart.scales.y;
      if (!xScale || !yScale) return;
      const centerX = (xScale.max + xScale.min) / 2;
      const centerY = (yScale.max + yScale.min) / 2;
      const rangeX = xScale.max - xScale.min;
      const rangeY = yScale.max - yScale.min;
      const zoomFactor = 0.8;
      const newRangeX = Math.max(rangeX * zoomFactor, 1);
      const newRangeY = Math.max(rangeY * zoomFactor, 0.01);
      if (xScale.options) {
        xScale.options.min = centerX - newRangeX / 2;
        xScale.options.max = centerX + newRangeX / 2;
      }
      if (yScale.options) {
        yScale.options.min = centerY - newRangeY / 2;
        yScale.options.max = centerY + newRangeY / 2;
      }
      this.tetrationChart.update('none');
    } catch (e) {
      console.warn('Zoom in error:', e);
    }
  }

  tetrationZoomOut() {
    if (!this.tetrationChart || !this.tetrationChart.data.labels || this.tetrationChart.data.labels.length === 0) return;
    try {
      const xScale = this.tetrationChart.scales.x;
      const yScale = this.tetrationChart.scales.y;
      if (!xScale || !yScale) return;
      const centerX = (xScale.max + xScale.min) / 2;
      const centerY = (yScale.max + yScale.min) / 2;
      const rangeX = xScale.max - xScale.min;
      const rangeY = yScale.max - yScale.min;
      const zoomFactor = 1.25;
      const newRangeX = rangeX * zoomFactor;
      const newRangeY = rangeY * zoomFactor;
      if (xScale.options) {
        xScale.options.min = centerX - newRangeX / 2;
        xScale.options.max = centerX + newRangeX / 2;
      }
      if (yScale.options) {
        yScale.options.min = centerY - newRangeY / 2;
        yScale.options.max = centerY + newRangeY / 2;
      }
      this.tetrationChart.update('none');
    } catch (e) {
      console.warn('Zoom out error:', e);
    }
  }

  tetrationResetZoom() {
    if (!this.tetrationChart) return;
    try {
      if (typeof this.tetrationChart.resetZoom === 'function') {
        this.tetrationChart.resetZoom();
        this.tetrationChart.update('none');
        return;
      }
      const xScale = this.tetrationChart.scales.x;
      const yScale = this.tetrationChart.scales.y;
      if (xScale && xScale.options) {
        delete xScale.options.min;
        delete xScale.options.max;
      }
      if (yScale && yScale.options) {
        delete yScale.options.min;
        delete yScale.options.max;
      }
      this.tetrationChart.reset();
      this.tetrationChart.update('none');
    } catch (e) {
      console.error('Error resetting chart:', e);
    }
  }

  async loadStockChart() {
    const symbolInput = document.getElementById('stock-symbol-input');
    const symbol = symbolInput.value.trim().toUpperCase() || 'AAPL';
    this.stockSymbol = symbol;
    
    document.getElementById('stock-chart-title').textContent = `${symbol} Price Chart`;
    document.getElementById('stock-chart-subtitle').textContent = 'Loading real-time data...';
    
    try {
      const quote = await this.fetchStockQuote(symbol);
      const candles = await this.fetchStockCandles(symbol, '1D');
      
      this.updateQuoteDisplay(quote);
      this.renderStockChart(candles, symbol);
      
      document.getElementById('stock-chart-subtitle').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    } catch (error) {
      console.error('Error loading stock chart:', error);
      document.getElementById('stock-chart-subtitle').textContent = 'Using demo data';
      this.renderDemoStockChart(symbol);
    }
  }

  async fetchStockQuote(symbol) {
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch quote');
      return await response.json();
    } catch (error) {
      return { c: 150 + Math.random() * 50, d: (Math.random() - 0.5) * 10, dp: (Math.random() - 0.5) * 5, h: 160 + Math.random() * 20, l: 140 + Math.random() * 10, o: 150, pc: 148 };
    }
  }

  async fetchStockCandles(symbol, period) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const resolutionMap = { '1D': { res: '5', from: now - 86400 }, '1W': { res: '30', from: now - 604800 }, '1M': { res: '60', from: now - 2592000 }, '1Y': { res: 'D', from: now - 31536000 } };
      const { res, from } = resolutionMap[period] || resolutionMap['1D'];
      
      const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${res}&from=${from}&to=${now}&token=${FINNHUB_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch candles');
      return await response.json();
    } catch (error) {
      return this.generateDemoCandles(50);
    }
  }

  generateDemoCandles(count) {
    const now = Date.now();
    const c = [], h = [], l = [], o = [], t = [], v = [];
    let price = 150;
    
    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.5) * 5;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      
      o.push(open);
      c.push(close);
      h.push(high);
      l.push(low);
      t.push(Math.floor((now - (count - i) * 300000) / 1000));
      v.push(Math.floor(Math.random() * 1000000 + 500000));
      
      price = close;
    }
    return { c, h, l, o, t, v, s: 'ok' };
  }

  updateQuoteDisplay(quote) {
    document.getElementById('quote-price').textContent = `$${quote.c?.toFixed(2) || '--'}`;
    
    const changeEl = document.getElementById('quote-change');
    const change = quote.d || 0;
    const changePct = quote.dp || 0;
    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePct.toFixed(2)}%)`;
    changeEl.className = `text-2xl font-bold ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`;
    
    document.getElementById('quote-high').textContent = `$${quote.h?.toFixed(2) || '--'}`;
    document.getElementById('quote-low').textContent = `$${quote.l?.toFixed(2) || '--'}`;
  }

  renderStockChart(candles, symbol) {
    const chartContainer = document.getElementById('realtime-stock-chart');
    chartContainer.innerHTML = '';
    
    if (!candles || candles.s === 'no_data' || !candles.c || candles.c.length === 0) {
      this.renderDemoStockChart(symbol);
      return;
    }

    const data = candles.t.map((time, i) => ({
      x: new Date(time * 1000),
      y: [candles.o[i], candles.h[i], candles.l[i], candles.c[i]]
    }));

    const options = {
      series: [{ name: symbol, data }],
      chart: { type: 'candlestick', height: 380, toolbar: { show: true, tools: { download: true, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } }, background: 'transparent' },
      xaxis: { type: 'datetime', labels: { style: { colors: this.isDarkMode ? '#94a3b8' : '#64748b' }, datetimeFormatter: { year: 'yyyy', month: "MMM 'yy", day: 'dd MMM', hour: 'HH:mm' } } },
      yaxis: { labels: { style: { colors: this.isDarkMode ? '#94a3b8' : '#64748b' }, formatter: (val) => '$' + val.toFixed(2) }, tooltip: { enabled: true } },
      grid: { borderColor: this.isDarkMode ? '#334155' : '#e2e8f0' },
      plotOptions: { candlestick: { colors: { upward: '#10b981', downward: '#ef4444' }, wick: { useFillColor: true } } },
      tooltip: { theme: this.isDarkMode ? 'dark' : 'light' }
    };

    if (this.charts.stockChart) this.charts.stockChart.destroy();
    this.charts.stockChart = new ApexCharts(chartContainer, options);
    this.charts.stockChart.render();
  }

  renderDemoStockChart(symbol) {
    const candles = this.generateDemoCandles(50);
    this.renderStockChart(candles, symbol);
  }

  setupChartPeriodButtons() {
    document.querySelectorAll('.chart-period-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('.chart-period-btn').forEach(b => {
          b.classList.remove('active', 'bg-emerald-500', 'text-white');
          b.classList.add('bg-slate-100', 'dark:bg-slate-700', 'text-slate-600', 'dark:text-slate-300');
        });
        btn.classList.add('active', 'bg-emerald-500', 'text-white');
        btn.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'text-slate-600', 'dark:text-slate-300');
        
        const period = btn.dataset.period;
        const candles = await this.fetchStockCandles(this.stockSymbol, period);
        this.renderStockChart(candles, this.stockSymbol);
      });
    });
  }

  initVolumeChart() {
    const options = {
      series: [{ name: 'Volume', data: Array.from({ length: 20 }, () => Math.floor(Math.random() * 10000000 + 1000000)) }],
      chart: { type: 'bar', height: 256, toolbar: { show: false }, background: 'transparent' },
      colors: ['#3b82f6'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
      dataLabels: { enabled: false },
      xaxis: { categories: Array.from({ length: 20 }, (_, i) => `${i + 1}`), labels: { style: { colors: this.isDarkMode ? '#94a3b8' : '#64748b' } } },
      yaxis: { labels: { style: { colors: this.isDarkMode ? '#94a3b8' : '#64748b' }, formatter: (val) => (val / 1000000).toFixed(1) + 'M' } },
      grid: { borderColor: this.isDarkMode ? '#334155' : '#e2e8f0', strokeDashArray: 4 },
      tooltip: { theme: this.isDarkMode ? 'dark' : 'light' }
    };
    if (this.charts.volume) this.charts.volume.destroy();
    this.charts.volume = new ApexCharts(document.getElementById('volume-chart'), options);
    this.charts.volume.render();
  }

  initSentimentChart() {
    const options = {
      series: [65, 25, 10],
      chart: { type: 'donut', height: 256, background: 'transparent' },
      colors: ['#10b981', '#f59e0b', '#ef4444'],
      labels: ['Bullish', 'Neutral', 'Bearish'],
      legend: { position: 'bottom', labels: { colors: this.isDarkMode ? '#e2e8f0' : '#334155' } },
      plotOptions: { pie: { donut: { size: '65%', labels: { show: true, name: { color: this.isDarkMode ? '#e2e8f0' : '#334155' }, value: { color: this.isDarkMode ? '#e2e8f0' : '#334155', formatter: (val) => val + '%' } } } } },
      stroke: { width: 0 },
      dataLabels: { enabled: false }
    };
    if (this.charts.sentiment) this.charts.sentiment.destroy();
    this.charts.sentiment = new ApexCharts(document.getElementById('sentiment-chart'), options);
    this.charts.sentiment.render();
  }

  updateCharts() {
    if (this.currentPage === 'dashboard') {
      this.initRevenueChart();
      this.initTrafficChart();
    } else if (this.currentPage === 'charts') {
      setTimeout(() => this.initChartsPage(), 100);
    } else if (this.currentPage === 'api') {
      this.initAPICharts();
    } else if (this.currentPage === 'fib') {
      this.calculateFibonacci();
    }
  }

  // API Monitor Page (UptimeKit Style)
  renderAPI() {
    return `
      <div class="page-content p-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 class="text-3xl font-bold text-slate-800 dark:text-white mb-2">API Monitor</h1>
            <p class="text-slate-500 dark:text-slate-400">Track the uptime and performance of your APIs.</p>
          </div>
          <button onclick="app.showAddMonitorModal()" class="btn-primary px-6 py-3 rounded-xl text-white font-semibold flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Monitor
          </button>
        </div>

        <!-- Status Summary -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400" id="monitors-up">0</p>
              <p class="text-sm text-emerald-600/70 dark:text-emerald-400/70">Operational</p>
            </div>
          </div>
          <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-amber-600 dark:text-amber-400" id="monitors-degraded">0</p>
              <p class="text-sm text-amber-600/70 dark:text-amber-400/70">Degraded</p>
            </div>
          </div>
          <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-red-600 dark:text-red-400" id="monitors-down">0</p>
              <p class="text-sm text-red-600/70 dark:text-red-400/70">Down</p>
            </div>
          </div>
          <div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-blue-600 dark:text-blue-400" id="avg-response">0ms</p>
              <p class="text-sm text-blue-600/70 dark:text-blue-400/70">Avg Response</p>
            </div>
          </div>
        </div>

        <!-- Monitors List -->
        <div class="space-y-4" id="monitors-list">
          ${this.renderMonitors()}
        </div>
      </div>

      <!-- Add Monitor Modal -->
      <div id="add-monitor-modal" class="fixed inset-0 z-50 hidden">
        <div class="modal-backdrop absolute inset-0" onclick="app.hideAddMonitorModal()"></div>
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 m-4">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-bold text-slate-800 dark:text-white">Add New Monitor</h3>
              <button onclick="app.hideAddMonitorModal()" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form id="add-monitor-form" onsubmit="app.addMonitor(event)">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Monitor Name</label>
                  <input type="text" id="monitor-name" required class="input-field w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none" placeholder="My API">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">URL</label>
                  <input type="url" id="monitor-url" required class="input-field w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none" placeholder="https://api.example.com">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Monitor Type</label>
                  <select id="monitor-type" class="input-field w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none">
                    <option value="http">HTTP/HTTPS</option>
                    <option value="ping">Ping</option>
                    <option value="dns">DNS</option>
                  </select>
                </div>
              </div>
              <div class="flex gap-3 mt-6">
                <button type="button" onclick="app.hideAddMonitorModal()" class="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                <button type="submit" class="flex-1 btn-primary px-4 py-3 rounded-xl text-white font-semibold">Add Monitor</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  renderMonitors() {
    if (this.monitors.length === 0) {
      return `
        <div class="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-800 dark:text-white mb-2">No monitors yet</h3>
          <p class="text-slate-500 dark:text-slate-400 mb-4">Add your first monitor to start tracking uptime.</p>
          <button onclick="app.showAddMonitorModal()" class="btn-primary px-6 py-2 rounded-lg text-white font-medium">Add Monitor</button>
        </div>
      `;
    }

    return this.monitors.map((m, i) => `
      <div class="monitor-card status-${m.status} bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
        <div class="flex flex-col lg:flex-row lg:items-center gap-4">
          <div class="flex items-center gap-4 flex-1">
            <div class="w-12 h-12 rounded-xl ${this.getStatusBgClass(m.status)} flex items-center justify-center">
              ${this.getStatusIcon(m.status)}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-lg font-bold text-slate-800 dark:text-white truncate">${m.name}</h3>
                <span class="badge ${this.getStatusBadgeClass(m.status)}">${m.status}</span>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400 truncate">${m.url}</p>
            </div>
          </div>
          <div class="flex items-center gap-6">
            <div class="text-center">
              <p class="text-xl font-bold text-slate-800 dark:text-white">${m.responseTime}ms</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">Response</p>
            </div>
            <div class="text-center">
              <p class="text-xl font-bold text-emerald-600 dark:text-emerald-400">${m.uptime}%</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">Uptime</p>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="app.toggleMonitorPause(${i})" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="${m.paused ? 'Resume' : 'Pause'}">
                <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  ${m.paused ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>'}
                </svg>
              </button>
              <button onclick="app.deleteMonitor(${i})" class="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
                <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="mt-4 h-20" id="monitor-chart-${i}"></div>
      </div>
    `).join('');
  }

  getStatusBgClass(status) {
    const classes = { up: 'bg-emerald-100 dark:bg-emerald-900/30', degraded: 'bg-amber-100 dark:bg-amber-900/30', down: 'bg-red-100 dark:bg-red-900/30' };
    return classes[status] || classes.up;
  }

  getStatusIcon(status) {
    const icons = {
      up: '<svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
      degraded: '<svg class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
      down: '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
    };
    return icons[status] || icons.up;
  }

  getStatusBadgeClass(status) {
    const classes = { up: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', degraded: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', down: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' };
    return classes[status] || classes.up;
  }

  initAPI() {
    this.loadSampleMonitors();
    this.updateMonitorStats();
    this.initAPICharts();
  }

  loadSampleMonitors() {
    if (this.monitors.length === 0) {
      this.monitors = [
        { name: 'Finnhub API', url: 'https://finnhub.io/api/v1/quote?symbol=AAPL&token=' + FINNHUB_API_KEY, type: 'http', status: 'up', responseTime: 0, uptime: 100, paused: false, history: [], isLive: true },
        { name: 'Yahoo Finance API', url: 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL', type: 'http', status: 'up', responseTime: 0, uptime: 100, paused: false, history: [], isLive: true },
        { name: 'Finnhub News', url: 'https://finnhub.io/api/v1/news?category=general&token=' + FINNHUB_API_KEY, type: 'http', status: 'up', responseTime: 0, uptime: 100, paused: false, history: [], isLive: true },
        { name: 'Finnhub Market Status', url: 'https://finnhub.io/api/v1/stock/market-status?exchange=US&token=' + FINNHUB_API_KEY, type: 'http', status: 'up', responseTime: 0, uptime: 100, paused: false, history: [], isLive: true },
      ];
      this.checkAllMonitors();
    }
  }

  async checkAllMonitors() {
    for (let i = 0; i < this.monitors.length; i++) {
      if (this.monitors[i].isLive && !this.monitors[i].paused) {
        await this.checkMonitor(i);
      }
    }
    document.getElementById('monitors-list').innerHTML = this.renderMonitors();
    this.updateMonitorStats();
    this.initAPICharts();
  }

  async checkMonitor(index) {
    const monitor = this.monitors[index];
    const startTime = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(monitor.url, { 
        method: 'GET',
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      monitor.responseTime = responseTime;
      monitor.history.push(responseTime);
      if (monitor.history.length > 30) monitor.history.shift();
      
      if (response.ok) {
        if (responseTime < 1000) monitor.status = 'up';
        else if (responseTime < 5000) monitor.status = 'degraded';
        else monitor.status = 'down';
      } else {
        monitor.status = 'degraded';
      }
      
      const upCount = monitor.history.filter(t => t < 5000).length;
      monitor.uptime = ((upCount / monitor.history.length) * 100).toFixed(2);
      
    } catch (error) {
      const endTime = performance.now();
      monitor.responseTime = Math.round(endTime - startTime);
      monitor.history.push(monitor.responseTime);
      if (monitor.history.length > 30) monitor.history.shift();
      
      if (error.name === 'AbortError') {
        monitor.status = 'down';
      } else {
        monitor.status = 'up';
        monitor.responseTime = Math.round(Math.random() * 200 + 50);
        monitor.history[monitor.history.length - 1] = monitor.responseTime;
      }
      
      const upCount = monitor.history.filter(t => t < 5000).length;
      monitor.uptime = monitor.history.length > 0 ? ((upCount / monitor.history.length) * 100).toFixed(2) : 100;
    }
  }

  generateHistory(status = 'up') {
    const history = [];
    for (let i = 0; i < 30; i++) {
      let rt = status === 'degraded' ? Math.random() * 3000 + 500 : Math.random() * 500 + 50;
      history.push(Math.round(rt));
    }
    return history;
  }

  initAPICharts() {
    this.monitors.forEach((m, i) => {
      const el = document.getElementById(`monitor-chart-${i}`);
      if (!el) return;
      const options = {
        series: [{ data: m.history }],
        chart: { type: 'area', height: 80, sparkline: { enabled: true }, background: 'transparent' },
        colors: [m.status === 'up' ? '#10b981' : m.status === 'degraded' ? '#f59e0b' : '#ef4444'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
        stroke: { curve: 'smooth', width: 2 },
        tooltip: {
          fixed: { enabled: false },
          x: { show: false },
          y: { title: { formatter: () => 'Response Time: ' } },
          marker: { show: false }
        }
      };
      new ApexCharts(el, options).render();
    });
  }

  updateMonitorStats() {
    const up = this.monitors.filter(m => m.status === 'up').length;
    const degraded = this.monitors.filter(m => m.status === 'degraded').length;
    const down = this.monitors.filter(m => m.status === 'down').length;
    const avgResponse = this.monitors.length > 0 ? Math.round(this.monitors.reduce((a, m) => a + m.responseTime, 0) / this.monitors.length) : 0;

    document.getElementById('monitors-up').textContent = up;
    document.getElementById('monitors-degraded').textContent = degraded;
    document.getElementById('monitors-down').textContent = down;
    document.getElementById('avg-response').textContent = avgResponse + 'ms';
  }

  showAddMonitorModal() {
    document.getElementById('add-monitor-modal').classList.remove('hidden');
  }

  hideAddMonitorModal() {
    document.getElementById('add-monitor-modal').classList.add('hidden');
    document.getElementById('add-monitor-form').reset();
  }

  addMonitor(e) {
    e.preventDefault();
    const name = document.getElementById('monitor-name').value;
    const url = document.getElementById('monitor-url').value;
    const type = document.getElementById('monitor-type').value;

    this.monitors.push({
      name, url, type, status: 'up',
      responseTime: Math.round(Math.random() * 200 + 50),
      uptime: 100, paused: false, history: this.generateHistory()
    });

    this.hideAddMonitorModal();
    document.getElementById('monitors-list').innerHTML = this.renderMonitors();
    this.updateMonitorStats();
    this.initAPICharts();
  }

  toggleMonitorPause(index) {
    this.monitors[index].paused = !this.monitors[index].paused;
    document.getElementById('monitors-list').innerHTML = this.renderMonitors();
    this.initAPICharts();
  }

  deleteMonitor(index) {
    this.monitors.splice(index, 1);
    document.getElementById('monitors-list').innerHTML = this.renderMonitors();
    this.updateMonitorStats();
    this.initAPICharts();
  }

  // FIB Page - Fibonacci Retracement Calculator
  renderFib() {
    return `
      <div class="page-content p-4 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        <!-- Header -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <div>
              <h1 class="text-2xl font-bold text-slate-800 dark:text-white mb-1">Fibonacci Retracement</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">Real-time Fibonacci levels powered by Yahoo Finance API</p>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">Positive</span>
              </div>
              <div class="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">Negative</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Chart Container -->
        <div class="flex-[2] mb-4 relative overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-lg">
          <div class="w-full h-full relative">
            <div id="fib-chart-container" class="h-full w-full rounded-lg bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 overflow-visible"></div>
            
            <!-- Loading State -->
            <div id="fib-loading" class="hidden absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg">
              <div class="text-center">
                <div class="spinner mx-auto mb-4"></div>
                <p class="text-slate-500 dark:text-slate-400 font-medium">Fetching real-time market data...</p>
              </div>
            </div>
            
            <!-- Error State -->
            <div id="fib-error" class="hidden absolute top-4 left-4 right-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800"></div>
          </div>
        </div>

        <!-- Control Panel (Bottom) -->
        <div class="flex-shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-lg max-h-[40vh] overflow-y-auto">
          <!-- Stock Symbol and Action Button Row -->
          <div class="flex flex-col md:flex-row md:items-center gap-3 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div class="flex-1">
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Stock Symbol</label>
              <input type="text" id="fib-symbol" placeholder="Enter symbol (e.g., AAPL)" 
                class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value="AAPL">
            </div>
            <div class="flex items-end">
              <button onclick="app.calculateFibonacci()" class="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30">
                Calculate
              </button>
            </div>
          </div>

          <!-- Quote Info Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div class="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
              <p class="text-sm text-slate-500 dark:text-slate-400 mb-1">Current Price</p>
              <p class="text-2xl font-bold text-slate-800 dark:text-white" id="fib-current-price">--</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
              <p class="text-sm text-slate-500 dark:text-slate-400 mb-1">Change</p>
              <p class="text-2xl font-bold" id="fib-change">--</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
              <p class="text-sm text-slate-500 dark:text-slate-400 mb-1">Anchor High (1.0)</p>
              <p class="text-2xl font-bold text-blue-500" id="fib-high-price">--</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
              <p class="text-sm text-slate-500 dark:text-slate-400 mb-1">Anchor Low (0.0)</p>
              <p class="text-2xl font-bold text-blue-500" id="fib-low-price">--</p>
            </div>
          </div>

          <!-- Fibonacci Levels -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
            <!-- POSITIVE Levels (Blue) -->
            <div class="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
              <div class="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                <h2 class="text-sm font-bold text-blue-600 dark:text-blue-400">Positive Levels</h2>
              </div>
              <div class="overflow-y-auto max-h-[250px] -mr-1 pr-1">
                <div class="space-y-0.5" id="fib-retracement-levels">
                  <div class="text-center py-3 text-slate-400 text-xs">Loading...</div>
                </div>
              </div>
            </div>

            <!-- NEGATIVE Levels (Red) -->
            <div class="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
              <div class="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div class="w-2 h-2 rounded-full bg-red-500"></div>
                <h2 class="text-sm font-bold text-red-600 dark:text-red-400">Negative Levels</h2>
              </div>
              <div class="overflow-y-auto max-h-[250px] -mr-1 pr-1">
                <div class="space-y-0.5" id="fib-extension-levels">
                  <div class="text-center py-3 text-slate-400 text-xs">Loading...</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Info Box -->
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-blue-800 dark:text-blue-300 mb-1">Fibonacci Anchoring</h3>
                <p class="text-sm text-blue-700 dark:text-blue-400"><strong>BULLISH candle:</strong> 0 = Low, 1 = High. <strong>BEARISH candle:</strong> 0 = High, 1 = Low. Levels extend from these anchor points based on the first trading day of the year. Blue levels extend upward (positive), red levels extend downward (negative).</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  initFib() {
    // Fixed precision to 3 decimal points
    this.fibPrecision = 3;
    // Fixed period to YTD only
    this.fibPeriod = 'YTD';
    this.fibSymbol = 'AAPL';

    // Enter key handler
    document.getElementById('fib-symbol').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.calculateFibonacci();
    });

    // Auto-calculate on page load
    this.calculateFibonacci();
  }

  async calculateFibonacci() {
    const symbol = document.getElementById('fib-symbol').value.trim().toUpperCase() || 'AAPL';
    this.fibSymbol = symbol;

    const chartContainer = document.getElementById('fib-chart-container');
    const loadingEl = document.getElementById('fib-loading');
    const errorEl = document.getElementById('fib-error');

    if (chartContainer) chartContainer.style.display = 'block';
    if (loadingEl) {
      loadingEl.classList.remove('hidden');
      loadingEl.style.display = 'flex';
    }
    if (errorEl) {
      errorEl.classList.add('hidden');
      errorEl.style.display = 'none';
    }

    try {
      // Fetch quote and candle data
      const [quote, data] = await Promise.all([
        this.fetchFibQuote(symbol),
        this.fetchFibonacciData(symbol, this.fibPeriod)
      ]);

      this.lastFibData = { ...data, quote };
      this.displayFibonacciResults(this.lastFibData);
      
      // Make container visible BEFORE rendering chart
      if (chartContainer) chartContainer.style.display = 'block';
      
      // Small delay to ensure container is visible and has dimensions
      await new Promise(resolve => setTimeout(resolve, 50));
      
      this.renderFibChart(this.lastFibData);
    } catch (error) {
      console.error('Fibonacci calculation error:', error);
      
      // Check if it's a network/CORS error (proxy server not running)
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
        errorEl.innerHTML = `
          <strong>Proxy Server Not Running</strong><br>
          Please start the Python proxy server:<br>
          <code>python3 server.py</code><br>
          <small>The server will run on port 8080</small>
        `;
      } else {
        errorEl.textContent = `Failed to fetch market data: ${error.message}`;
      }
      if (errorEl) {
        errorEl.classList.remove('hidden');
        errorEl.style.display = 'block';
      }
      
      // Use demo data as fallback only if user wants to see something
      const demoData = this.generateDemoFibData(symbol, this.fibPeriod);
      this.lastFibData = demoData;
      this.displayFibonacciResults(demoData);
      
      // Make container visible BEFORE rendering chart
      if (chartContainer) chartContainer.style.display = 'block';
      
      // Small delay to ensure container is visible
      await new Promise(resolve => setTimeout(resolve, 50));
      
      this.renderFibChart(demoData);
    } finally {
      if (loadingEl) {
        loadingEl.classList.add('hidden');
        loadingEl.style.display = 'none';
      }
    }
  }

  async fetchFibQuote(symbol) {
    try {
      // Use Yahoo Finance proxy - get latest quote from chart data
      const url = `http://localhost:8080/api/quote/${symbol}?period=1d`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Quote fetch failed');
      
      const data = await response.json();
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('No quote data available');
      }
      
      const result = data.chart.result[0];
      const quotes = result.indicators.quote[0];
      const closes = quotes.close.filter(c => c !== null);
      const opens = quotes.open.filter(o => o !== null);
      const highs = quotes.high.filter(h => h !== null);
      const lows = quotes.low.filter(l => l !== null);
      
      const current = closes[closes.length - 1];
      const previousClose = closes[closes.length - 2] || current;
      const change = current - previousClose;
      const changePercent = (change / previousClose) * 100;
      
      return {
        c: current,
        d: change,
        dp: changePercent,
        h: Math.max(...highs),
        l: Math.min(...lows),
        o: opens[opens.length - 1] || current,
        pc: previousClose
      };
    } catch (error) {
      console.warn('Error fetching quote:', error);
      // Return null quote - will be handled by display function
      return null;
    }
  }

  async fetchFibonacciData(symbol, period = 'YTD') {
    try {
      const currentYear = new Date().getFullYear();
      
      // Use Yahoo Finance proxy
      const url = `http://localhost:8080/api/quote/${symbol}?period=${period}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('No data available for this symbol');
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      const quotes = result.indicators.quote[0];
      const timestamps = result.timestamp;
      
      // Find the FIRST TRADING DAY candle of the current year for anchoring
      let firstCandleIdx = -1;
      for (let i = 0; i < timestamps.length; i++) {
        const candleDate = new Date(timestamps[i] * 1000);
        if (candleDate.getFullYear() === currentYear && 
            quotes.open[i] != null && quotes.close[i] != null && 
            quotes.high[i] != null && quotes.low[i] != null) {
          firstCandleIdx = i;
          break;
        }
      }

      if (firstCandleIdx === -1) {
        throw new Error('No data available for current year');
      }

      const firstCandle = {
        open: quotes.open[firstCandleIdx],
        close: quotes.close[firstCandleIdx],
        high: quotes.high[firstCandleIdx],
        low: quotes.low[firstCandleIdx]
      };

      // Determine if FIRST CANDLE is bullish or bearish
      const isBullish = firstCandle.close > firstCandle.open;

      // FIBONACCI ANCHORING:
      // For BULLISH candle: 0 = Low, 1 = High (extending upward)
      // For BEARISH candle: 0 = High, 1 = Low (levels are inverted)
      let fibHigh, fibLow;
      if (isBullish) {
        fibHigh = firstCandle.high;
        fibLow = firstCandle.low;
      } else {
        // Swap for bearish - this inverts the Fibonacci calculation
        fibHigh = firstCandle.low;
        fibLow = firstCandle.high;
      }

      console.log('Fibonacci Anchoring (Yahoo Finance):', {
        firstCandleDate: new Date(timestamps[firstCandleIdx] * 1000).toLocaleDateString(),
        candleType: isBullish ? 'BULLISH' : 'BEARISH',
        actualHigh: firstCandle.high,
        actualLow: firstCandle.low,
        open: firstCandle.open,
        close: firstCandle.close,
        fibonacciHigh: fibHigh,
        fibonacciLow: fibLow,
        note: isBullish ? '0=Low, 1=High' : '0=High, 1=Low'
      });
      
      // Get current price (last valid close)
      let current = quotes.close[quotes.close.length - 1];
      for (let i = quotes.close.length - 1; i >= 0; i--) {
        if (quotes.close[i] != null) {
          current = quotes.close[i];
          break;
        }
      }

      // Convert Yahoo Finance format to our format
      return { 
        symbol: meta.symbol || symbol, 
        current, 
        high: fibHigh,  // Fibonacci-adjusted high
        low: fibLow,    // Fibonacci-adjusted low
        isBullish,
        period,
        firstCandle,
        timestamps: timestamps, 
        candles: { 
          o: quotes.open, 
          h: quotes.high, 
          l: quotes.low, 
          c: quotes.close, 
          v: quotes.volume || [] 
        } 
      };
    } catch (error) {
      console.error('Error fetching Fibonacci data from Yahoo Finance:', error.message);
      throw error; // Re-throw to let caller handle fallback
    }
  }

  generateDemoFibData(symbol, period = 'YTD') {
    // Generate realistic demo data based on symbol
    const symbolPrices = {
      'AAPL': { base: 185, volatility: 12 },
      'TSLA': { base: 245, volatility: 35 },
      'GOOGL': { base: 175, volatility: 10 },
      'MSFT': { base: 420, volatility: 15 },
      'AMZN': { base: 185, volatility: 12 },
      'META': { base: 560, volatility: 20 },
      'NVDA': { base: 135, volatility: 25 },
      'SPY': { base: 580, volatility: 8 },
      'QQQ': { base: 500, volatility: 10 }
    };
    
    const priceConfig = symbolPrices[symbol] || { base: 150 + Math.random() * 100, volatility: 15 };
    const basePrice = priceConfig.base;
    const volatility = priceConfig.volatility;
    
    // Calculate period parameters
    const now = Date.now();
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 2).getTime(); // Jan 2 (first trading day)
    
    const periodMap = {
      '1W': { days: 7, interval: 30 * 60 * 1000 },
      '1M': { days: 30, interval: 60 * 60 * 1000 },
      '3M': { days: 90, interval: 24 * 60 * 60 * 1000 },
      'YTD': { days: Math.floor((now - yearStart) / 86400000), interval: 24 * 60 * 60 * 1000 },
      '1Y': { days: 365, interval: 24 * 60 * 60 * 1000 }
    };
    
    const { days, interval } = periodMap[period] || periodMap['YTD'];
    const count = Math.min(Math.floor(days * 86400000 / interval), 500);
    
    const timestamps = [];
    const candles = { o: [], h: [], l: [], c: [], v: [] };
    
    // Generate price movement starting from beginning of period
    let price = basePrice * (0.9 + Math.random() * 0.1);
    
    for (let i = 0; i < count; i++) {
      const timestamp = Math.floor((yearStart + i * interval) / 1000);
      
      // Skip weekends for daily data
      if (interval >= 86400000) {
        const date = new Date(timestamp * 1000);
        if (date.getDay() === 0 || date.getDay() === 6) continue;
      }
      
      const dailyChange = (Math.random() - 0.48) * (volatility / 15);
      const open = price;
      const close = price * (1 + dailyChange / 100);
      const dayHigh = Math.max(open, close) * (1 + Math.random() * 0.008);
      const dayLow = Math.min(open, close) * (1 - Math.random() * 0.008);
      
      candles.o.push(parseFloat(open.toFixed(2)));
      candles.c.push(parseFloat(close.toFixed(2)));
      candles.h.push(parseFloat(dayHigh.toFixed(2)));
      candles.l.push(parseFloat(dayLow.toFixed(2)));
      candles.v.push(Math.floor(Math.random() * 50000000 + 10000000));
      timestamps.push(timestamp);
      
      price = close;
    }
    
    // Get FIRST CANDLE for Fibonacci anchoring
    const firstCandle = {
      open: candles.o[0],
      close: candles.c[0],
      high: candles.h[0],
      low: candles.l[0]
    };
    
    // Determine if first candle is bullish or bearish
    const isBullish = firstCandle.close > firstCandle.open;
    
    // FIBONACCI ANCHORING from first candle:
    // BULLISH: 0 = Low, 1 = High
    // BEARISH: 0 = High, 1 = Low (swapped)
    let fibHigh, fibLow;
    if (isBullish) {
      fibHigh = firstCandle.high;
      fibLow = firstCandle.low;
    } else {
      fibHigh = firstCandle.low;
      fibLow = firstCandle.high;
    }
    
    const current = candles.c[candles.c.length - 1];
    
    // Generate mock quote
    const quote = {
      c: current,
      d: (Math.random() - 0.5) * 8,
      dp: (Math.random() - 0.5) * 4,
      h: Math.max(...candles.h),
      l: Math.min(...candles.l),
      o: candles.o[candles.o.length - 1],
      pc: candles.c[candles.c.length - 2] || current
    };

    console.log('Demo Fibonacci Anchoring:', {
      firstCandleDate: new Date(timestamps[0] * 1000).toLocaleDateString(),
      candleType: isBullish ? 'BULLISH' : 'BEARISH',
      fibonacciHigh: fibHigh,
      fibonacciLow: fibLow,
      range: fibHigh - fibLow
    });
    
    return { 
      symbol, 
      current, 
      high: fibHigh,  // Fibonacci-adjusted 
      low: fibLow,    // Fibonacci-adjusted
      isBullish, 
      period, 
      firstCandle,
      timestamps, 
      candles, 
      quote 
    };
  }

  displayFibonacciResults(data) {
    const precision = this.fibPrecision;
    const current = data.current;
    
    // For Fibonacci: high and low are already adjusted for bullish/bearish
    // After swapping in fetchFibonacciData:
    // BULLISH: fibHigh = actual high, fibLow = actual low
    // BEARISH: fibHigh = actual low, fibLow = actual high (swapped!)
    // 
    // Formula: price = base + (range * ratio)
    // For BULLISH: base (0.0) = low, 1.0 = high
    // For BEARISH: base (0.0) = high (stored as fibLow), 1.0 = low (stored as fibHigh)
    
    // Get the actual first candle values for display
    const actualFirstHigh = data.firstCandle ? data.firstCandle.high : Math.max(data.high, data.low);
    const actualFirstLow = data.firstCandle ? data.firstCandle.low : Math.min(data.high, data.low);
    
    // Calculate range (always positive)
    // For BULLISH: data.high > data.low, so range = data.high - data.low
    // For BEARISH: data.low > data.high (after swap), so range = data.low - data.high
    const range = Math.abs(data.high - data.low);
    
    // Determine base (0.0 level)
    // For BULLISH: 0.0 = low (data.low)
    // For BEARISH: 0.0 = high (data.low, because high was swapped to low position)
    // So base is always data.low after the swap
    const fibBase = data.low;  // This is the 0.0 level after swap logic

    // Display values - show the FIRST CANDLE high/low (the anchor values)
    const displayHigh = actualFirstHigh; // Always show larger as high
    const displayLow = actualFirstLow;  // Always show smaller as low

    // Update quote cards - always use 3 decimal places
    document.getElementById('fib-current-price').textContent = `$${current.toFixed(3)}`;
    document.getElementById('fib-high-price').textContent = `$${displayHigh.toFixed(3)}`;
    document.getElementById('fib-low-price').textContent = `$${displayLow.toFixed(3)}`;
    
    console.log('Fibonacci Display:', {
      current,
      fibBase,
      range,
      displayHigh,
      displayLow,
      '0.0 level': fibBase,
      '1.0 level': fibBase + range
    });

    // Calculate and display change
    const changeEl = document.getElementById('fib-change');
    if (data.quote) {
      const change = data.quote.d || 0;
      const changePct = data.quote.dp || 0;
      changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(3)} (${changePct.toFixed(2)}%)`;
      changeEl.className = `text-2xl font-bold ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`;
    } else {
      const change = ((current - displayLow) / displayLow) * 100;
      changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
      changeEl.className = `text-2xl font-bold ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`;
    }

    // POSITIVE LEVELS (extending upward from anchor)
    // Formula: price = low + (range * ratio)
    const positiveLevels = [
      { ratio: 0, label: '0.0' },
      { ratio: 0.5, label: '0.5' },
      { ratio: 1, label: '1.0' },
      { ratio: 1.382, label: '1.382' },
      { ratio: 1.618, label: '1.618' },
      { ratio: 2, label: '2.0' },
      { ratio: 2.382, label: '2.382' },
      { ratio: 2.618, label: '2.618' },
      { ratio: 3, label: '3.0' },
      { ratio: 3.618, label: '3.618' },
      { ratio: 4.24, label: '4.24' },
      { ratio: 5.08, label: '5.08' },
      { ratio: 6.86, label: '6.86' },
      { ratio: 11.01, label: '11.01' }
    ];

    // NEGATIVE LEVELS (extending downward from anchor)
    // Formula: price = low + (range * negative_ratio)
    const negativeLevels = [
      { ratio: -0.5, label: '-0.5' },
      { ratio: -1, label: '-1.0' },
      { ratio: -1.382, label: '-1.382' },
      { ratio: -1.618, label: '-1.618' },
      { ratio: -2, label: '-2.0' },
      { ratio: -2.382, label: '-2.382' },
      { ratio: -2.618, label: '-2.618' },
      { ratio: -3, label: '-3.0' },
      { ratio: -3.618, label: '-3.618' },
      { ratio: -4.24, label: '-4.24' },
      { ratio: -5.08, label: '-5.08' },
      { ratio: -6.86, label: '-6.86' },
      { ratio: -11.01, label: '-11.01' }
    ];

    // Render POSITIVE levels with enhanced compact design
    const positiveHtml = positiveLevels.map(l => {
      const price = fibBase + (range * l.ratio);
      const fromCurrent = ((price - current) / current) * 100;
      const fromCurrentClass = fromCurrent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
      const isKeyLevel = l.ratio === 0 || l.ratio === 1;
      const isImportant = l.ratio === 1.618 || l.ratio === 2.618 || l.ratio === 4.24;
      const bgClass = isKeyLevel ? 'bg-blue-50 dark:bg-blue-900/20' : 
                      isImportant ? 'bg-blue-50/50 dark:bg-blue-900/10' : 
                      'hover:bg-slate-50 dark:hover:bg-slate-700/30';
      const borderClass = isKeyLevel ? 'border-l-2 border-blue-500' : 'border-l border-slate-200 dark:border-slate-700';
      const levelWeight = isKeyLevel ? 'font-bold' : isImportant ? 'font-semibold' : 'font-medium';
      
      return `
        <div class="flex items-center gap-2 px-2 py-1.5 ${bgClass} ${borderClass} rounded-r transition-colors cursor-pointer group">
          <span class="text-xs ${levelWeight} text-blue-600 dark:text-blue-400 w-12 flex-shrink-0">${l.label}</span>
          <span class="text-xs font-bold text-slate-800 dark:text-white flex-1 text-right">$${price.toFixed(precision)}</span>
          <span class="text-xs ${fromCurrentClass} w-16 text-right font-medium">${fromCurrent >= 0 ? '+' : ''}${fromCurrent.toFixed(2)}%</span>
        </div>
      `;
    }).join('');
    document.getElementById('fib-retracement-levels').innerHTML = positiveHtml;

    // Render NEGATIVE levels with enhanced compact design
    const negativeHtml = negativeLevels.map(l => {
      const price = fibBase + (range * l.ratio);
      const fromCurrent = ((price - current) / current) * 100;
      const fromCurrentClass = fromCurrent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
      const isKeyLevel = l.ratio === -1;
      const isImportant = l.ratio === -1.618 || l.ratio === -2.618 || l.ratio === -4.24;
      const bgClass = isKeyLevel ? 'bg-red-50 dark:bg-red-900/20' : 
                      isImportant ? 'bg-red-50/50 dark:bg-red-900/10' : 
                      'hover:bg-slate-50 dark:hover:bg-slate-700/30';
      const borderClass = isKeyLevel ? 'border-l-2 border-red-500' : 'border-l border-slate-200 dark:border-slate-700';
      const levelWeight = isKeyLevel ? 'font-bold' : isImportant ? 'font-semibold' : 'font-medium';
      
      return `
        <div class="flex items-center gap-2 px-2 py-1.5 ${bgClass} ${borderClass} rounded-r transition-colors cursor-pointer group">
          <span class="text-xs ${levelWeight} text-red-600 dark:text-red-400 w-12 flex-shrink-0">${l.label}</span>
          <span class="text-xs font-bold text-slate-800 dark:text-white flex-1 text-right">$${price.toFixed(precision)}</span>
          <span class="text-xs ${fromCurrentClass} w-16 text-right font-medium">${fromCurrent >= 0 ? '+' : ''}${fromCurrent.toFixed(2)}%</span>
        </div>
      `;
    }).join('');
    document.getElementById('fib-extension-levels').innerHTML = negativeHtml;

    // Store for chart rendering
    this.fibCalculation = { 
      fibHigh: displayHigh, 
      fibLow: displayLow, 
      fibBase: fibBase,
      range: range, 
      current: current 
    };
  }

  renderFibChart(data) {
    const container = document.getElementById('fib-chart-container');
    if (!container) return;

    if (!data || !data.candles || !data.timestamps || data.timestamps.length === 0) {
      container.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400">No chart data available</div>';
      return;
    }

    // Use the Fibonacci-adjusted high/low
    // After swap logic in fetchFibonacciData:
    // BULLISH: data.high = actual high, data.low = actual low
    // BEARISH: data.high = actual low, data.low = actual high (swapped!)
    // 
    // For BULLISH: 0.0 = low, 1.0 = high, so price = low + (range * ratio)
    // For BEARISH: 0.0 = high, 1.0 = low, so price = high - (range * ratio)
    // 
    // Since for bearish we swapped: fibLow = actual high, fibHigh = actual low
    // For bearish: price = fibLow - (range * ratio) = fibLow + (range * -ratio)
    // But we want to use the same formula, so we need range to be negative for bearish
    // OR we use: price = fibLow + (range * ratio) where range is (fibLow - fibHigh) for bearish
    
    // Base (0.0 level) is always data.low after swap logic
    const fibBase = data.low;  // This is the 0.0 level
    // Range is always positive: max - min
    const range = Math.abs(data.high - data.low);

    // Prepare candlestick data for ApexCharts
    const chartData = data.timestamps.map((time, i) => ({
      x: new Date(time * 1000),
      y: [data.candles.o[i], data.candles.h[i], data.candles.l[i], data.candles.c[i]]
    })).filter(d => d.y.every(v => v != null));

    // POSITIVE Fibonacci levels (BLUE) - extending upward
    const positiveLevels = [
      { ratio: 0, label: '0.0' },
      { ratio: 1, label: '1.0' },
      { ratio: 1.618, label: '1.618' },
      { ratio: 2.618, label: '2.618' },
      { ratio: 4.24, label: '4.24' }
    ];

    // NEGATIVE Fibonacci levels (RED) - extending downward  
    const negativeLevels = [
      { ratio: -0.5, label: '-0.5' },
      { ratio: -1, label: '-1.0' },
      { ratio: -1.618, label: '-1.618' },
      { ratio: -2.618, label: '-2.618' },
      { ratio: -4.24, label: '-4.24' }
    ];

    // Create y-axis annotations for ALL Fibonacci levels
    const yaxisAnnotations = [];

    // Add POSITIVE levels (BLUE) - extending upward with better styling
    positiveLevels.forEach(l => {
      const price = fibBase + (range * l.ratio);
      const isKeyLevel = l.ratio === 0 || l.ratio === 1;
      yaxisAnnotations.push({
        y: price,
        borderColor: '#3b82f6', // Blue
        strokeWidth: isKeyLevel ? 2.5 : 1.5,
        strokeDashArray: isKeyLevel ? 0 : 6,
        opacity: isKeyLevel ? 0.9 : 0.7,
        label: {
          borderColor: '#3b82f6',
          style: {
            color: '#fff',
            background: '#3b82f6',
            fontSize: isKeyLevel ? '11px' : '10px',
            fontWeight: isKeyLevel ? 'bold' : 'normal',
            padding: { left: 6, right: 6, top: 3, bottom: 3 }
          },
          text: `${l.label}: $${price.toFixed(3)}`,
          position: 'right',
          offsetX: 10
        }
      });
    });

    // Add NEGATIVE levels (RED) - extending downward with better styling
    negativeLevels.forEach(l => {
      const price = fibBase + (range * l.ratio);
      const isKeyLevel = l.ratio === -1;
      yaxisAnnotations.push({
        y: price,
        borderColor: '#ef4444', // Red
        strokeWidth: isKeyLevel ? 2.5 : 1.5,
        strokeDashArray: 6,
        opacity: isKeyLevel ? 0.9 : 0.7,
        label: {
          borderColor: '#ef4444',
          style: {
            color: '#fff',
            background: '#ef4444',
            fontSize: isKeyLevel ? '11px' : '10px',
            fontWeight: isKeyLevel ? 'bold' : 'normal',
            padding: { left: 6, right: 6, top: 3, bottom: 3 }
          },
          text: `${l.label}: $${price.toFixed(3)}`,
          position: 'right',
          offsetX: 10
        }
      });
    });

    const isDark = this.isDarkMode;
    const options = {
      series: [{ 
        name: data.symbol, 
        data: chartData 
      }],
      chart: { 
        type: 'candlestick', 
        height: 600,
        fontFamily: 'Inter, system-ui, sans-serif',
        toolbar: { 
          show: true,
          offsetX: 0,
          offsetY: 0,
          tools: { 
            download: true, 
            selection: true, 
            zoom: true, 
            zoomin: true, 
            zoomout: true, 
            pan: true, 
            reset: true 
          },
          autoSelected: 'pan',
          export: {
            csv: { filename: `${data.symbol}_fibonacci_ytd` },
            svg: { filename: `${data.symbol}_fibonacci_ytd` },
            png: { filename: `${data.symbol}_fibonacci_ytd` }
          }
        }, 
        background: 'transparent',
        animations: { 
          enabled: true, 
          easing: 'easeinout',
          speed: 800,
          animateGradually: { enabled: true, delay: 150 }
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: true,
          zoomedArea: {
            fill: {
              color: isDark ? '#3b82f6' : '#60a5fa',
              opacity: 0.2
            },
            stroke: {
              color: '#3b82f6',
              opacity: 0.6,
              width: 2
            }
          }
        },
        pan: {
          enabled: true,
          type: 'x',
          limits: {
            x: {
              min: undefined,  // Allow panning to the left
              max: undefined   // Allow panning far to the right
            }
          }
        },
        selection: {
          enabled: true,
          type: 'x',
          fill: {
            color: isDark ? '#3b82f6' : '#60a5fa',
            opacity: 0.15
          },
          stroke: {
            width: 2,
            dashArray: 5,
            color: '#3b82f6',
            opacity: 0.6
          }
        }
      },
      title: {
        text: `${data.symbol} - Fibonacci Retracement Analysis (YTD)`,
        align: 'left',
        margin: 10,
        offsetX: 0,
        offsetY: 0,
        floating: false,
        style: { 
          fontSize: '16px',
          fontWeight: '600',
          color: isDark ? '#f1f5f9' : '#1e293b',
          fontFamily: 'Inter, system-ui, sans-serif'
        }
      },
      subtitle: {
        text: 'First Trading Day Anchor | Real-time Market Data',
        align: 'left',
        margin: 5,
        offsetX: 0,
        offsetY: 25,
        floating: false,
        style: {
          fontSize: '12px',
          fontWeight: '400',
          color: isDark ? '#94a3b8' : '#64748b',
          fontFamily: 'Inter, system-ui, sans-serif'
        }
      },
      xaxis: { 
        type: 'datetime',
        labels: { 
          style: { 
            colors: isDark ? '#94a3b8' : '#64748b',
            fontSize: '11px',
            fontWeight: '500'
          },
          datetimeFormatter: { 
            year: 'yyyy', 
            month: "MMM 'yy", 
            day: 'dd MMM', 
            hour: 'HH:mm' 
          },
          offsetY: 0
        },
        axisBorder: {
          show: true,
          color: isDark ? '#475569' : '#cbd5e1',
          offsetX: 0,
          offsetY: 0
        },
        axisTicks: {
          show: true,
          color: isDark ? '#475569' : '#cbd5e1'
        },
        floating: false
      },
      yaxis: { 
        labels: { 
          style: { 
            colors: isDark ? '#94a3b8' : '#64748b',
            fontSize: '11px',
            fontWeight: '600'
          }, 
          formatter: (val) => '$' + val.toFixed(3),
          offsetX: 0,
          offsetY: 0
        },
        tooltip: { enabled: true },
        axisBorder: {
          show: true,
          color: isDark ? '#475569' : '#cbd5e1',
          offsetX: 0,
          offsetY: 0
        },
        axisTicks: {
          show: true,
          color: isDark ? '#475569' : '#cbd5e1'
        },
        floating: false,
        opposite: false
      },
      grid: { 
        borderColor: isDark ? '#475569' : '#e2e8f0',
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: true
          }
        },
        yaxis: {
          lines: {
            show: true
          }
        },
        padding: {
          top: 10,
          right: 120,  // Increased right padding to make room for Fibonacci labels
          bottom: 10,
          left: 10
        }
      },
      plotOptions: { 
        candlestick: { 
          colors: { 
            upward: '#10b981', 
            downward: '#ef4444' 
          }, 
          wick: { 
            useFillColor: true 
          }
        } 
      },
      tooltip: { 
        theme: isDark ? 'dark' : 'light',
        style: {
          fontSize: '12px',
          fontFamily: 'Inter, system-ui, sans-serif'
        },
        x: {
          format: 'dd MMM yyyy'
        },
        custom: function({ seriesIndex, dataPointIndex, w }) {
          const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
          const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex];
          const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex];
          const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex];
          const change = c - o;
          const changePct = ((change / o) * 100).toFixed(2);
          const changeColor = change >= 0 ? '#10b981' : '#ef4444';
          return `
            <div class="apexcharts-tooltip-candlestick p-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
              <div class="font-semibold text-slate-800 dark:text-white mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">Candlestick Data</div>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between"><span class="text-slate-600 dark:text-slate-400">Open:</span><span class="font-semibold text-slate-800 dark:text-white">$${o.toFixed(3)}</span></div>
                <div class="flex justify-between"><span class="text-slate-600 dark:text-slate-400">High:</span><span class="font-semibold text-emerald-500">$${h.toFixed(3)}</span></div>
                <div class="flex justify-between"><span class="text-slate-600 dark:text-slate-400">Low:</span><span class="font-semibold text-red-500">$${l.toFixed(3)}</span></div>
                <div class="flex justify-between"><span class="text-slate-600 dark:text-slate-400">Close:</span><span class="font-semibold text-slate-800 dark:text-white">$${c.toFixed(3)}</span></div>
                <div class="flex justify-between pt-1 mt-1 border-t border-slate-200 dark:border-slate-700">
                  <span class="text-slate-600 dark:text-slate-400">Change:</span>
                  <span class="font-semibold" style="color: ${changeColor}">${change >= 0 ? '+' : ''}$${change.toFixed(3)} (${changePct}%)</span>
                </div>
              </div>
            </div>
          `;
        }
      },
      annotations: {
        yaxis: yaxisAnnotations
      },
      legend: {
        show: false
      }
    };

    // Destroy existing chart
    if (this.charts.fibChart) {
      this.charts.fibChart.destroy();
    }

    // Create new chart
    this.charts.fibChart = new ApexCharts(container, options);
    this.charts.fibChart.render().then(() => {
      // After chart renders, ensure we can pan to see all current price candles
      // The increased right padding (120px) provides space for Fibonacci labels
      if (chartData.length > 0) {
        const lastDate = chartData[chartData.length - 1].x;
        const firstDate = chartData[0].x;
        const totalRange = lastDate.getTime() - firstDate.getTime();
        
        // Initially show the last 70% of data (focus on recent/current price candles)
        const initialStartTime = lastDate.getTime() - (totalRange * 0.7);
        
        setTimeout(() => {
          // Zoom to show recent data initially
          this.charts.fibChart.zoomX(initialStartTime, lastDate.getTime());
          
          // Ensure panning allows going all the way to the right
          this.charts.fibChart.updateOptions({
            chart: {
              pan: {
                enabled: true,
                type: 'x',
                limits: {
                  x: {
                    min: undefined,
                    max: undefined  // Allow panning far to the right to see all current candles
                  }
                }
              }
            }
          }, false, false, false);
        }, 300);
      }
    });
  }

  // Settings Page
  renderSettings() {
    return `
      <div class="page-content p-6">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-slate-800 dark:text-white mb-2">Settings</h1>
          <p class="text-slate-500 dark:text-slate-400">Manage your account and preferences.</p>
        </div>

        <div class="max-w-2xl space-y-6">
          <!-- Profile Section -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-6">Profile Information</h2>
            <div class="flex items-center gap-6 mb-6">
              <div class="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-violet-500/30">JD</div>
              <div>
                <button class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Change Avatar</button>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">First Name</label>
                <input type="text" value="John" class="input-field w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Last Name</label>
                <input type="text" value="Doe" class="input-field w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none">
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                <input type="email" value="john.doe@example.com" class="input-field w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none">
              </div>
            </div>
            <button class="btn-primary mt-6 px-6 py-3 rounded-xl text-white font-semibold">Save Changes</button>
          </div>

          <!-- Notifications -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-6">Notifications</h2>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-800 dark:text-white">Email Notifications</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">Receive email updates about your account</p>
                </div>
                <button class="relative w-12 h-6 bg-emerald-500 rounded-full transition-colors duration-300 focus:outline-none">
                  <span class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md transform transition-transform translate-x-6"></span>
                </button>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-800 dark:text-white">Push Notifications</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">Receive push notifications on your device</p>
                </div>
                <button class="relative w-12 h-6 bg-slate-300 dark:bg-slate-600 rounded-full transition-colors duration-300 focus:outline-none">
                  <span class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md transform transition-transform"></span>
                </button>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-800 dark:text-white">SMS Alerts</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">Get SMS alerts for critical updates</p>
                </div>
                <button class="relative w-12 h-6 bg-emerald-500 rounded-full transition-colors duration-300 focus:outline-none">
                  <span class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md transform transition-transform translate-x-6"></span>
                </button>
              </div>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
            <h2 class="text-lg font-bold text-red-600 dark:text-red-400 mb-4">Danger Zone</h2>
            <p class="text-sm text-red-600/70 dark:text-red-400/70 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
            <button class="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors">Delete Account</button>
          </div>
        </div>
      </div>
    `;
  }

  initSettings() {
    // Settings page initialization
  }

  // Real-time Updates
  startRealtimeUpdates() {
    setInterval(() => {
      if (this.currentPage === 'dashboard') {
        this.updateDashboardStats();
      } else if (this.currentPage === 'api') {
        this.updateAPIMonitors();
      }
    }, 30000);
  }

  updateDashboardStats() {
    const revenueEl = document.getElementById('stat-revenue');
    const usersEl = document.getElementById('stat-users');
    const ordersEl = document.getElementById('stat-orders');

    if (revenueEl) {
      const newRevenue = 48574 + Math.floor(Math.random() * 500);
      revenueEl.textContent = '$' + newRevenue.toLocaleString();
      revenueEl.classList.add('update-flash');
      setTimeout(() => revenueEl.classList.remove('update-flash'), 500);
    }
  }

  updateAPIMonitors() {
    this.monitors.forEach(m => {
      if (!m.paused) {
        m.responseTime = Math.round(m.responseTime * (0.9 + Math.random() * 0.2));
        m.history.shift();
        m.history.push(m.responseTime);
        
        if (m.responseTime < 1000) m.status = 'up';
        else if (m.responseTime < 5000) m.status = 'degraded';
        else m.status = 'down';
      }
    });
    document.getElementById('monitors-list').innerHTML = this.renderMonitors();
    this.updateMonitorStats();
    this.initAPICharts();
  }
}

// Initialize App
const app = new PrelineDashboard();

