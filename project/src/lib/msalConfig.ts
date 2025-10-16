import { Configuration } from '@azure/msal-browser';
import { RedirectRequest } from '@azure/msal-browser';

// MSAL configuration for Web applications (not SPA)
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || (typeof window !== 'undefined' ? `${window.location.origin}/microsoft-email` : 'http://localhost:5173/microsoft-email'),
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
    navigateToLoginRequestUrl: false,
    knownAuthorities: ['https://login.microsoftonline.com/common'],
    cloudDiscoveryMetadata: '',
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true,
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

// Login request for Web applications
export const loginRequest: RedirectRequest = {
  scopes: ['User.Read', 'Mail.Read', 'Mail.Send', 'Mail.ReadWrite', 'offline_access'],
  prompt: 'select_account',
  // Para aplicações Web, não especificar responseType e responseMode
  // O MSAL vai usar o fluxo de código de autorização automaticamente
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
