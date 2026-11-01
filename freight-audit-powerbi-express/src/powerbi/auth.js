'use strict';
// MSAL is initialized only in live mode. Its cache is managed by the application instance.
function createPowerBiTokenProvider(settings, Cca) {
  const ConfidentialClientApplication = Cca || require('@azure/msal-node').ConfidentialClientApplication;
  const app = new ConfidentialClientApplication({
    auth: {
      clientId: settings.clientId,
      authority: `https://login.microsoftonline.com/${settings.tenantId}`,
      clientSecret: settings.clientSecret
    }
  });
  return async () => {
    const token = await app.acquireTokenByClientCredential({
      scopes:['https://analysis.windows.net/powerbi/api/.default']
    });
    if (!token?.accessToken) { const error=new Error('Token unavailable'); error.code='TOKEN_UNAVAILABLE'; throw error; }
    return token.accessToken;
  };
}
module.exports = { createPowerBiTokenProvider };
