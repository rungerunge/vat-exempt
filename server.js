const express = require('express');
const { shopifyApi, LATEST_API_VERSION, LogSeverity } = require('@shopify/shopify-api');
require('@shopify/shopify-api/adapters/node');
const cors = require('cors');
const bodyParser = require('body-parser');
const winston = require('winston');
const path = require('path');
const crypto = require('crypto');

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
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  logger: {
    level: LogSeverity.Info,
    httpRequests: true,
    timestamps: true,
  },
});

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Shopify auth middleware
const validateShop = (shop) => {
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  return shopRegex.test(shop);
};

// OAuth routes
app.get('/', (req, res) => {
  const { shop } = req.query;
  if (!shop || !validateShop(shop)) {
    res.status(400).send('Invalid shop parameter');
    return;
  }
  res.redirect(`/api/auth?shop=${shop}`);
});

app.get('/api/auth', async (req, res) => {
  try {
    const { shop } = req.query;

    if (!shop || !validateShop(shop)) {
      res.status(400).send('Invalid shop parameter');
      return;
    }

    // Generate and store nonce
    const nonce = crypto.randomBytes(16).toString('hex');
    
    const authRoute = await shopify.auth.begin({
      shop,
      callbackPath: '/api/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    res.redirect(authRoute);
  } catch (error) {
    logger.error('Auth error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/callback', async (req, res) => {
  try {
    const { shop } = req.query;

    if (!shop || !validateShop(shop)) {
      res.status(400).send('Invalid shop parameter');
      return;
    }

    const session = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    // After successful auth, redirect to app with shop parameter
    const redirectUrl = `/?shop=${shop}`;
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Auth callback error:', error);
    res.status(500).send('Authentication callback failed');
  }
});

// Verify session middleware
const verifySession = async (req, res, next) => {
  try {
    const bearerToken = req.headers.authorization?.match(/Bearer (.*)/)?.[1];
    if (!bearerToken) {
      res.status(401).send('Unauthorized');
      return;
    }

    const session = await shopify.session.decodeSessionToken(bearerToken);
    if (!session) {
      res.status(401).send('Unauthorized');
      return;
    }
    req.shopifySession = session;
    next();
  } catch (error) {
    logger.error('Session verification error:', error);
    res.status(401).send('Unauthorized');
  }
};

// Protected routes
app.get('/api/shop-info', verifySession, async (req, res) => {
  try {
    const client = new shopify.clients.Rest({
      session: req.shopifySession,
    });
    const response = await client.get({
      path: 'shop',
    });
    res.json(response.body);
  } catch (error) {
    logger.error('Shop info error:', error);
    res.status(500).json({ error: 'Failed to fetch shop info' });
  }
});

// VAT Validation Endpoint
app.post('/api/validate-vat', verifySession, async (req, res) => {
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