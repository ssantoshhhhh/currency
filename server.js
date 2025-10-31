const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database('./currency.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    createTables();
  }
});

// Create tables
function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    currency TEXT,
    source TEXT,
    buy_price REAL,
    sell_price REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    currency TEXT UNIQUE,
    data TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Currency sources
const SOURCES = {
  ARS: [
    { name: 'Ambito', url: 'https://www.ambito.com/contenidos/dolar.html' },
    { name: 'DolarHoy', url: 'https://www.dolarhoy.com' },
    { name: 'Cronista', url: 'https://www.cronista.com/MercadosOnline/moneda.html?id=ARSB' }
  ],
  BRL: [
    { name: 'Wise', url: 'https://wise.com/es/currency-converter/brl-to-usd-rate' },
    { name: 'Nubank', url: 'https://nubank.com.br/taxas-conversao/' },
    { name: 'Nomad Global', url: 'https://www.nomadglobal.com' }
  ]
};

// Scrape functions for each source
async function scrapeAmbito() {
  try {
    // Simulated data for demonstration with random variation
    const baseBuy = 905.50;
    const baseSell = 915.50;
    const variation = (Math.random() - 0.5) * 2; // Random between -1 and 1

    const buyPrice = Math.round((baseBuy + variation) * 100) / 100;
    const sellPrice = Math.round((baseSell + variation) * 100) / 100;

    return { buy_price: buyPrice, sell_price: sellPrice };
  } catch (error) {
    console.error('Error scraping Ambito:', error);
    return { buy_price: 0, sell_price: 0 };
  }
}

async function scrapeDolarHoy() {
  try {
    // Simulated data for demonstration with random variation
    const baseBuy = 900.00;
    const baseSell = 920.00;
    const variation = (Math.random() - 0.5) * 4; // Random between -2 and 2

    const buyPrice = Math.round((baseBuy + variation) * 100) / 100;
    const sellPrice = Math.round((baseSell + variation) * 100) / 100;

    return { buy_price: buyPrice, sell_price: sellPrice };
  } catch (error) {
    console.error('Error scraping DolarHoy:', error);
    return { buy_price: 0, sell_price: 0 };
  }
}

async function scrapeCronista() {
  try {
    // Simulated data for demonstration with random variation
    const baseBuy = 910.00;
    const baseSell = 925.00;
    const variation = (Math.random() - 0.5) * 6; // Random between -3 and 3

    const buyPrice = Math.round((baseBuy + variation) * 100) / 100;
    const sellPrice = Math.round((baseSell + variation) * 100) / 100;

    return { buy_price: buyPrice, sell_price: sellPrice };
  } catch (error) {
    console.error('Error scraping Cronista:', error);
    return { buy_price: 0, sell_price: 0 };
  }
}

async function scrapeWise() {
  try {
    // Simulated data for demonstration with random variation
    const baseBuy = 5.20;
    const baseSell = 5.30;
    const variation = (Math.random() - 0.5) * 0.1; // Random between -0.05 and 0.05

    const buyPrice = Math.round((baseBuy + variation) * 100) / 100;
    const sellPrice = Math.round((baseSell + variation) * 100) / 100;

    return { buy_price: buyPrice, sell_price: sellPrice };
  } catch (error) {
    console.error('Error scraping Wise:', error);
    return { buy_price: 0, sell_price: 0 };
  }
}

async function scrapeNubank() {
  try {
    // Simulated data for demonstration with random variation
    const baseBuy = 5.15;
    const baseSell = 5.25;
    const variation = (Math.random() - 0.5) * 0.1; // Random between -0.05 and 0.05

    const buyPrice = Math.round((baseBuy + variation) * 100) / 100;
    const sellPrice = Math.round((baseSell + variation) * 100) / 100;

    return { buy_price: buyPrice, sell_price: sellPrice };
  } catch (error) {
    console.error('Error scraping Nubank:', error);
    return { buy_price: 0, sell_price: 0 };
  }
}

async function scrapeNomad() {
  try {
    // Simulated data for demonstration with random variation
    const baseBuy = 5.18;
    const baseSell = 5.28;
    const variation = (Math.random() - 0.5) * 0.1; // Random between -0.05 and 0.05

    const buyPrice = Math.round((baseBuy + variation) * 100) / 100;
    const sellPrice = Math.round((baseSell + variation) * 100) / 100;

    return { buy_price: buyPrice, sell_price: sellPrice };
  } catch (error) {
    console.error('Error scraping Nomad:', error);
    return { buy_price: 0, sell_price: 0 };
  }
}

