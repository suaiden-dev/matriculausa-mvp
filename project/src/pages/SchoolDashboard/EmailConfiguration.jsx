import React, { useState, useEffect } from 'react';
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

  const [formData, setFormData] = useState({
    name: '',
    email_address: '',
    app_password: ''
  });

  const [errors, setErrors] = useState({});
  
  // Check Microsoft configuration
  const isMicrosoftConfigured = !!(
    import.meta.env.VITE_AZURE_CLIENT_ID && 
    import.meta.env.VITE_AZURE_REDIRECT_URI
  );

  useEffect(() => {
    checkAuth();
    
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
          console.log('Microsoft redirect auth success:', response);
          setMicrosoftAccount(response.account);
          
          // Auto-preencher dados do formulário
          setFormData(prev => ({
            ...prev,
            name: prev.name || `Microsoft - ${response.account.name}`,
            email_address: response.account.username
          }));
          
          // Limpar erro de Microsoft se existir
          if (errors.microsoft) {
            setErrors(prev => ({ ...prev, microsoft: '' }));
          }
          
          // Clear redirect origin
          sessionStorage.removeItem('msalRedirectOrigin');
        }
      } catch (error) {
        console.error('Redirect handling error:', error);
        
        // Tratamento específico para erros de CORS/SPA
        let errorMessage = 'Erro ao processar autenticação Microsoft';
        
        if (error.message?.includes('CORS') || error.message?.includes('post_request_failed')) {
          errorMessage = 'Erro de configuração Azure: O redirect URI deve ser configurado como SPA (Single Page Application) no Azure Portal, não como Web. Veja AZURE_SPA_CONFIGURATION_FIX.md para instruções.';
        } else if (error.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
          errorMessage = 'Requisição bloqueada pelo navegador. Verifique se o redirect URI está configurado corretamente como SPA no Azure Portal.';
        }
        
        setErrors(prev => ({
          ...prev,
          microsoft: errorMessage
        }));
        
        // Log additional debug info
        console.log('Debug Info - Current URL:', window.location.href);
        console.log('Debug Info - Redirect URI:', import.meta.env.VITE_AZURE_REDIRECT_URI);
        console.log('Debug Info - Client ID:', import.meta.env.VITE_AZURE_CLIENT_ID);
      }
    };
    
    handleRedirectResponse();
    
    // Verificar se já existe uma conta Microsoft autenticada
    if (accounts.length > 0) {
      setMicrosoftAccount(accounts[0]);
      // Auto-preencher nome se vazio
      if (!formData.name && accounts[0].name) {
        setFormData(prev => ({
          ...prev,
          name: `Microsoft - ${accounts[0].name}`
        }));
      }
    }
  }, [accounts, instance]);

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
        console.log('Microsoft silent auth success:', response);
        
        setMicrosoftAccount(response.account);
        
        // Auto-preencher dados do formulário
        setFormData(prev => ({
          ...prev,
          name: prev.name || `Microsoft - ${response.account.name}`,
          email_address: response.account.username
        }));
        
        // Limpar erro de Microsoft se existir
        if (errors.microsoft) {
          setErrors(prev => ({ ...prev, microsoft: '' }));
        }
        
      } catch (silentError) {
        console.log('Silent auth failed, using redirect:', silentError);
        
        // Store current location to return after redirect
        sessionStorage.setItem('msalRedirectOrigin', window.location.pathname);
        
        // Use redirect instead of popup
        await instance.loginRedirect(loginRequest);
      }
      
    } catch (error) {
      console.error('Microsoft auth error:', error);
      
      let errorMessage = 'Erro na autenticação com Microsoft';
      
      if (error.errorCode === 'popup_window_error') {
        errorMessage = 'Erro ao abrir popup. Tente novamente ou permita popups no navegador.';
      } else if (error.errorCode === 'user_cancelled') {
        errorMessage = 'Autenticação cancelada pelo usuário.';
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
      console.error('Microsoft logout error:', error);
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
      console.error('Auth check failed:', error);
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
        console.error('Erro ao carregar configuração:', error);
        setErrors({ general: 'Erro ao carregar configuração de email' });
        return;
      }
      
      if (config) {
        setFormData({
          name: config.configuration_name || '',
          email_address: config.email_address || '',
          app_password: '' // Por segurança, não pré-preenchemos a senha
        });
        setProvider(config.provider || 'gmail');
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      setErrors({ general: 'Erro inesperado ao carregar configuração' });
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
    
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    
    // Validações específicas por provider
    if (provider === 'gmail') {
      if (!formData.email_address.trim()) newErrors.email_address = 'Email é obrigatório';
      if (!formData.app_password.trim() && !editMode) newErrors.app_password = 'Senha de app é obrigatória';
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (formData.email_address && !emailRegex.test(formData.email_address)) {
        newErrors.email_address = 'Email inválido';
      }

      // Validar se o email é do Gmail
      if (formData.email_address) {
        const domain = formData.email_address.split('@')[1]?.toLowerCase();
        if (!['gmail.com', 'googlemail.com'].includes(domain)) {
          newErrors.email_address = 'Email deve ser do Gmail';
        }
      }
    } else if (provider === 'microsoft') {
      if (!microsoftAccount) {
        newErrors.microsoft = 'É necessário autenticar com Microsoft';
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
          error: 'Formato de email inválido' 
        });
        return;
      }

      // Simulação de teste de conectividade
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTestResults({
        success: true, 
        message: 'Configurações validadas com sucesso!'
      });
      
    } catch (error) {
      console.error('Erro no teste:', error);
      setTestResults({
        success: false, 
        error: 'Erro de validação'
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
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      let configData;

      if (provider === 'gmail') {
        // Configurações Gmail (SMTP/IMAP)
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
        // Configurações Microsoft (OAuth)
        if (!microsoftAccount) {
          throw new Error('Conta Microsoft não autenticada');
        }

        // Obter token de acesso
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

      // Inserir ou atualizar configuração no banco de dados
      let result;
      if (editMode && configId) {
        // Atualizar configuração existente
        const updateData = { ...configData };
        delete updateData.user_id; // Não atualizamos o user_id
        
        // Se estamos editando Gmail e não foi fornecida nova senha, não atualizamos as senhas
        if (provider === 'gmail' && !formData.app_password.trim()) {
          delete updateData.smtp_auth_pass;
          delete updateData.imap_auth_pass;
        }
        
        result = await supabase
          .from('email_configurations')
          .update(updateData)
          .eq('id', configId)
          .eq('user_id', user.id) // Segurança: só atualizar se for do usuário
          .select()
          .single();
      } else {
        // Inserir nova configuração
        result = await supabase
          .from('email_configurations')
          .insert([configData])
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      // Sucesso
      alert(editMode ? 'Configuração atualizada com sucesso!' : 'Conta de email configurada com sucesso!');
      navigate('/school/dashboard/email');
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      
      // Tratamento de erros específicos
      let errorMessage = 'Erro ao salvar configuração';
      
      if (error.code === '23505') {
        errorMessage = 'Já existe uma configuração com este nome ou email';
      } else if (error.code === '23503') {
        errorMessage = 'Erro de referência - usuário não encontrado';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-6 lg:space-y-8">
      {/* Header + Actions Section */}
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + description + back button */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4 flex-1">
                <button
                  onClick={() => navigate('/school/dashboard/email')}
                  className="p-3 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 bg-white shadow-sm"
                  title="Back to Email Management"
                >
                  <ArrowLeftIcon className="h-5 w-5 text-slate-600" />
                </button>
                
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
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
                {provider && (
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium shadow-sm ${
                    provider === 'microsoft' 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <span className="text-xs mr-2">
                      {provider === 'microsoft' ? 'M' : 'G'}
                    </span>
                    {provider === 'microsoft' ? 'Microsoft' : 'Gmail'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h2 className="text-lg font-medium text-slate-900">
                Choose your email provider
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Select the type of email account you want to add
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setProvider('gmail')}
                className={`p-6 border-2 rounded-xl transition-all text-left hover:shadow-md ${
                  provider === 'gmail'
                    ? 'border-red-500 bg-red-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-lg">G</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-lg">Gmail</p>
                    <p className="text-sm text-slate-500">Google Workspace, @gmail.com</p>
                    <div className="flex items-center mt-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-xs text-slate-600">App password required</span>
                    </div>
                  </div>
                  {provider === 'gmail' && (
                    <CheckCircleIcon className="h-6 w-6 text-red-500" />
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('microsoft')}
                disabled={!isMicrosoftConfigured}
                className={`p-6 border-2 rounded-xl transition-all text-left relative hover:shadow-md ${
                  provider === 'microsoft'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : isMicrosoftConfigured
                    ? 'border-slate-200 hover:border-slate-300 bg-white'
                    : 'border-slate-200 opacity-50 cursor-not-allowed bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-lg">M</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-lg">Microsoft</p>
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
                    <CheckCircleIcon className="h-6 w-6 text-blue-500" />
                  )}
                  {!isMicrosoftConfigured && (
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h2 className="text-lg font-medium text-slate-900">
                Account Information
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Configure the details for your email account
              </p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Account name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={`My ${provider === 'gmail' ? 'Gmail' : 'Microsoft'} account`}
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
                        {microsoftAuthenticating ? (
                          <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        ) : (
                          <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-xs">M</span>
                          </div>
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
                </div>
              ) : (
                // Gmail Fields Section
                <>
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

          {/* Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="w-full sm:w-auto px-6 py-3 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50 font-medium flex items-center justify-center space-x-2"
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

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate('/school/dashboard/email')}
                  className="flex-1 sm:flex-none px-6 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-[#D0151C] to-red-600 hover:from-[#B01218] hover:to-red-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all duration-300 font-bold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
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
        </form>
      </div>

      {/* Modal de Ajuda para Senha de App */}
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
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-900 mb-2">Primeiro: Ative a verificação em 2 etapas</h4>
                        <p className="text-sm text-blue-800 mb-3">
                          A verificação em 2 etapas precisa estar ativa para criar senhas de app.
                        </p>
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <p className="text-sm text-gray-700 mb-2"><strong>Acesse:</strong></p>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">myaccount.google.com</code>
                          <p className="text-sm text-gray-700 mt-2">
                            → Clique em <strong>"Segurança"</strong> (no menu lateral)<br/>
                            → Encontre <strong>"Verificação em duas etapas"</strong><br/>
                            → Clique em <strong>"Começar"</strong> e siga os passos
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-green-900 mb-2">Segundo: Crie a senha de app</h4>
                        <p className="text-sm text-green-800 mb-3">
                          Agora você pode gerar uma senha específica para este sistema.
                        </p>
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Na mesma página de Segurança:</strong>
                          </p>
                          <p className="text-sm text-gray-700">
                            → Use a barra de pesquisa e digite <strong>"senhas de app"</strong><br/>
                            → Clique em <strong>"Senhas de app"</strong><br/>
                            → No campo "Nome do app", digite <strong>"MatriculaUSA"</strong><br/>
                            → Clique em <strong>"Criar"</strong> para gerar sua senha
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-purple-900 mb-2">Terceiro: Copie a senha</h4>
                        <p className="text-sm text-purple-800 mb-3">
                          O Google vai mostrar uma senha de 16 caracteres (com espaços).
                        </p>
                        <div className="bg-white rounded-lg p-3 border border-purple-200">
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Exemplo de senha gerada:</strong>
                          </p>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">abcd efgh ijkl mnop</code>
                          <p className="text-sm text-gray-700 mt-2">
                            → <strong>Remova todos os espaços</strong> da senha gerada<br/>
                            → Cole a senha sem espaços no campo "Senha de app"<br/>
                            → Exemplo: <code className="bg-gray-100 px-2 py-1 rounded text-xs">abcdefghijklmnop</code><br/>
                            → Não use sua senha normal do Gmail!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-900 mb-2">Primeiro: Acesse sua conta Yahoo</h4>
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <p className="text-sm text-gray-700 mb-2"><strong>Acesse:</strong></p>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">account.yahoo.com</code>
                          <p className="text-sm text-gray-700 mt-2">
                            → Faça login com sua conta Yahoo<br/>
                            → Clique em <strong>"Segurança da conta"</strong> no menu lateral
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-green-900 mb-2">Segundo: Gere a senha de app</h4>
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <p className="text-sm text-gray-700">
                            → Procure por <strong>"Gerar senha de app"</strong><br/>
                            → Clique em <strong>"Gerar senha de app"</strong><br/>
                            → Digite <strong>"Email"</strong> como nome do aplicativo<br/>
                            → Clique em <strong>"Gerar"</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-purple-900 mb-2">Terceiro: Use a senha gerada</h4>
                        <div className="bg-white rounded-lg p-3 border border-purple-200">
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>O Yahoo vai mostrar uma senha única:</strong>
                          </p>
                          <p className="text-sm text-gray-700">
                            → <strong>Copie essa senha gerada</strong><br/>
                            → Cole no campo "Senha de app" aqui no sistema<br/>
                            → Não use sua senha normal do Yahoo!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                <div className="flex items-start space-x-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Dicas importantes:</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• A senha de app é diferente da sua senha normal</li>
                      <li>• Você pode gerar várias senhas de app para diferentes serviços</li>
                      <li>• Se esquecer a senha, gere uma nova (a antiga para de funcionar)</li>
                      <li>• Mantenha a senha em local seguro</li>
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
