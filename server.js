const express = require('express');
const { shopifyApi, ApiVersion } = require('@shopify/shopify-api');
const fetch = require('node-fetch');
const cors = require('cors');
const bodyParser = require('body-parser');
const winston = require('winston');
const path = require('path');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || '8b8f6832a14491d703b6df9ceea75070',
  apiSecretKey: process.env.SHOPIFY_API_SECRET || '0f76d5deee01b8a10195090084cdbae5',
  scopes: ['read_products', 'write_products', 'read_orders', 'write_orders'],
  hostName: process.env.HOST?.replace(/https?:\/\//, '') || 'vat-exempt.onrender.com',
  apiVersion: ApiVersion.January24,
  isEmbeddedApp: true,
  fetchApi: fetch
});

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/api/auth', async (req, res) => {
  try {
    const authRoute = await shopify.auth.begin({
      shop: req.query.shop,
      callbackPath: '/api/auth/callback',
      isOnline: false,
    });
    res.redirect(authRoute);
  } catch (error) {
    logger.error('Auth error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/callback', async (req, res) => {
  try {
    const session = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });
    res.redirect('/');
  } catch (error) {
    logger.error('Auth callback error:', error);
    res.status(500).send('Authentication callback failed');
  }
});

// VAT Validation Endpoint
app.post('/api/validate-vat', async (req, res) => {
  try {
    const { vatId } = req.body;
    // TODO: Implement VAT validation logic
    res.json({ valid: true, message: 'VAT ID is valid' });
  } catch (error) {
    logger.error('VAT validation error:', error);
    res.status(500).json({ error: 'VAT validation failed' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
}); 