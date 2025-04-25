import React from 'react';
import { AppProvider, Page, Card, Layout } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import '@shopify/polaris/build/esm/styles.css';

const App = () => {
  return (
    <AppBridgeProvider
      config={{
        apiKey: process.env.SHOPIFY_API_KEY,
        host: new URLSearchParams(window.location.search).get('host'),
        forceRedirect: true,
      }}
    >
      <AppProvider i18n={{}}>
        <Page>
          <Layout>
            <Layout.Section>
              <Card title="VAT Exemption Settings" sectioned>
                <p>Configure your VAT exemption settings here.</p>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </AppProvider>
    </AppBridgeProvider>
  );
};

export default App; 