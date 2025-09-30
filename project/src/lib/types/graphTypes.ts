/**
 * Tipos para Microsoft Graph API
 */

export interface GraphEmail {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
  body?: {
    content: string;
    contentType: string;
  };
}

export interface GraphMailFolder {
  id: string;
  displayName: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
}

export interface GraphUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
}

export interface GraphResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

export interface GraphError {
  error: {
    code: string;
    message: string;
    innerError?: {
      'request-id': string;
      date: string;
    };
  };
}
