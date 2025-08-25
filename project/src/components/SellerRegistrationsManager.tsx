import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Clock, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface SellerRegistration {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  registration_code: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

const SellerRegistrationsManager: React.FC = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<SellerRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<SellerRegistration | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Carregar registros
  useEffect(() => {
    if (user) {
      loadRegistrations();
    }
  }, [user]);

  const loadRegistrations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Para admins de afiliados, carregar todos os registros pendentes
      // independentemente do código usado
      const { data, error } = await supabase
        .from('seller_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar registros:', error);
        setError('Erro ao carregar registros');
      } else {
        setRegistrations(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar registros:', err);
      setError('Erro ao carregar registros');
    } finally {
      setLoading(false);
    }
  };

  const approveRegistration = async (registrationId: string) => {
    try {
      // 1. Atualizar status para aprovado
      const { error: updateError } = await supabase
        .from('seller_registrations')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Erro ao aprovar registro:', updateError);
        throw updateError;
      }

      // 2. Buscar o registro para obter o email e user_id
      const { data: registration } = await supabase
        .from('seller_registrations')
        .select('email, full_name, user_id')
        .eq('id', registrationId)
        .single();

      if (registration && registration.user_id) {
        // 3. Atualizar o role do usuário na tabela user_profiles
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ role: 'seller' })
          .eq('user_id', registration.user_id);

        if (profileError) {
          console.error('Erro ao atualizar role do usuário:', profileError);
          // Não vamos falhar aqui, pois o registro já foi aprovado
        }
      }

      // 4. Recarregar registros
      await loadRegistrations();
      setSuccess('Registro aprovado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      console.error('Erro ao aprovar registro:', err);
      setError(err.message || 'Erro ao aprovar registro');
      setTimeout(() => setError(''), 5000);
    }
  };

  const rejectRegistration = async (registrationId: string) => {
    try {
      const { error } = await supabase
        .from('seller_registrations')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user?.id
        })
        .eq('id', registrationId);

      if (error) {
        console.error('Erro ao rejeitar registro:', error);
        throw error;
      }

      await loadRegistrations();
      setSuccess('Registro rejeitado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      console.error('Erro ao rejeitar registro:', err);
      setError(err.message || 'Erro ao rejeitar registro');
      setTimeout(() => setError(''), 5000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <UserCheck className="w-3 h-3 mr-1" />
            Aprovado
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <UserX className="w-3 h-3 mr-1" />
            Rejeitado
          </span>
        );
      default:
        return null;
    }
  };

  const openDetailsModal = (registration: SellerRegistration) => {
    setSelectedRegistration(registration);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Gerenciar Registros de Vendedores
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Aprove ou rejeite solicitações de registro de vendedores
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-900">Pendentes</p>
              <p className="text-2xl font-bold text-blue-600">
                {registrations.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <UserCheck className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-900">Aprovados</p>
              <p className="text-2xl font-bold text-green-600">
                {registrations.filter(r => r.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <UserX className="w-5 h-5 text-red-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-red-900">Rejeitados</p>
              <p className="text-2xl font-bold text-red-600">
                {registrations.filter(r => r.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Registrations List */}
      {registrations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhum registro de vendedor encontrado.</p>
          <p className="text-sm mt-1">Os registros aparecerão aqui quando vendedores usarem seus códigos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((registration) => (
            <div
              key={registration.id}
              className={`border rounded-lg p-4 ${
                registration.status === 'pending'
                  ? 'border-yellow-200 bg-yellow-50'
                  : registration.status === 'approved'
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">
                      {registration.full_name}
                    </h4>
                    {getStatusBadge(registration.status)}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Email: {registration.email}</p>
                    {registration.phone && <p>Telefone: {registration.phone}</p>}
                    <p>Código: <span className="font-mono">{registration.registration_code}</span></p>
                    <p>Registrado em: {new Date(registration.created_at).toLocaleDateString('pt-BR')}</p>
                    {registration.approved_at && (
                      <p>
                        {registration.status === 'approved' ? 'Aprovado' : 'Rejeitado'} em: {' '}
                        {new Date(registration.approved_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => openDetailsModal(registration)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    title="Ver detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {registration.status === 'pending' && (
                    <>
                      <button
                        onClick={() => approveRegistration(registration.id)}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        title="Aprovar"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => rejectRegistration(registration.id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="Rejeitar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detalhes do Registro
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome Completo</label>
                <p className="text-sm text-gray-900">{selectedRegistration.full_name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{selectedRegistration.email}</p>
              </div>
              
              {selectedRegistration.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Telefone</label>
                  <p className="text-sm text-gray-900">{selectedRegistration.phone}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700">Código de Registro</label>
                <p className="text-sm text-gray-900 font-mono">{selectedRegistration.registration_code}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">{getStatusBadge(selectedRegistration.status)}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Data de Registro</label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedRegistration.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              {selectedRegistration.approved_at && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {selectedRegistration.status === 'approved' ? 'Data de Aprovação' : 'Data de Rejeição'}
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedRegistration.approved_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerRegistrationsManager;
