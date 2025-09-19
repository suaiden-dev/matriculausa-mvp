import { Configuration } from '@azure/msal-browser';
import { RedirectRequest } from '@azure/msal-browser';
// MSAL configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
    secureCookies: false,
  },
  system: {
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0: // Error
            console.error(`MSAL Error: ${message}`);
            break;
          case 1: // Warning
            console.warn(`MSAL Warning: ${message}`);
            break;
          case 2: // Info
            console.info(`MSAL Info: ${message}`);
            break;
          case 3: // Verbose
            console.log(`MSAL Verbose: ${message}`);
            break;
        }
      },
      piiLoggingEnabled: false
    }
  },
};

// Add scopes here for ID token to be used at Microsoft identity platform endpoints.
export const loginRequest: RedirectRequest = {
  scopes: ['User.Read', 'Mail.Read', 'Mail.Send', 'Mail.ReadWrite', 'offline_access'],
  prompt: 'select_account'
};

// Add the endpoints here for Microsoft Graph API services you'd like to use.
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphMailEndpoint: 'https://graph.microsoft.com/v1.0/me/messages',
};

export const graphScopes = import.meta.env.VITE_GRAPH_SCOPES?.split(',') || [
  'User.Read',
  'Mail.Read',
  'Mail.Send',
  'Mail.ReadWrite',
  'offline_access'
];
