import React from 'react';
import { useMsal } from '@azure/msal-react';
import useMsalUtils from '../hooks/useMsalUtils';

const MsalDebugPanel = () => {
  const { instance, accounts } = useMsal();
  const { clearCache, getDebugInfo, logoutAll } = useMsalUtils();
  const [debugInfo, setDebugInfo] = React.useState(null);

  const handleGetDebugInfo = () => {
    const info = getDebugInfo();
    setDebugInfo(info);
    console.log('MSAL Debug Info:', info);
  };

  const handleClearCache = async () => {
    const success = await clearCache();
    if (success) {
      alert('Cache cleared successfully! Please refresh the page.');
    } else {
      alert('Error clearing cache. Check console for details.');
    }
  };

  const handleLogout = async () => {
    if (confirm('This will logout all Microsoft accounts. Continue?')) {
      await logoutAll();
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-4 max-w-md z-50">
      <h4 className="font-bold text-yellow-800 mb-2">MSAL Debug Panel</h4>
      
      <div className="space-y-2">
        <button
          onClick={handleGetDebugInfo}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
        >
          Get Debug Info
        </button>
        
        <button
          onClick={handleClearCache}
          className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
        >
          Clear Cache
        </button>
        
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
        >
          Logout All
        </button>
      </div>

      {debugInfo && (
        <div className="mt-3 text-xs">
          <div><strong>Accounts:</strong> {debugInfo.accounts}</div>
          <div><strong>Active:</strong> {debugInfo.activeAccount}</div>
          <div><strong>Client ID:</strong> {debugInfo.clientId?.substring(0, 8)}...</div>
          <div><strong>Redirect:</strong> {debugInfo.redirectUri}</div>
        </div>
      )}

      <div className="mt-2 text-xs text-yellow-700">
        <div>Environment: {process.env.NODE_ENV}</div>
        <div>Accounts in cache: {accounts.length}</div>
      </div>
    </div>
  );
};

export default MsalDebugPanel;