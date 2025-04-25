import express from 'express';
import { validateVAT } from '../services/vat.js';
import { Shopify } from '@shopify/shopify-api';

export const vatRouter = express.Router();

// Validate VAT number
vatRouter.post('/validate', async (req, res) => {
  try {
    const { vatNumber } = req.body;
    const result = await validateVAT(vatNumber);
    res.json(result);
  } catch (error) {
    console.error('VAT validation error:', error);
    res.status(500).json({ error: 'Failed to validate VAT number' });
  }
});

// Update cart attributes with VAT info
vatRouter.post('/update-cart', async (req, res) => {
  try {
    const { shop, accessToken } = req.shopifySession;
    const { cartToken, vatNumber, isValid } = req.body;

    const client = new Shopify.Clients.Rest(shop, accessToken);

    // Update cart attributes
    await client.post({
      path: 'cart/update',
      data: {
        token: cartToken,
        attributes: {
          VAT_ID: vatNumber,
          VAT_Validated: isValid ? 'Yes' : 'No'
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Cart update error:', error);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// Get app settings
vatRouter.get('/settings', async (req, res) => {
  try {
    const { shop, accessToken } = req.shopifySession;
    const client = new Shopify.Clients.Rest(shop, accessToken);

    // Get metafields containing app settings
    const response = await client.get({
      path: 'metafields',
      query: {
        namespace: 'vat_exempt',
        key: 'settings'
      }
    });

    const settings = response.body.metafields[0]?.value
      ? JSON.parse(response.body.metafields[0].value)
      : {
          enabled: true,
          vatFieldLabel: 'VAT Number',
          validationMessage: 'VAT number is valid',
          errorMessage: 'Invalid VAT number'
        };

    res.json(settings);
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update app settings
vatRouter.post('/settings', async (req, res) => {
  try {
    const { shop, accessToken } = req.shopifySession;
    const settings = req.body;

    const client = new Shopify.Clients.Rest(shop, accessToken);

    // Update settings metafield
    await client.post({
      path: 'metafields',
      data: {
        metafield: {
          namespace: 'vat_exempt',
          key: 'settings',
          value: JSON.stringify(settings),
          type: 'json'
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}); 