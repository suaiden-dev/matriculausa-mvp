import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
// emailService removido - funcionalidade desabilitada
import { supabase } from '../../lib/supabase';

const EmailConfiguration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [showPasswords, setShowPasswords] = useState({
    smtp: false,
    imap: false
  });

  const [formData, setFormData] = useState({
    name: '',
    email_address: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_auth_user: '',
    smtp_auth_pass: '',
    imap_host: '',
    imap_port: 993,
    imap_secure: true,
    imap_auth_user: '',
    imap_auth_pass: '',
    sync_enabled: true,
    sync_interval_minutes: 5
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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
    if (!formData.smtp_host.trim()) newErrors.smtp_host = 'Host SMTP é obrigatório';
    if (!formData.smtp_auth_user.trim()) newErrors.smtp_auth_user = 'Usuário SMTP é obrigatório';
    if (!formData.smtp_auth_pass.trim()) newErrors.smtp_auth_pass = 'Senha SMTP é obrigatória';
    if (!formData.imap_host.trim()) newErrors.imap_host = 'Host IMAP é obrigatório';
    if (!formData.imap_auth_user.trim()) newErrors.imap_auth_user = 'Usuário IMAP é obrigatório';
    if (!formData.imap_auth_pass.trim()) newErrors.imap_auth_pass = 'Senha IMAP é obrigatória';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email_address && !emailRegex.test(formData.email_address)) {
      newErrors.email_address = 'Email inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validateForm()) return;
    
    setTesting(true);
    setTestResults(null);
    
    try {
      // Interface apenas - funcionalidade removida
      setTestResults({ success: false, message: 'Funcionalidade de teste foi removida' });
      
    } catch (error) {
      console.error('Erro no teste:', error);
      setTestResults({
        smtp: { success: false, error: 'Erro de conexão' },
        imap: { success: false, error: 'Erro de conexão' }
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
      // Interface apenas - funcionalidade removida
      alert('Funcionalidade de criação foi removida. Esta é apenas uma interface visual.');
      navigate('/email');
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert(error.message || 'Erro ao salvar configuração');
    } finally {
      setLoading(false);
    }
  };

  const presets = {
    gmail: {
      name: 'Gmail',
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_secure: false,
      imap_host: 'imap.gmail.com',
      imap_port: 993,
      imap_secure: true
    },
    outlook: {
      name: 'Outlook',
      smtp_host: 'smtp-mail.outlook.com',
      smtp_port: 587,
      smtp_secure: false,
      imap_host: 'outlook.office365.com',
      imap_port: 993,
      imap_secure: true
    },
    yahoo: {
      name: 'Yahoo',
      smtp_host: 'smtp.mail.yahoo.com',
      smtp_port: 587,
      smtp_secure: false,
      imap_host: 'imap.mail.yahoo.com',
      imap_port: 993,
      imap_secure: true
    }
  };

  const applyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      ...presets[preset]
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/email')}
          className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Nova Configuração de Email
          </h1>
          <p className="text-gray-600">
            Configure SMTP e IMAP para envio e recebimento automático
          </p>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Configurações Rápidas
        </h2>
        <div className="flex gap-3">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Informações Básicas
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Configuração *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Gmail Pessoal"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endereço de Email *
              </label>
              <input
                type="email"
                name="email_address"
                value={formData.email_address}
                onChange={handleChange}
                placeholder="exemplo@gmail.com"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email_address ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email_address && (
                <p className="text-red-500 text-sm mt-1">{errors.email_address}</p>
              )}
            </div>
          </div>
        </div>

        {/* SMTP Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Configuração SMTP (Envio)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Host SMTP *
              </label>
              <input
                type="text"
                name="smtp_host"
                value={formData.smtp_host}
                onChange={handleChange}
                placeholder="smtp.gmail.com"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.smtp_host ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.smtp_host && (
                <p className="text-red-500 text-sm mt-1">{errors.smtp_host}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porta SMTP
              </label>
              <input
                type="number"
                name="smtp_port"
                value={formData.smtp_port}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuário SMTP *
              </label>
              <input
                type="text"
                name="smtp_auth_user"
                value={formData.smtp_auth_user}
                onChange={handleChange}
                placeholder="exemplo@gmail.com"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.smtp_auth_user ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.smtp_auth_user && (
                <p className="text-red-500 text-sm mt-1">{errors.smtp_auth_user}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha SMTP *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.smtp ? 'text' : 'password'}
                  name="smtp_auth_pass"
                  value={formData.smtp_auth_pass}
                  onChange={handleChange}
                  placeholder="Senha ou App Password"
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.smtp_auth_pass ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, smtp: !prev.smtp }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.smtp ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.smtp_auth_pass && (
                <p className="text-red-500 text-sm mt-1">{errors.smtp_auth_pass}</p>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="smtp_secure"
              id="smtp_secure"
              checked={formData.smtp_secure}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="smtp_secure" className="ml-2 text-sm text-gray-700">
              Usar SSL/TLS (porta 465)
            </label>
          </div>
        </div>

        {/* IMAP Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Configuração IMAP (Recebimento)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Host IMAP *
              </label>
              <input
                type="text"
                name="imap_host"
                value={formData.imap_host}
                onChange={handleChange}
                placeholder="imap.gmail.com"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.imap_host ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.imap_host && (
                <p className="text-red-500 text-sm mt-1">{errors.imap_host}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porta IMAP
              </label>
              <input
                type="number"
                name="imap_port"
                value={formData.imap_port}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuário IMAP *
              </label>
              <input
                type="text"
                name="imap_auth_user"
                value={formData.imap_auth_user}
                onChange={handleChange}
                placeholder="exemplo@gmail.com"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.imap_auth_user ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.imap_auth_user && (
                <p className="text-red-500 text-sm mt-1">{errors.imap_auth_user}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha IMAP *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.imap ? 'text' : 'password'}
                  name="imap_auth_pass"
                  value={formData.imap_auth_pass}
                  onChange={handleChange}
                  placeholder="Senha ou App Password"
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.imap_auth_pass ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, imap: !prev.imap }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.imap ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.imap_auth_pass && (
                <p className="text-red-500 text-sm mt-1">{errors.imap_auth_pass}</p>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="imap_secure"
              id="imap_secure"
              checked={formData.imap_secure}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="imap_secure" className="ml-2 text-sm text-gray-700">
              Usar SSL/TLS
            </label>
          </div>
        </div>

        {/* Sync Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Configuração de Sincronização
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="sync_enabled"
                id="sync_enabled"
                checked={formData.sync_enabled}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="sync_enabled" className="ml-2 text-sm text-gray-700">
                Habilitar sincronização automática
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalo de Sincronização (minutos)
              </label>
              <select
                name="sync_interval_minutes"
                value={formData.sync_interval_minutes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.sync_enabled}
              >
                <option value={1}>1 minuto</option>
                <option value={5}>5 minutos</option>
                <option value={10}>10 minutos</option>
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
              </select>
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Resultado dos Testes
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {testResults.smtp.success ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">SMTP:</span>
                <span className={testResults.smtp.success ? 'text-green-600' : 'text-red-600'}>
                  {testResults.smtp.success ? 'Conectado com sucesso' : testResults.smtp.error}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {testResults.imap.success ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">IMAP:</span>
                <span className={testResults.imap.success ? 'text-green-600' : 'text-red-600'}>
                  {testResults.imap.success ? 'Conectado com sucesso' : testResults.imap.error}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-6 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {testing ? 'Testando...' : 'Testar Configuração'}
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/email')}
              className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EmailConfiguration;