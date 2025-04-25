import { Shopify } from '@shopify/shopify-api';

export function setupGDPRWebHooks(app) {
  /*
    * Customers' data request
    */
  app.post('/api/webhooks/customers/data_request', async (req, res) => {
    try {
      await Shopify.Webhooks.Registry.process(req, res);
      console.log('Customers data request webhook processed');
    } catch (error) {
      console.log('Failed to process customers data request webhook:', error);
      if (!res.headersSent) {
        res.status(500).send(error.message);
      }
    }
  });

  /*
    * Customers' data deletion request
    */
  app.post('/api/webhooks/customers/redact', async (req, res) => {
    try {
      await Shopify.Webhooks.Registry.process(req, res);
      console.log('Customers redact webhook processed');
    } catch (error) {
      console.log('Failed to process customers redact webhook:', error);
      if (!res.headersSent) {
        res.status(500).send(error.message);
      }
    }
  });

  /*
    * Shop deletion request
    */
  app.post('/api/webhooks/shop/redact', async (req, res) => {
    try {
      await Shopify.Webhooks.Registry.process(req, res);
      console.log('Shop redact webhook processed');
    } catch (error) {
      console.log('Failed to process shop redact webhook:', error);
      if (!res.headersSent) {
        res.status(500).send(error.message);
      }
    }
  });
} 