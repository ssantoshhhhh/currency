/**
 * Currency Exchange Dashboard Frontend
 * Connects to backend API for real-time data
 */

// ==================== CONFIGURATION ====================

const API_BASE_URL = window.location.origin; // Use same origin as frontend

// ==================== STATE MANAGEMENT ====================

const appState = {
  currentCurrency: 'BRL',
  autoRefreshTimer: null
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Safely converts a price value to a number
 */
function safeParsePrice(value) {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(/,/g, '.').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Safely formats a number to fixed decimal places
 */
function safeToFixed(value, decimals = 2) {
  const num = safeParsePrice(value);
  return num.toFixed(decimals);
}

// ==================== API FUNCTIONS ====================

/**
 * Fetches quotes from the backend API
 */
async function fetchQuotes(currency) {
  const response = await fetch(`${API_BASE_URL}/quotes?currency=${currency}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch quotes: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Fetches average from the backend API
 */
async function fetchAverage(currency) {
  const response = await fetch(`${API_BASE_URL}/average?currency=${currency}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch average: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Fetches slippage from the backend API
 */
async function fetchSlippage(currency) {
  const response = await fetch(`${API_BASE_URL}/slippage?currency=${currency}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch slippage: ${response.statusText}`);
  }
  return await response.json();
}

// ==================== UI RENDERING ====================

/**
 * Renders the quotes table
 */
function renderQuotes(quotes) {
  const tbody = document.getElementById('quotesTableBody');
  tbody.innerHTML = '';

  quotes.forEach(quote => {
    const buyPrice = safeParsePrice(quote.buy_price);
    const sellPrice = safeParsePrice(quote.sell_price);
    const spread = sellPrice - buyPrice;

    // Extract source name from URL
    const sourceName = getSourceName(quote.source);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="source-name">${sourceName}</span></td>
      <td><span class="price">${formatPrice(buyPrice, appState.currentCurrency)}</span></td>
      <td><span class="price">${formatPrice(sellPrice, appState.currentCurrency)}</span></td>
      <td><span class="spread">${formatPrice(spread, appState.currentCurrency)}</span></td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Renders the average prices
 */
function renderAverage(average) {
  document.getElementById('avgBuyPrice').textContent = formatPrice(average.average_buy_price, appState.currentCurrency);
  document.getElementById('avgSellPrice').textContent = formatPrice(average.average_sell_price, appState.currentCurrency);
}

/**
 * Renders the slippage table
 */
function renderSlippage(slippageData) {
  const tbody = document.getElementById('slippageTableBody');
  tbody.innerHTML = '';

  slippageData.forEach(item => {
    const sourceName = getSourceName(item.source);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="source-name">${sourceName}</span></td>
      <td>${formatSlippage(item.buy_price_slippage)}</td>
      <td>${formatSlippage(item.sell_price_slippage)}</td>
      <td>${formatSlippage((item.buy_price_slippage + item.sell_price_slippage) / 2)}</td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Formats slippage with color coding
 */
function formatSlippage(value) {
  const numValue = safeParsePrice(value);
  const sign = numValue >= 0 ? '+' : '';
  const className = numValue > 0.5 ? 'slippage--positive' :
                    numValue < -0.5 ? 'slippage--negative' :
                    'slippage--neutral';
  return `<span class="slippage ${className}">${sign}${safeToFixed(numValue, 2)}%</span>`;
}

/**
 * Formats price based on currency
 */
function formatPrice(price, currency) {
  const numPrice = safeParsePrice(price);
  if (isNaN(numPrice)) {
    return '0.00';
  }

  if (currency === 'ARS') {
    return numPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    return numPrice.toFixed(2);
  }
}

/**
 * Extracts source name from URL
 */
function getSourceName(url) {
  const urlMap = {
    'https://www.ambito.com/contenidos/dolar.html': 'Ambito',
    'https://www.dolarhoy.com': 'DolarHoy',
    'https://www.cronista.com/MercadosOnline/moneda.html?id=ARSB': 'Cronista',
    'https://wise.com/es/currency-converter/brl-to-usd-rate': 'Wise',
    'https://nubank.com.br/taxas-conversao/': 'Nubank',
    'https://www.nomadglobal.com': 'Nomad Global'
  };
  return urlMap[url] || url;
}

/**
 * Updates the last update timestamp
 */
function updateTimestamp() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  document.getElementById('lastUpdateTime').textContent = timeString;
}

// ==================== DATA LOADING ====================

/**
 * Loads all data and updates the UI
 */
async function loadData() {
  const loadingState = document.getElementById('loadingState');
  const mainContent = document.getElementById('mainContent');
  const errorState = document.getElementById('errorState');
  const refreshBtn = document.getElementById('refreshBtn');

  // Show loading state
  loadingState.classList.remove('hidden');
  mainContent.classList.add('hidden');
  errorState.classList.add('hidden');
  refreshBtn.disabled = true;

  try {
    // Fetch all data in parallel
    const [quotes, average, slippage] = await Promise.all([
      fetchQuotes(appState.currentCurrency),
      fetchAverage(appState.currentCurrency),
      fetchSlippage(appState.currentCurrency)
    ]);

    // Render all sections
    renderQuotes(quotes);
    renderAverage(average);
    renderSlippage(slippage);
    updateTimestamp();

    // Show main content
    loadingState.classList.add('hidden');
    mainContent.classList.remove('hidden');

    console.log(`Successfully loaded ${appState.currentCurrency} data`);
  } catch (error) {
    console.error('Error loading data:', error);

    // Show error state
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    document.getElementById('errorMessage').textContent = error.message || 'An error occurred while fetching exchange rates.';
  } finally {
    refreshBtn.disabled = false;
  }
}

// ==================== EVENT HANDLERS ====================

/**
 * Handles currency toggle
 */
function handleCurrencyToggle(event) {
  const button = event.target.closest('.btn--toggle');
  if (!button) return;

  const currency = button.dataset.currency;
  if (currency === appState.currentCurrency) return;

  // Update active state
  document.querySelectorAll('.btn--toggle').forEach(btn => {
    btn.classList.remove('active');
  });
  button.classList.add('active');

  // Update state and reload data
  appState.currentCurrency = currency;
  console.log(`Switching to ${currency}...`);
  loadData();
}

/**
 * Handles manual refresh
 */
function handleRefresh() {
  loadData();
}

/**
 * Sets up auto-refresh timer
 */
function setupAutoRefresh() {
  // Clear existing timer
  if (appState.autoRefreshTimer) {
    clearInterval(appState.autoRefreshTimer);
  }

  // Set up new timer (every 30 seconds)
  appState.autoRefreshTimer = setInterval(() => {
    console.log('Auto-refreshing data...');
    loadData();
  }, 30000);
}

// ==================== INITIALIZATION ====================

/**
 * Initializes the application
 */
function init() {
  console.log('Initializing Currency Exchange Dashboard...');

  // Set up event listeners
  document.querySelector('.toggle-buttons').addEventListener('click', handleCurrencyToggle);
  document.getElementById('refreshBtn').addEventListener('click', handleRefresh);

  // Load initial data
  loadData();

  // Set up auto-refresh
  setupAutoRefresh();

  console.log('Application initialized successfully');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