// Fetch quotes for a currency
async function fetchQuotes(currency) {
  const sources = SOURCES[currency];
  if (!sources) {
    throw new Error(`Currency ${currency} not supported`);
  }

  const quotes = [];

  for (const source of sources) {
    let prices = { buy_price: 0, sell_price: 0 };

    switch (source.name) {
      case 'Ambito':
        prices = await scrapeAmbito();
        break;
      case 'DolarHoy':
        prices = await scrapeDolarHoy();
        break;
      case 'Cronista':
        prices = await scrapeCronista();
        break;
      case 'Wise':
        prices = await scrapeWise();
        break;
      case 'Nubank':
        prices = await scrapeNubank();
        break;
      case 'Nomad Global':
        prices = await scrapeNomad();
        break;
    }

    quotes.push({
      buy_price: prices.buy_price,
      sell_price: prices.sell_price,
      source: source.url
    });

    // Store in database
    db.run(`INSERT INTO quotes (currency, source, buy_price, sell_price) VALUES (?, ?, ?, ?)`,
      [currency, source.url, prices.buy_price, prices.sell_price]);
  }

  return quotes;
}

// Check cache
function getCachedData(currency) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT data, timestamp FROM cache WHERE currency = ?`, [currency], (err, row) => {
      if (err) {
        reject(err);
      } else if (row) {
        const now = new Date();
        const cacheTime = new Date(row.timestamp);
        const diff = (now - cacheTime) / 1000; // seconds

        if (diff < 1) { // 1 second cache for demonstration
          resolve(JSON.parse(row.data));
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

// Set cache
function setCache(currency, data) {
  const dataStr = JSON.stringify(data);
  db.run(`INSERT OR REPLACE INTO cache (currency, data, timestamp) VALUES (?, ?, datetime('now'))`,
    [currency, dataStr]);
}

// API Endpoints

// GET /welcome
app.get('/welcome', (req, res) => {
  // Log request metadata
  console.log(`Request received: ${req.method} ${req.path}`);
  // Return JSON response
  res.json({ message: 'Welcome to the Currency Exchange API!' });
});

// GET /quotes
app.get('/quotes', async (req, res) => {
  try {
    const currency = req.query.currency || 'BRL'; // Default to BRL

    // Fetch fresh data (no cache for demo)
    const quotes = await fetchQuotes(currency);

    res.json(quotes);
  } catch (error) {
    console.error('Error in /quotes:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /average
app.get('/average', async (req, res) => {
  try {
    const currency = req.query.currency || 'BRL';

    let data = await getCachedData(currency);

    if (!data) {
      const quotes = await fetchQuotes(currency);
      const average = calculateAverage(quotes);
      const slippage = calculateSlippage(quotes, average);

      data = { quotes, average, slippage };
      setCache(currency, data);
    }

    res.json(data.average);
  } catch (error) {
    console.error('Error in /average:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /slippage
app.get('/slippage', async (req, res) => {
  try {
    const currency = req.query.currency || 'BRL';

    let data = await getCachedData(currency);

    if (!data) {
      const quotes = await fetchQuotes(currency);
      const average = calculateAverage(quotes);
      const slippage = calculateSlippage(quotes, average);

      data = { quotes, average, slippage };
      setCache(currency, data);
    }

    res.json(data.slippage);
  } catch (error) {
    console.error('Error in /slippage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function calculateAverage(quotes) {
  const sum = quotes.reduce((acc, quote) => ({
    buy: acc.buy + quote.buy_price,
    sell: acc.sell + quote.sell_price
  }), { buy: 0, sell: 0 });

  return {
    average_buy_price: sum.buy / quotes.length,
    average_sell_price: sum.sell / quotes.length
  };
}

function calculateSlippage(quotes, average) {
  return quotes.map(quote => {
    const buySlippage = ((quote.buy_price - average.average_buy_price) / average.average_buy_price) * 100;
    const sellSlippage = ((quote.sell_price - average.average_sell_price) / average.average_sell_price) * 100;

    return {
      buy_price_slippage: buySlippage,
      sell_price_slippage: sellSlippage,
      source: quote.source
    };
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
