import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  FlagIcon,
  TrashIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
// emailService removido - funcionalidade desabilitada

const EmailInbox = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const configId = searchParams.get('config');
  
  const [emails, setEmails] = useState([]);
  const [configurations, setConfigurations] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(configId || '');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadConfigurations();
  }, []);

  useEffect(() => {
    if (selectedConfig) {
      loadEmails();
      
      // Interface apenas - funcionalidade removida

      return () => {
        // Interface apenas - funcionalidade removida
      };
    }
  }, [selectedConfig, filter, page]);

  const loadConfigurations = async () => {
    // Interface apenas - funcionalidade removida
    setConfigurations([]);
  };

  const loadEmails = async () => {
    // Interface apenas - funcionalidade removida
    setEmails([]);
    setLoading(false);
  };

  const handleSync = async () => {
    // Interface apenas - funcionalidade removida
    alert('Funcionalidade de sincronização foi removida. Esta é apenas uma interface visual.');
  };

  const markAsRead = async (emailId, isRead = true) => {
    // Interface apenas - funcionalidade removida
    alert('Funcionalidade de marcação foi removida. Esta é apenas uma interface visual.');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  const selectedConfigData = configurations.find(c => c.id === selectedConfig);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/email')}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <EnvelopeIcon className="h-7 w-7 text-blue-600" />
              Caixa de Entrada
            </h1>
            {selectedConfigData && (
              <p className="text-gray-600">
                {selectedConfigData.name} ({selectedConfigData.email_address})
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/email/compose?config=${selectedConfig}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <PencilSquareIcon className="h-5 w-5" />
            Compor
          </button>
          
          <button
            onClick={handleSync}
            disabled={syncing || !selectedConfig}
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
            title="Sincronizar"
          >
            <ArrowPathIcon className={`h-6 w-6 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Configuration Selector */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conta de Email
            </label>
            <select
              value={selectedConfig}
              onChange={(e) => {
                setSelectedConfig(e.target.value);
                setPage(1);
                setSelectedEmail(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione uma conta</option>
              {configurations.map(config => (
                <option key={config.id} value={config.id}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <FunnelIcon className="h-4 w-4" />
              Filtros
            </h3>
            
            <div className="space-y-2">
              {[
                { value: 'all', label: 'Todos', icon: EnvelopeIcon },
                { value: 'unread', label: 'Não lidos', icon: EnvelopeIcon },
                { value: 'read', label: 'Lidos', icon: EnvelopeOpenIcon }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    setFilter(value);
                    setPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    filter === value 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            {loading && page === 1 ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : emails.length === 0 ? (
              <div className="text-center py-12">
                <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Nenhum email encontrado
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedConfig ? 'Tente sincronizar os emails.' : 'Selecione uma conta de email.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      if (!email.is_read) {
                        markAsRead(email.id);
                      }
                    }}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !email.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    } ${selectedEmail?.id === email.id ? 'bg-blue-100' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {!email.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                          <p className={`text-sm truncate ${
                            !email.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'
                          }`}>
                            {email.from_name || email.from_address}
                          </p>
                        </div>
                        
                        <p className={`text-sm truncate mb-1 ${
                          !email.is_read ? 'font-medium text-gray-900' : 'text-gray-700'
                        }`}>
                          {email.subject || '(Sem assunto)'}
                        </p>
                        
                        <p className="text-xs text-gray-500 truncate">
                          {email.text_content || 'Sem prévia disponível'}
                        </p>
                      </div>
                      
                      <div className="ml-2 flex flex-col items-end gap-2">
                        <span className="text-xs text-gray-500">
                          {formatDate(email.received_date)}
                        </span>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(email.id, !email.is_read);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title={email.is_read ? 'Marcar como não lido' : 'Marcar como lido'}
                          >
                            {email.is_read ? (
                              <EnvelopeIcon className="h-4 w-4" />
                            ) : (
                              <EnvelopeOpenIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Load More Button */}
                {emails.length > 0 && emails.length % 20 === 0 && (
                  <div className="p-4 text-center">
                    <button
                      onClick={() => setPage(prev => prev + 1)}
                      disabled={loading}
                      className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    >
                      {loading ? 'Carregando...' : 'Carregar mais'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Email Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            {selectedEmail ? (
              <div className="p-6">
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {selectedEmail.subject || '(Sem assunto)'}
                  </h3>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>De:</strong> {selectedEmail.from_name || selectedEmail.from_address}</p>
                    <p><strong>Para:</strong> {selectedConfigData?.email_address}</p>
                    <p><strong>Data:</strong> {new Date(selectedEmail.received_date).toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none">
                  {selectedEmail.html_content ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: selectedEmail.html_content }}
                      className="text-sm text-gray-700"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedEmail.text_content || 'Sem conteúdo disponível'}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => navigate(`/email/compose?config=${selectedConfig}&reply=${selectedEmail.id}`)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Responder
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Selecione um email para visualizar
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailInbox;