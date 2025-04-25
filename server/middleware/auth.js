import { Shopify } from '@shopify/shopify-api';

export default function applyAuthMiddleware(app) {
  app.get('/api/auth', async (req, res) => {
    if (!req.query.shop) {
      res.status(500);
      return res.send("No shop provided");
    }

    if (!req.signedCookies[app.get('top-level-oauth-cookie')]) {
      return res.redirect(`/api/auth/toplevel?shop=${req.query.shop}`);
    }

    try {
      const authRoute = await Shopify.Auth.beginAuth({
        shop: req.query.shop,
        redirectPath: '/api/auth/callback',
        isOnline: true,
        rawRequest: req,
        rawResponse: res,
      });

      return res.redirect(authRoute);
    } catch (e) {
      console.warn(e);
      res.status(500);
      return res.send(e.message);
    }
  });

  app.get('/api/auth/toplevel', (req, res) => {
    const { shop } = req.query;

    if (!shop) {
      res.status(500);
      return res.send("No shop provided");
    }

    res.cookie(app.get('top-level-oauth-cookie'), '1', {
      signed: true,
      httpOnly: true,
      sameSite: 'strict',
    });

    res.set('Content-Type', 'text/html');

    res.send(topLevelAuthRedirect({ apiKey: Shopify.Context.API_KEY, shop }));
  });

  app.get('/api/auth/callback', async (req, res) => {
    try {
      const session = await Shopify.Auth.validateAuthCallback(
        req,
        res,
        req.query
      );

      const host = req.query.host;
      const shop = session.shop;

      // Redirect to app with shop parameter upon auth
      res.redirect(`/?shop=${shop}&host=${host}`);
    } catch (e) {
      console.warn(e);
      const shop = req.query.shop;
      res.redirect(`/api/auth?shop=${shop}`);
    }
  });
}

function topLevelAuthRedirect({ apiKey, shop }) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
        <script>
          document.addEventListener('DOMContentLoaded', function () {
            var AppBridge = window['app-bridge'];
            var createApp = AppBridge.default;
            var Redirect = AppBridge.actions.Redirect;

            const app = createApp({
              apiKey: '${apiKey}',
              shop: '${shop}',
            });

            const redirect = Redirect.create(app);
            redirect.dispatch(Redirect.Action.REMOTE, '/api/auth');
          });
        </script>
      </head>
      <body></body>
    </html>
  `;
} 