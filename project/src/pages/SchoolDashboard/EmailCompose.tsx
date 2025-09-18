import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  PaperAirplaneIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

interface EmailConfiguration {
  id: string;
  name: string;
  email_address: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_auth_user: string;
  smtp_auth_pass: string;
}

interface ReceivedEmail {
  id: string;
  from_name: string;
  from_address: string;
  subject: string;
  text_content: string;
  received_date: string;
}

interface FormData {
  to_addresses: string[];
  cc_addresses: string[];
  bcc_addresses: string[];
  subject: string;
  text_content: string;
  html_content: string;
  reply_to: string;
}

const EmailCompose = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const configId = searchParams.get('config');
  const replyToId = searchParams.get('reply');
  
  const [configurations, setConfigurations] = useState<EmailConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState(configId || '');
  const [loading, setLoading] = useState(false);
  const [originalEmail, setOriginalEmail] = useState<ReceivedEmail | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    to_addresses: [''],
    cc_addresses: [''],
    bcc_addresses: [''],
    subject: '',
    text_content: '',
    html_content: '',
    reply_to: ''
  });

  useEffect(() => {
    loadConfigurations();
    if (replyToId) {
      loadOriginalEmail();
    }
  }, []);

  const loadConfigurations = async () => {
    try {
      console.log('🔍 Carregando configurações de email...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('❌ Erro de autenticação:', authError);
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar configurações:', error);
        throw error;
      }

      console.log('✅ Configurações carregadas:', data);
      setConfigurations(data || []);
      
      // Se configId foi passado via URL, selecionar automaticamente
      if (configId && data?.find(c => c.id === configId)) {
        setSelectedConfig(configId);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      setConfigurations([]);
    }
  };

  const loadOriginalEmail = async () => {
    if (!replyToId) return;
    
    try {
      console.log('📧 Carregando email original:', replyToId);
      
      const { data, error } = await supabase
        .from('received_emails')
        .select('*')
        .eq('id', replyToId)
        .single();

      if (error) {
        console.error('❌ Erro ao carregar email original:', error);
        throw error;
      }

      console.log('✅ Email original carregado:', data);
      setOriginalEmail(data);
      
      // Preencher campos para resposta
      setFormData(prev => ({
        ...prev,
        to_addresses: [data.from_address],
        subject: data.subject?.startsWith('Re: ') ? data.subject : `Re: ${data.subject || ''}`,
        text_content: `\n\n--- Mensagem original ---\n${data.text_content || ''}`,
        reply_to: data.from_address
      }));
    } catch (error) {
      console.error('❌ Erro ao carregar email original:', error);
      setOriginalEmail(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleArrayChange = (field: keyof Pick<FormData, 'to_addresses' | 'cc_addresses' | 'bcc_addresses'>, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addEmailField = (field: keyof Pick<FormData, 'to_addresses' | 'cc_addresses' | 'bcc_addresses'>) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeEmailField = (field: keyof Pick<FormData, 'to_addresses' | 'cc_addresses' | 'bcc_addresses'>, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const validateEmails = (emails: string[]) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.filter(email => email.trim()).every(email => emailRegex.test(email.trim()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedConfig) {
      alert('Selecione uma configuração de email');
      return;
    }

    const toEmails = formData.to_addresses.filter(email => email.trim());
    if (toEmails.length === 0) {
      alert('Adicione pelo menos um destinatário');
      return;
    }

    if (!validateEmails(toEmails)) {
      alert('Verifique os endereços de email dos destinatários');
      return;
    }

    const ccEmails = formData.cc_addresses.filter(email => email.trim());
    const bccEmails = formData.bcc_addresses.filter(email => email.trim());

    if (!validateEmails(ccEmails) || !validateEmails(bccEmails)) {
      alert('Verifique os endereços de email de CC/BCC');
      return;
    }

    if (!formData.text_content.trim() && !formData.html_content.trim()) {
      alert('Adicione conteúdo ao email');
      return;
    }

    setLoading(true);

    try {
      console.log('📧 Enviando email...');
      
      // Buscar configuração selecionada
      const config = configurations.find(c => c.id === selectedConfig);
      if (!config) {
        throw new Error('Configuração de email não encontrada');
      }

      // Preparar dados para o endpoint
      const emailData: any = {
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure,
        user: config.smtp_auth_user,
        password: config.smtp_auth_pass,
        to: toEmails.join(', '), // Converter array para string separada por vírgula
        subject: formData.subject,
        text: formData.text_content.trim() || undefined,
        html: formData.html_content.trim() || undefined
      };

      // Adicionar CC e BCC se existirem
      if (ccEmails.length > 0) {
        emailData.cc = ccEmails.join(', ');
      }
      if (bccEmails.length > 0) {
        emailData.bcc = bccEmails.join(', ');
      }

      console.log('📤 Dados do email:', emailData);

      // Enviar email via endpoint
      const response = await fetch('https://4a7505bb5c9f.ngrok-free.app/send-smtp?key=7D127C861C1D6CB5B12C3FE3189D8', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro no servidor: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Email enviado com sucesso:', result);

      // Salvar email enviado no banco de dados
      await saveSentEmail(config, toEmails, ccEmails, bccEmails);

      alert('Email enviado com sucesso!');
      navigate('/school/dashboard/email/inbox');
      
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert('Erro ao enviar email: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const saveSentEmail = async (config: EmailConfiguration, toEmails: string[], ccEmails: string[], bccEmails: string[]) => {
    try {
      console.log('💾 Salvando email enviado no banco...');
      
      const emailData = {
        email_config_id: config.id,
        to_addresses: toEmails,
        cc_addresses: ccEmails.length > 0 ? ccEmails : null,
        bcc_addresses: bccEmails.length > 0 ? bccEmails : null,
        subject: formData.subject,
        text_content: formData.text_content.trim() || null,
        html_content: formData.html_content.trim() || null,
        reply_to: formData.reply_to || null,
        sent_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('sent_emails')
        .insert([emailData]);

      if (error) {
        console.error('❌ Erro ao salvar email enviado:', error);
        // Não falhar o envio por causa disso
      } else {
        console.log('✅ Email enviado salvo no banco');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar email enviado:', error);
      // Não falhar o envio por causa disso
    }
  };

  const renderEmailFields = (field: keyof Pick<FormData, 'to_addresses' | 'cc_addresses' | 'bcc_addresses'>, label: string, placeholder: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      {formData[field].map((email, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <input
            type="email"
            value={email}
            onChange={(e) => handleArrayChange(field, index, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formData[field].length > 1 && (
            <button
              type="button"
              onClick={() => removeEmailField(field, index)}
              className="p-2 text-red-600 hover:text-red-800 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => addEmailField(field)}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        + Adicionar {label.toLowerCase()}
      </button>
    </div>
  );

  const selectedConfigData = configurations.find(c => c.id === selectedConfig);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/school/dashboard/email/inbox')}
          className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {originalEmail ? 'Responder Email' : 'Compor Email'}
          </h1>
          {selectedConfigData && (
            <p className="text-gray-600">
              Enviando de: {selectedConfigData.name} ({selectedConfigData.email_address})
            </p>
          )}
        </div>
      </div>

      {/* Original Email Preview */}
      {originalEmail && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Email Original:</h3>
          <div className="text-sm text-gray-600">
            <p><strong>De:</strong> {originalEmail.from_name || originalEmail.from_address}</p>
            <p><strong>Assunto:</strong> {originalEmail.subject}</p>
            <p><strong>Data:</strong> {new Date(originalEmail.received_date).toLocaleString('pt-BR')}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Configuration Selector */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Conta de Email
          </label>
          <select
            value={selectedConfig}
            onChange={(e) => setSelectedConfig(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Selecione uma conta</option>
            {configurations.map(config => (
              <option key={config.id} value={config.id}>
                {config.name} ({config.email_address})
              </option>
            ))}
          </select>
        </div>

        {/* Email Fields */}
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Recipients */}
          {renderEmailFields('to_addresses', 'Para *', 'exemplo@email.com')}
          
          {/* CC */}
          {renderEmailFields('cc_addresses', 'CC', 'exemplo@email.com')}
          
          {/* BCC */}
          {renderEmailFields('bcc_addresses', 'BCC', 'exemplo@email.com')}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assunto
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Assunto do email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reply To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responder para (opcional)
            </label>
            <input
              type="email"
              name="reply_to"
              value={formData.reply_to}
              onChange={handleChange}
              placeholder="email@exemplo.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Message Content */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensagem *
          </label>
          
          <div className="space-y-4">
            {/* Text Content */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Texto simples
              </label>
              <textarea
                name="text_content"
                value={formData.text_content}
                onChange={handleChange}
                rows={12}
                placeholder="Digite sua mensagem aqui..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* HTML Content (Optional) */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                HTML (opcional)
              </label>
              <textarea
                name="html_content"
                value={formData.html_content}
                onChange={handleChange}
                rows={6}
                placeholder="<p>Conteúdo HTML opcional...</p>"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Original Email Content for Reply */}
        {originalEmail && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Mensagem Original:
            </h3>
            <div className="border-l-4 border-gray-300 pl-4 text-sm text-gray-600">
              <div className="mb-2">
                <strong>De:</strong> {originalEmail.from_name || originalEmail.from_address}<br />
                <strong>Data:</strong> {new Date(originalEmail.received_date).toLocaleString('pt-BR')}<br />
                <strong>Assunto:</strong> {originalEmail.subject}
              </div>
              <div className="whitespace-pre-wrap">
                {originalEmail.text_content}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => navigate('/school/dashboard/email/inbox')}
            className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            disabled={loading || !selectedConfig}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Enviando...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="h-5 w-5" />
                Enviar Email
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmailCompose;
