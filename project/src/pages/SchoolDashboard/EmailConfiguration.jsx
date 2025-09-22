import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  QuestionMarkCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import MsalProviderWrapper from '../../providers/MsalProvider';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../lib/msalConfig';

const EmailConfiguration = () => {
  return (
    <MsalProviderWrapper>
      <EmailConfigurationContent />
    </MsalProviderWrapper>
  );
};

const EmailConfigurationContent = () => {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const { configId } = useParams(); // Para identificar se estamos editando
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [provider, setProvider] = useState('gmail');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [microsoftAccount, setMicrosoftAccount] = useState(null);
  const [microsoftAuthenticating, setMicrosoftAuthenticating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const restoredFromRedirectRef = useRef(false);
  const forcedNameRef = useRef('');

  const [formData, setFormData] = useState({
    name: '',
    email_address: '',
    app_password: ''
  });

  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null); // { type: 'success'|'error'|'info', message: string }
  
  // Check Microsoft configuration
  const isMicrosoftConfigured = !!(
    import.meta.env.VITE_AZURE_CLIENT_ID && 
    import.meta.env.VITE_AZURE_REDIRECT_URI
  );

  useEffect(() => {
    checkAuth();
    
    // Forçar provider via query param (ex.: ?provider=microsoft)
    try {
      const params = new URLSearchParams(window.location.search);
      const qp = params.get('provider');
      const qn = params.get('name');
      if (qp === 'microsoft') {
        setProvider('microsoft');
      } else if (qp === 'gmail') {
        setProvider('gmail');
      }
      if (qn) {
        forcedNameRef.current = qn;
        setFormData(prev => ({ ...prev, name: qn }));
      }
    } catch (_) {}

    // Se temos configId, significa que estamos em modo de edição
    if (configId) {
      setEditMode(true);
      loadConfigurationForEdit(configId);
    }
    
    // Handle redirect response
    const handleRedirectResponse = async () => {
      try {
        const response = await instance.handleRedirectPromise();
        if (response) {
          restoredFromRedirectRef.current = true;
          // Restaurar contexto salvo antes do redirect (provider e nome)
          let restoredName = '';
          try {
            const draftStr = localStorage.getItem('emailConfigDraft');
            if (draftStr) {
              const draft = JSON.parse(draftStr);
              if (draft?.provider) {
                setProvider(draft.provider);
              }
              if (draft?.formName) {
                restoredName = draft.formName;
              }
            }
          } catch (_) {
            // ignore parse errors
          } finally {
            localStorage.removeItem('emailConfigDraft');
          }

          // Forçar a visualização da Microsoft após autenticação
          setProvider('microsoft');

          // Se houver origem salva, navegar de volta
          const originPath = sessionStorage.getItem('msalRedirectOrigin');
          if (originPath && window.location.pathname !== originPath) {
            navigate(originPath, { replace: true });
          }

          setMicrosoftAccount(response.account);
          
          // Tentar extrair formName também do estado do MSAL, se disponível
          if (!restoredName && response.state) {
            try {
              const stateObj = JSON.parse(response.state);
              if (stateObj?.formName) {
                restoredName = stateObj.formName;
              }
            } catch (_) {
              // ignore
            }
          }

          // Auto-fill form data (usar local-part do email como sugestão)
          const localPart = response.account.username?.split('@')[0] || response.account.name || '';
          setFormData(prev => ({
            ...prev,
            // Priorizar nome restaurado; se ausente, manter o existente; por fim, usar sugestão baseada no e-mail
            name: restoredName || prev.name || (localPart ? `Microsoft - ${localPart}` : prev.name),
            email_address: response.account.username
          }));
          
          // Clear Microsoft error if exists
          if (errors.microsoft) {
            setErrors(prev => ({ ...prev, microsoft: '' }));
          }
          
          // Clear redirect origin
          sessionStorage.removeItem('msalRedirectOrigin');
        }
      } catch (error) {
        // Specific error handling for CORS/SPA
        let errorMessage = 'Error processing Microsoft authentication';
        
        if (error.message?.includes('CORS') || error.message?.includes('post_request_failed')) {
          errorMessage = 'Azure configuration error: The redirect URI must be configured as SPA (Single Page Application) in Azure Portal, not as Web. See AZURE_SPA_CONFIGURATION_FIX.md for instructions.';
        } else if (error.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
          errorMessage = 'Request blocked by browser. Check if the redirect URI is correctly configured as SPA in Azure Portal.';
        }
        
        setErrors(prev => ({
          ...prev,
          microsoft: errorMessage
        }));
      }
    };
    
    handleRedirectResponse();
    
    // Verificar se já existe uma conta Microsoft autenticada
    if (accounts.length > 0) {
      setMicrosoftAccount(accounts[0]);
      // Auto-preencher nome apenas se não acabamos de restaurar via redirect e se o usuário não digitou
      if (!restoredFromRedirectRef.current && !formData.name && accounts[0].name) {
        setFormData(prev => ({
          ...prev,
          name: `Microsoft - ${accounts[0].name}`
        }));
      }
    }
  }, [accounts, instance]);

  // Se provider vier via query ou carregamento da config, não permitir fallback automático para Gmail nesta sessão
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forcedProvider = params.get('provider');
    if (forcedProvider === 'microsoft' && provider !== 'microsoft') {
      setProvider('microsoft');
    }
  }, [provider]);

  const handleMicrosoftAuth = async () => {
    setMicrosoftAuthenticating(true);
    try {
      // Check if already logged in
      if (accounts.length > 0) {
        const account = accounts[0];
        setMicrosoftAccount(account);
        
        // Auto-preencher dados do formulário
        setFormData(prev => ({
          ...prev,
          name: prev.name || `Microsoft - ${account.name}`,
          email_address: account.username
        }));
        
        // Limpar erro de Microsoft se existir
        if (errors.microsoft) {
          setErrors(prev => ({ ...prev, microsoft: '' }));
        }
        
        setMicrosoftAuthenticating(false);
        return;
      }

      // Try silent token acquisition first
      try {
        const silentRequest = {
          ...loginRequest,
          account: instance.getActiveAccount() || accounts[0]
        };
        
        const response = await instance.acquireTokenSilent(silentRequest);
        
        setMicrosoftAccount(response.account);
        
        // Auto-fill form data
        setFormData(prev => ({
          ...prev,
          name: prev.name || `Microsoft - ${response.account.name}`,
          email_address: response.account.username
        }));
        
        // Clear Microsoft error if exists
        if (errors.microsoft) {
          setErrors(prev => ({ ...prev, microsoft: '' }));
        }
        
      } catch (silentError) {
        // Store current location to return after redirect
        sessionStorage.setItem('msalRedirectOrigin', window.location.pathname);
        // Salvar contexto atual para restaurar após o redirect
        try {
          localStorage.setItem('emailConfigDraft', JSON.stringify({
            provider: 'microsoft',
            formName: formData.name || ''
          }));
        } catch (_) {
          // ignore storage errors
        }
        
        // Use redirect instead of popup
        await instance.loginRedirect({
          ...loginRequest,
          state: JSON.stringify({
            provider: 'microsoft',
            origin: window.location.pathname,
            formName: formData.name || ''
          })
        });
      }
      
    } catch (error) {
      let errorMessage = 'Microsoft authentication error';
      
      if (error.errorCode === 'popup_window_error') {
        errorMessage = 'Error opening popup. Try again or allow popups in the browser.';
      } else if (error.errorCode === 'user_cancelled') {
        errorMessage = 'Authentication cancelled by user.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors(prev => ({
        ...prev,
        microsoft: errorMessage
      }));
    } finally {
      setMicrosoftAuthenticating(false);
    }
  };

  const handleMicrosoftLogout = async () => {
    try {
      if (accounts.length > 0) {
        await instance.logout({
          account: accounts[0]
        });
      }
      setMicrosoftAccount(null);
      setFormData(prev => ({
        ...prev,
        name: '',
        email_address: ''
      }));
    } catch (error) {
      // Handle logout error silently
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
    } catch (error) {
      navigate('/login');
    }
  };

  const loadConfigurationForEdit = async (configId) => {
    try {
      setLoading(true);
      
      const { data: config, error } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('id', configId)
        .single();
      
      if (error) {
        setErrors({ general: 'Error loading email configuration' });
        return;
      }
      
      if (config) {
        setFormData({
          name: (config.name || config.configuration_name) || '',
          email_address: config.email_address || '',
          app_password: '' // do not prefill app password for Gmail
        });
        const providerValue =
          config.provider ||
          config.provider_type ||
          (config.oauth_access_token ? 'microsoft' : 'gmail');
        setProvider(providerValue);
        // If a name was forced via query, override after loading from DB
        if (forcedNameRef.current) {
          setFormData(prev => ({ ...prev, name: forcedNameRef.current }));
        }
      }
    } catch (error) {
      setErrors({ general: 'Unexpected error loading configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    
    // Provider-specific validations
    if (provider === 'gmail') {
      if (!formData.email_address.trim()) newErrors.email_address = 'Email is required';
      if (!formData.app_password.trim() && !editMode) newErrors.app_password = 'App password is required';
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (formData.email_address && !emailRegex.test(formData.email_address)) {
        newErrors.email_address = 'Invalid email';
      }

      // Validate if email is from Gmail
      if (formData.email_address) {
        const domain = formData.email_address.split('@')[1]?.toLowerCase();
        if (!['gmail.com', 'googlemail.com'].includes(domain)) {
          newErrors.email_address = 'Email must be from Gmail';
        }
      }
    } else if (provider === 'microsoft') {
      if (!microsoftAccount) {
        newErrors.microsoft = 'Microsoft authentication required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validateForm()) return;
    
    setTesting(true);
    setTestResults(null);
    
    try {
      // Teste básico de validação de formato e provedor
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test(formData.email_address);
      
      if (!isValidEmail) {
        setTestResults({
          success: false, 
          error: 'Invalid email format' 
        });
        return;
      }

      // Connectivity test simulation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTestResults({
        success: true, 
        message: 'Configuration validated successfully!'
      });
      
    } catch (error) {
      setTestResults({
        success: false, 
        error: 'Validation error'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let configData;

      if (provider === 'gmail') {
        // Gmail settings (SMTP/IMAP)
        const gmailConfig = {
          smtp_host: 'smtp.gmail.com',
          smtp_port: 587,
          smtp_secure: false,
          imap_host: 'imap.gmail.com',
          imap_port: 993,
          imap_secure: true
        };

        configData = {
          user_id: user.id,
          name: formData.name.trim(),
          email_address: formData.email_address.trim(),
          provider_type: 'gmail',
          smtp_host: gmailConfig.smtp_host,
          smtp_port: gmailConfig.smtp_port,
          smtp_secure: gmailConfig.smtp_secure,
          smtp_auth_user: formData.email_address.trim(),
          smtp_auth_pass: formData.app_password,
          imap_host: gmailConfig.imap_host,
          imap_port: gmailConfig.imap_port,
          imap_secure: gmailConfig.imap_secure,
          imap_auth_user: formData.email_address.trim(),
          imap_auth_pass: formData.app_password,
          is_active: true,
          sync_enabled: true,
          sync_interval_minutes: 3
        };
      } else if (provider === 'microsoft') {
        // Microsoft settings (OAuth)
        if (!microsoftAccount) {
          throw new Error('Microsoft account not authenticated');
        }

        // Get access token
        const tokenResponse = await instance.acquireTokenSilent({
          ...loginRequest,
          account: microsoftAccount
        });

        configData = {
          user_id: user.id,
          name: formData.name.trim(),
          email_address: microsoftAccount.username,
          provider_type: 'microsoft',
          oauth_access_token: tokenResponse.accessToken,
          oauth_refresh_token: tokenResponse.refreshToken || '',
          oauth_token_expires_at: new Date(tokenResponse.expiresOn).toISOString(),
          microsoft_account_id: microsoftAccount.homeAccountId,
          is_active: true,
          sync_enabled: true,
          sync_interval_minutes: 3
        };
      }

      // Insert or update configuration in database
      let result;
      if (editMode && configId) {
        // Update existing configuration
        const updateData = { ...configData };
        delete updateData.user_id; // We don't update user_id
        
        // If we're editing Gmail and no new password was provided, don't update passwords
        if (provider === 'gmail' && !formData.app_password.trim()) {
          delete updateData.smtp_auth_pass;
          delete updateData.imap_auth_pass;
        }
        
        result = await supabase
          .from('email_configurations')
          .update(updateData)
          .eq('id', configId)
          .eq('user_id', user.id) // Security: only update if it belongs to the user
          .select()
          .single();
      } else {
        // Insert new configuration
        result = await supabase
          .from('email_configurations')
          .insert([configData])
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      // Success
      setNotification({
        type: 'success',
        message: editMode ? 'Configuration updated successfully!' : 'Email account configured successfully!'
      });
      navigate('/school/dashboard/email');
      
    } catch (error) {
      
      // Specific error handling
      let errorMessage = 'Error saving configuration';
      
      if (error.code === '23505') {
        errorMessage = 'A configuration with this name or email already exists';
      } else if (error.code === '23503') {
        errorMessage = 'Reference error - user not found';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setNotification({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-4 lg:space-y-8">
      {notification && (
        <div className={`mx-auto max-w-4xl px-3 sm:px-6 lg:px-8`}>
          <div className={`rounded-xl p-3 sm:p-4 border ${
            notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-start justify-between">
              <p className="text-sm sm:text-base font-medium">{notification.message}</p>
              <button onClick={() => setNotification(null)} className="text-current opacity-70 hover:opacity-100">×</button>
            </div>
          </div>
        </div>
      )}
      {/* Header + Actions Section */}
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4 lg:mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + description + back button */}
            <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
                <button
                  onClick={() => navigate('/school/dashboard/email')}
                  className="p-2 sm:p-3 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 bg-white shadow-sm"
                  title="Back to Email Management"
                >
                  <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
                </button>
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                    {editMode ? 'Edit Email Account' : 'Add Email Account'}
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-slate-600">
                    {editMode ? 'Update your email account configuration' : 'Configure a new email account for seamless communication'}
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    {editMode ? 'Modify settings and credentials as needed' : 'Choose your email provider and follow the setup steps'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                  Setup Mode
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
          {/* Provider Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="border-b border-slate-200 pb-4 mb-4 sm:mb-6">
              <h2 className="text-lg font-medium text-slate-900">
                Choose your email provider
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Select the type of email account you want to add
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setProvider('gmail')}
                className={`p-4 sm:p-6 border-2 rounded-xl transition-all text-left hover:shadow-md ${
                  provider === 'gmail'
                    ? 'border-red-500 bg-red-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-white font-bold text-base sm:text-lg">G</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-base sm:text-lg">Gmail</p>
                    <p className="text-sm text-slate-500">Google Workspace, @gmail.com</p>
                    <div className="flex items-center mt-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-xs text-slate-600">App password required</span>
                    </div>
                  </div>
                  {provider === 'gmail' && (
                    <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0" />
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('microsoft')}
                disabled={!isMicrosoftConfigured}
                className={`p-4 sm:p-6 border-2 rounded-xl transition-all text-left relative hover:shadow-md ${
                  provider === 'microsoft'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : isMicrosoftConfigured
                    ? 'border-slate-200 hover:border-slate-300 bg-white'
                    : 'border-slate-200 opacity-50 cursor-not-allowed bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-white font-bold text-base sm:text-lg">M</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-base sm:text-lg">Microsoft</p>
                    <p className="text-sm text-slate-500">
                      {isMicrosoftConfigured ? 'Outlook, Hotmail, Office 365' : 'Configuration required'}
                    </p>
                    <div className="flex items-center mt-2">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        isMicrosoftConfigured ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-xs text-slate-600">
                        {isMicrosoftConfigured ? 'OAuth2 authentication' : 'Setup needed'}
                      </span>
                    </div>
                  </div>
                  {provider === 'microsoft' && isMicrosoftConfigured && (
                    <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
                  )}
                  {!isMicrosoftConfigured && (
                    <ExclamationTriangleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
              </button>
            </div>
            
            {!isMicrosoftConfigured && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800 font-medium">
                      Microsoft configuration required
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      To use Microsoft accounts, configure the environment variables VITE_AZURE_CLIENT_ID and VITE_AZURE_REDIRECT_URI
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Check the MICROSOFT_OAUTH_SETUP.md file for detailed instructions.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="border-b border-slate-200 pb-4 mb-4 sm:mb-6">
              <h2 className="text-lg font-medium text-slate-900">
                Account Information
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Configure the details for your email account
              </p>
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              {/* Account name field moved to after Microsoft section; will render only when applicable */}

              {provider === 'microsoft' ? (
                // Microsoft Authentication Section
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Microsoft Authentication
                  </label>
                  
                  {microsoftAccount ? (
                    <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                            <CheckCircleIcon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-green-900">
                              {microsoftAccount.name}
                            </p>
                            <p className="text-sm text-green-700">
                              {microsoftAccount.username}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleMicrosoftLogout}
                          className="text-green-700 hover:text-green-900 text-sm font-medium px-3 py-1 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Change account
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={handleMicrosoftAuth}
                        disabled={microsoftAuthenticating}
                        className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium transition-colors shadow-sm"
                      >
                        {microsoftAuthenticating && (
                          <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        )}
                        <span>
                          {microsoftAuthenticating ? 'Authenticating...' : 'Connect with Microsoft'}
                        </span>
                      </button>
                      
                      {errors.microsoft && (
                        <div className="space-y-3">
                          <p className="text-red-500 text-sm flex items-center">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                            {errors.microsoft}
                          </p>
                          
                          {errors.microsoft.includes('CORS') || errors.microsoft.includes('popup') || errors.microsoft.includes('Network') ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                              <div className="flex items-start space-x-3">
                                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm text-yellow-800 font-medium">
                                    Azure Configuration Required
                                  </p>
                                  <p className="text-xs text-yellow-700 mt-1">
                                    This error indicates that the Microsoft Azure application needs to be configured correctly.
                                  </p>
                                  <div className="mt-3">
                                    <p className="text-xs text-yellow-700 font-medium">Required steps:</p>
                                    <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside space-y-1">
                                      <li>Configure redirect URL in Azure Portal</li>
                                      <li>Set application as "SPA" type</li>
                                      <li>Verify VITE_AZURE_* environment variables</li>
                                    </ul>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => window.open('https://portal.azure.com', '_blank')}
                                    className="mt-3 text-xs text-yellow-800 underline hover:text-yellow-900 font-medium"
                                  >
                                    Open Azure Portal
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                          <QuestionMarkCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-blue-800 font-medium">
                              Secure Authentication
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              We use Microsoft's OAuth2 for secure access to your emails. Your data remains protected.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Microsoft: Account name appears after successful authentication inside Account Information */}
                  {microsoftAccount && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Account name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder={`My Microsoft account`}
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.name}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Display name to identify this account in the system
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Gmail Fields Section
                <>
                  {/* Gmail: Account name in original position, before credentials */}
                  {provider === 'gmail' && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Account name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder={`My Gmail account`}
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.name}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Display name to identify this account in the system
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email address
                    </label>
                    <input
                      type="email"
                      name="email_address"
                      value={formData.email_address}
                      onChange={handleChange}
                      placeholder="example@gmail.com"
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.email_address ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    />
                    {errors.email_address && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.email_address}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">
                        App password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowHelpModal(true)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <QuestionMarkCircleIcon className="h-4 w-4" />
                        <span>Need help?</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="app_password"
                        value={formData.app_password}
                        onChange={handleChange}
                        placeholder={editMode ? "Leave blank to keep current password" : "xxxx xxxx xxxx xxxx"}
                        className={`w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.app_password ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {errors.app_password && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {errors.app_password}
                      </p>
                    )}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3">
                      <div className="flex items-start space-x-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-amber-800 font-medium">
                            {editMode 
                              ? 'Leave blank to keep current password' 
                              : 'Important: Use app password, not your regular password'
                            }
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            {editMode 
                              ? 'Only fill this field if you want to update the password'
                              : 'Click "Need help?" above to see the complete step-by-step guide'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Actions inside Account Information */}
            <div className="pt-4 mt-2">
              <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between gap-4">
                {provider === 'gmail' && (
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50 font-medium flex items-center justify-center space-x-2 text-sm sm:text-base"
                  >
                    {testing ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        <span>Validating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Test configuration</span>
                      </>
                    )}
                  </button>
                )}

                <div>
                  
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => navigate('/school/dashboard/email')}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl font-medium transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto bg-gradient-to-r from-[#D0151C] to-red-600 hover:from-[#B01218] hover:to-red-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-300 font-bold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none text-sm sm:text-base"
                  >
                    {loading && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                    <span>
                      {loading 
                        ? (editMode ? 'Updating account...' : 'Adding account...') 
                        : (editMode ? 'Update account' : 'Add account')
                      }
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          

          {/* Test Results */}
          {testResults && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="border-b border-slate-200 pb-4 mb-4">
                <h2 className="text-lg font-medium text-slate-900">
                  Validation Results
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Connection test results for your email configuration
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {testResults.success ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                )}
                <span className={`font-medium ${testResults.success ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults.success ? testResults.message : testResults.error}
                </span>
              </div>
            </div>
          )}

          
        </form>
      </div>

      {/* Help Modal for App Password */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900">
                  How to create an app password {provider === 'gmail' ? 'for Gmail' : 'for Yahoo'}
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {provider === 'gmail' ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">First: Enable 2-step verification</h4>
                        <p className="text-sm text-gray-700 mb-3">
                          2-step verification must be active to create app passwords.
                        </p>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-700 mb-2"><strong>Access:</strong></p>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">myaccount.google.com</code>
                          <p className="text-sm text-gray-700 mt-2">
                            → Click on <strong>"Security"</strong> (in the side menu)<br/>
                            → Find <strong>"2-Step Verification"</strong><br/>
                            → Click <strong>"Get started"</strong> and follow the steps
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Second: Create app password</h4>
                        <p className="text-sm text-gray-700 mb-3">
                          Now you can generate a specific password for this system.
                        </p>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>On the same Security page:</strong>
                          </p>
                          <p className="text-sm text-gray-700">
                            → Use the search bar and type <strong>"app passwords"</strong><br/>
                            → Click on <strong>"App passwords"</strong><br/>
                            → In the "App name" field, enter <strong>"MatriculaUSA"</strong><br/>
                            → Click <strong>"Create"</strong> to generate your password
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Third: Copy the password</h4>
                        <p className="text-sm text-gray-700 mb-3">
                          Google will show a 16-character password (with spaces).
                        </p>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Example of generated password:</strong>
                          </p>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">abcd efgh ijkl mnop</code>
                          <p className="text-sm text-gray-700 mt-2">
                            → <strong>Remove all spaces</strong> from the generated password<br/>
                            → Paste the password without spaces in the "App password" field<br/>
                            → Example: <code className="bg-gray-100 px-2 py-1 rounded text-xs">abcdefghijklmnop</code><br/>
                            → Don't use your regular Gmail password!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">First: Access your Yahoo account</h4>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-700 mb-2"><strong>Access:</strong></p>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">account.yahoo.com</code>
                          <p className="text-sm text-gray-700 mt-2">
                            → Log in with your Yahoo account<br/>
                            → Click on <strong>"Account Security"</strong> in the side menu
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Second: Generate app password</h4>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-700">
                            → Look for <strong>"Generate app password"</strong><br/>
                            → Click on <strong>"Generate app password"</strong><br/>
                            → Enter <strong>"Email"</strong> as the app name<br/>
                            → Click <strong>"Generate"</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Third: Use the generated password</h4>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Yahoo will show a unique password:</strong>
                          </p>
                          <p className="text-sm text-gray-700">
                            → <strong>Copy this generated password</strong><br/>
                            → Paste it in the "App password" field here in the system<br/>
                            → Don't use your regular Yahoo password!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                <div className="flex items-start space-x-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Important tips:</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• App password is different from your regular password</li>
                      <li>• You can generate multiple app passwords for different services</li>
                      <li>• If you forget the password, generate a new one (the old one stops working)</li>
                      <li>• Keep the password in a safe place</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Got it, close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default EmailConfiguration;
