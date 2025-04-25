# VAT Exemption App for Shopify

This app allows merchants to validate EU VAT IDs and apply tax exemptions for B2B customers.

## Features

- Real-time VAT ID validation
- Automatic tax exemption for valid EU B2B customers
- Merchant dashboard for configuration
- Embedded app experience

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the app:
   ```bash
   npm run build
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

The following environment variables are required:

- `SHOPIFY_API_KEY`: Your app's API key
- `SHOPIFY_API_SECRET`: Your app's API secret
- `HOST`: Your app's host URL
- `PORT`: Server port (default: 3000)

## Deployment

This app is configured for automatic deployment to Render.com. The deployment process is handled through GitHub.

1. Push your code to GitHub
2. Connect your repository to Render
3. Set up the environment variables in Render
4. Deploy!

## Development

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Start production server

## License

ISC 