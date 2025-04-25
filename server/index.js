import { join } from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { Shopify, ApiVersion } from '@shopify/shopify-api';
import 'dotenv/config';
import applyAuthMiddleware from './middleware/auth.js';
import verifyRequest from './middleware/verify-request.js';
import { setupGDPRWebHooks } from './gdpr.js';
import { redis } from './redis.js';
import { setupAppSession } from './session.js';
import { proxyRouter } from './routes/proxy.js';
import { vatRouter } from './routes/vat.js';

const USE_ONLINE_TOKENS = true;
const TOP_LEVEL_OAUTH_COOKIE = 'shopify_top_level_oauth';

const PORT = parseInt(process.env.PORT || '8081', 10);
const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD;

const versionedApiVersion = ApiVersion.April23; // Use latest stable version

// Initialize Shopify context
Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY || '',
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET || '',
  SCOPES: process.env.SCOPES?.split(',') || [
    'read_products',
    'write_products',
    'read_orders',
    'write_orders',
    'read_script_tags',
    'write_script_tags'
  ],
  HOST_NAME: process.env.HOST?.replace(/https?:\/\//, '') || '',
  HOST_SCHEME: process.env.HOST?.split('://')[0] || 'https',
  API_VERSION: versionedApiVersion,
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: setupAppSession(redis),
});

// Initialize Express
const app = express();

// Set up webhooks
setupGDPRWebHooks(app);

// Set up middleware
app.use(cookieParser(Shopify.Context.API_SECRET_KEY));

// Set up proxy routes (for storefront)
app.use('/apps/proxy', proxyRouter);

// Set up static and proxy middleware
app.use(express.json());

// Set up auth middleware
applyAuthMiddleware(app);

// Set up API endpoints
app.use('/api/vat', verifyRequest(app), vatRouter);

// Handle 404s
app.use((req, res, next) => {
  const { shop } = req.query;
  if (!shop) {
    res.status(404).send("No shop provided");
    return;
  }
  next();
});

// All endpoints after this point will have access to a request.body
// If you want to parse the body before the proxy middleware processes it,
// you must do it before this line is reached:
app.use("/api/*", verifyRequest(app));

app.use((req, res, next) => {
  const shop = Shopify.Utils.sanitizeShop(req.query.shop);
  if (!shop) {
    res.status(500).send("No shop provided");
    return;
  }
  res.setHeader(
    "Content-Security-Policy",
    `frame-ancestors https://${shop} https://admin.shopify.com;`
  );
  next();
});

if (isTest) {
  app.use(express.static(process.cwd() + "/frontend/"));
} else {
  app.use(express.static(join(process.cwd(), "dist")));
}

app.use("/*", async (req, res, next) => {
  if (typeof req.query.shop !== "string") {
    res.status(500);
    return res.send("No shop provided");
  }

  const shop = Shopify.Utils.sanitizeShop(req.query.shop);
  if (!shop) {
    res.status(500);
    return res.send("Invalid shop provided");
  }

  const appInstalled = await Shopify.OAuth.isShopActive(shop);

  if (!appInstalled && !req.originalUrl.match(/^\/exitiframe/i)) {
    res.redirect(`/api/auth?shop=${shop}`);
    return;
  }

  if (Shopify.Context.IS_EMBEDDED_APP && req.query.embedded !== "1") {
    const embeddedUrl = Shopify.Utils.getEmbeddedAppUrl(req);
    res.redirect(embeddedUrl + req.path);
    return;
  }

  const htmlFile = join(
    process.cwd(),
    isTest ? "frontend" : "dist",
    "index.html"
  );

  return res.sendFile(htmlFile);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 