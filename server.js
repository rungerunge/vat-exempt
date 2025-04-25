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

// In-memory session storage (replace with proper storage in production)
const sessions = new Map();

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
  sessionStorage: {
    storeSession: async (session) => {
      logger.info('Storing session:', session.id);
      sessions.set(session.id, JSON.stringify(session));
      return true;
    },
    loadSession: async (id) => {
      logger.info('Loading session:', id);
      const session = sessions.get(id);
      if (session) {
        return JSON.parse(session);
      }
      return undefined;
    },
    deleteSession: async (id) => {
      logger.info('Deleting session:', id);
      sessions.delete(id);
      return true;
    },
  },
});

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Shopify auth middleware
const validateShop = (shop) => {
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  return shopRegex.test(shop);
};

// Ensure authenticated middleware
const ensureAuthenticated = async (req, res, next) => {
  try {
    const { shop } = req.query;

    if (!shop || !validateShop(shop)) {
      logger.error('Invalid shop parameter:', shop);
      res.status(400).send('Invalid shop parameter');
      return;
    }

    // Check if we have an active session
    const session = await shopify.session.getCurrentSession(req, res);
    
    if (!session) {
      logger.info('No session found, redirecting to auth');
      res.redirect(`/api/auth?shop=${shop}`);
      return;
    }

    req.shopifySession = session;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.redirect(`/api/auth?shop=${shop}`);
  }
};

// Routes
app.get('/', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files after auth check
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/auth', async (req, res) => {
  try {
    const { shop } = req.query;

    if (!shop || !validateShop(shop)) {
      logger.error('Invalid shop parameter:', shop);
      res.status(400).send('Invalid shop parameter');
      return;
    }

    // Generate and store nonce
    const nonce = crypto.randomBytes(16).toString('hex');
    
    const authRoute = await shopify.auth.begin({
      shop,
      callbackPath: '/api/auth/callback',
      isOnline: true,
      rawRequest: req,
      rawResponse: res,
    });

    logger.info('Redirecting to auth route:', authRoute);
    res.redirect(authRoute);
  } catch (error) {
    logger.error('Auth error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/callback', async (req, res) => {
  try {
    logger.info('Received callback with query params:', req.query);
    const { shop } = req.query;

    if (!shop || !validateShop(shop)) {
      logger.error('Invalid shop parameter in callback:', shop);
      res.status(400).send('Invalid shop parameter');
      return;
    }

    // Complete the OAuth process
    const session = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    // Save session
    await shopify.session.storeSession(session);
    logger.info('Session stored successfully:', session.id);

    // Redirect back to app with shop parameter
    const redirectUrl = `/?shop=${shop}&host=${req.query.host}`;
    logger.info('Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Auth callback error:', error);
    res.status(500).send('Authentication callback failed: ' + error.message);
  }
});

// Protected routes
app.get('/api/shop-info', ensureAuthenticated, async (req, res) => {
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
app.post('/api/validate-vat', ensureAuthenticated, async (req, res) => {
  try {
    const { vatId } = req.body;
    // TODO: Implement VAT validation logic
    res.json({ valid: true, message: 'VAT ID is valid' });
  } catch (error) {
    logger.error('VAT validation error:', error);
    res.status(500).json({ error: 'VAT validation failed' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
}); 