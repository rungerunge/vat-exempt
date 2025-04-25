import express from 'express';
import crypto from 'crypto';
import { validateVAT } from '../services/vat.js';

export const proxyRouter = express.Router();

// Verify proxy signature
function verifyProxy(req, res, next) {
  const { signature } = req.query;

  const queryParams = Object.keys(req.query)
    .filter(key => key !== 'signature')
    .sort()
    .map(key => `${key}=${req.query[key]}`)
    .join('');

  const calculatedSignature = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(queryParams)
    .digest('hex');

  if (calculatedSignature === signature) {
    next();
  } else {
    res.status(401).json({ error: 'Invalid signature' });
  }
}

// Proxy endpoint for VAT validation
proxyRouter.post('/validate-vat', verifyProxy, async (req, res) => {
  try {
    const { vatNumber } = req.body;
    const result = await validateVAT(vatNumber);
    res.json(result);
  } catch (error) {
    console.error('Proxy VAT validation error:', error);
    res.status(500).json({ error: 'Failed to validate VAT number' });
  }
}); 