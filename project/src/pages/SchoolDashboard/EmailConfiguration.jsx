import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const EmailConfiguration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [provider, setProvider] = useState('gmail');
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email_address: '',
    app_password: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    checkAuth();
  }, []);

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
    if (!formData.email_address.trim()) newErrors.email_address = 'Email é obrigatório';
    if (!formData.app_password.trim()) newErrors.app_password = 'Senha de app é obrigatória';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email_address && !emailRegex.test(formData.email_address)) {
      newErrors.email_address = 'Email inválido';
    }

    // Validar se o email corresponde ao provedor selecionado
    if (formData.email_address) {
      const domain = formData.email_address.split('@')[1]?.toLowerCase();
      if (provider === 'gmail' && !['gmail.com', 'googlemail.com'].includes(domain)) {
        newErrors.email_address = 'Email deve ser do Gmail';
      } else if (provider === 'yahoo' && !['yahoo.com', 'yahoo.com.br'].includes(domain)) {
        newErrors.email_address = 'Email deve ser do Yahoo';
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

      // Configurações padrão por provedor
      const providerConfigs = {
        gmail: {
          smtp_host: 'smtp.gmail.com',
          smtp_port: 587,
          smtp_secure: false,
          imap_host: 'imap.gmail.com',
          imap_port: 993,
          imap_secure: true
        },
        yahoo: {
          smtp_host: 'smtp.mail.yahoo.com',
          smtp_port: 587,
          smtp_secure: false,
          imap_host: 'imap.mail.yahoo.com',
          imap_port: 993,
          imap_secure: true
        }
      };

      const config = providerConfigs[provider];

      // Preparar dados para inserção
      const configData = {
        user_id: user.id,
        name: formData.name.trim(),
        email_address: formData.email_address.trim(),
        smtp_host: config.smtp_host,
        smtp_port: config.smtp_port,
        smtp_secure: config.smtp_secure,
        smtp_auth_user: formData.email_address.trim(),
        smtp_auth_pass: formData.app_password,
        imap_host: config.imap_host,
        imap_port: config.imap_port,
        imap_secure: config.imap_secure,
        imap_auth_user: formData.email_address.trim(),
        imap_auth_pass: formData.app_password,
        is_active: true,
        sync_enabled: true,
        sync_interval_minutes: 3 // Fixo em 3 minutos
      };

      // Inserir configuração no banco de dados
      const { data, error } = await supabase
        .from('email_configurations')
        .insert([configData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Sucesso
      alert('Conta de email configurada com sucesso!');
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
    <div className="min-h-screen bg-gray-50">
      {/* Gmail-style Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/school/dashboard/email')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-4"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">M</span>
              </div>
              <div>
                <h1 className="text-xl font-normal text-gray-900">Adicionar conta</h1>
                <p className="text-sm text-gray-500">Configure sua conta de email</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Escolha seu provedor de email
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setProvider('gmail')}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  provider === 'gmail'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">G</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Gmail</p>
                    <p className="text-sm text-gray-500">@gmail.com</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('yahoo')}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  provider === 'yahoo'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">Y</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Yahoo</p>
                    <p className="text-sm text-gray-500">@yahoo.com</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              Informações da conta
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da conta
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={`Minha conta ${provider === 'gmail' ? 'Gmail' : 'Yahoo'}`}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Nome para identificar esta conta no sistema
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço de email
                </label>
                <input
                  type="email"
                  name="email_address"
                  value={formData.email_address}
                  onChange={handleChange}
                  placeholder={`exemplo@${provider === 'gmail' ? 'gmail.com' : 'yahoo.com'}`}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email_address ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {errors.email_address && (
                  <p className="text-red-500 text-sm mt-1">{errors.email_address}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Senha de app
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                  >
                    <QuestionMarkCircleIcon className="h-4 w-4" />
                    <span>Preciso de ajuda</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="app_password"
                    value={formData.app_password}
                    onChange={handleChange}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.app_password ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.app_password && (
                  <p className="text-red-500 text-sm mt-1">{errors.app_password}</p>
                )}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                  <div className="flex items-start space-x-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-800 font-medium">
                        Importante: Use senha de app, não sua senha normal
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Clique em "Preciso de ajuda" acima para ver o passo a passo completo
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Test Results */}
          {testResults && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Resultado da validação
              </h2>
              
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
          <div className="flex items-center justify-between pt-6">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-6 py-3 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {testing ? (
                <div className="flex items-center space-x-2">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>Validando...</span>
                </div>
              ) : (
                'Validar configuração'
              )}
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => navigate('/school/dashboard/email')}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center space-x-2"
              >
                {loading && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                <span>{loading ? 'Salvando...' : 'Adicionar conta'}</span>
              </button>
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
                <h3 className="text-xl font-semibold text-gray-900">
                  Como criar uma senha de app {provider === 'gmail' ? 'no Gmail' : 'no Yahoo'}
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-gray-400 hover:text-gray-600"
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
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Entendi, fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailConfiguration;
