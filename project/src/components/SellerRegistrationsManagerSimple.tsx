import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Clock, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useAffiliateAdminId } from '../hooks/useAffiliateAdminId';

interface SellerRegistration {
  id: string;
  user_id?: string;
  email: string;
  full_name: string;
  phone: string | null;
  registration_code: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

interface SellerRegistrationsManagerProps {
  onRefresh?: () => void;
}

const SellerRegistrationsManagerSimple: React.FC<SellerRegistrationsManagerProps> = ({ onRefresh }) => {
  const { user } = useAuth();
  const { affiliateAdminId, loading: affiliateAdminLoading, error: affiliateAdminError } = useAffiliateAdminId();
  const [registrations, setRegistrations] = useState<SellerRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (user && affiliateAdminId && !hasLoaded && !affiliateAdminLoading) {
      loadRegistrations();
    }
  }, [user?.id, affiliateAdminId, hasLoaded, affiliateAdminLoading]);

  const loadRegistrations = async () => {
    const timestamp = new Date().toISOString();
    console.log(`🔄 [PENDING_ADMIN] ${timestamp} - Iniciando carregamento de registros`);
    console.log(`🔍 [PENDING_ADMIN] ${timestamp} - Affiliate Admin ID:`, affiliateAdminId);
    
    if (!affiliateAdminId) {
      console.log(`⚠️ [PENDING_ADMIN] ${timestamp} - Affiliate Admin ID não disponível`);
      return;
    }

    setLoading(true);
    try {
      // 1. Buscar códigos criados por este admin
      console.log(`🔍 [PENDING_ADMIN] ${timestamp} - Buscando códigos de registro...`);
      const { data: adminCodes, error: codesError } = await supabase
        .from('seller_registration_codes')
        .select('code')
        .eq('admin_id', affiliateAdminId)
        .eq('is_active', true);

      if (codesError) {
        console.error(`❌ [PENDING_ADMIN] ${timestamp} - Erro ao buscar códigos:`, codesError);
        setError('Error loading admin codes');
        return;
      }

      console.log(`📋 [PENDING_ADMIN] ${timestamp} - Códigos encontrados:`, adminCodes);

      if (!adminCodes || adminCodes.length === 0) {
        console.log(`⚠️ [PENDING_ADMIN] ${timestamp} - Nenhum código ativo encontrado`);
        setRegistrations([]);
        setHasLoaded(true);
        return;
      }

      const codes = adminCodes.map(c => c.code);
      console.log(`🔢 [PENDING_ADMIN] ${timestamp} - Códigos para buscar:`, codes);
      
      // 2. Carregar registros da tabela seller_registrations
      console.log(`📊 [PENDING_ADMIN] ${timestamp} - Buscando registros de seller...`);
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('seller_registrations')
        .select(`
          id,
          user_id,
          registration_code,
          email,
          full_name,
          phone,
          status,
          created_at,
          approved_at,
          approved_by
        `)
        .in('registration_code', codes)
        .order('created_at', { ascending: false });

      if (registrationsError) {
        console.error(`❌ [PENDING_ADMIN] ${timestamp} - Erro ao buscar registros:`, registrationsError);
        setError('Error loading registrations');
        return;
      }

      console.log(`📊 [PENDING_ADMIN] ${timestamp} - Registros encontrados:`, registrationsData);
      console.log(`📈 [PENDING_ADMIN] ${timestamp} - Total de registros:`, registrationsData?.length || 0);

      // 3. Transformar registros para o formato esperado
      const transformedRegistrations: SellerRegistration[] = (registrationsData || []).map(reg => ({
        id: reg.id,
        user_id: reg.user_id, // ✅ Incluir user_id para aprovação
        email: reg.email,
        full_name: reg.full_name,
        phone: reg.phone,
        status: reg.status as 'pending' | 'approved' | 'rejected',
        created_at: reg.created_at,
        registration_code: reg.registration_code,
        approved_at: reg.approved_at,
        approved_by: reg.approved_by,
      }));

      setRegistrations(transformedRegistrations);
      setHasLoaded(true);
      
      console.log(`✅ [PENDING_ADMIN] ${timestamp} - Carregamento concluído com sucesso`);
      console.log(`📋 [PENDING_ADMIN] ${timestamp} - Registros transformados:`, transformedRegistrations);
    } catch (err) {
      console.error(`💥 [PENDING_ADMIN] ${timestamp} - Erro geral:`, err);
      setError('Error loading registrations');
    } finally {
      setLoading(false);
    }
  };

  const approveRegistration = async (userId: string) => {
    const timestamp = new Date().toISOString();
    console.log(`🔍 [SellerApproval] ${timestamp} - approveRegistration called with userId:`, userId);
    
    if (!userId || userId === 'undefined') {
      console.error(`❌ [SellerApproval] ${timestamp} - Invalid userId:`, userId);
      setError('Invalid user ID');
      return;
    }
    
    try {
      // 1. Buscar o perfil do usuário
      console.log(`🔍 [SellerApproval] ${timestamp} - Buscando perfil do usuário...`);
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Usar maybeSingle() em vez de single() para evitar erro 406
        
      console.log(`📊 [SellerApproval] ${timestamp} - Resultado da busca do perfil:`, {
        data: userProfile,
        error: profileError
      });

      if (profileError) {
        console.error(`❌ [SellerApproval] ${timestamp} - Error fetching user profile:`, profileError);
        throw profileError;
      }

      if (!userProfile) {
        console.error(`❌ [SellerApproval] ${timestamp} - User profile not found`);
        throw new Error('User profile not found');
      }

      console.log(`✅ [SellerApproval] ${timestamp} - Perfil encontrado:`, userProfile);

      // 2. Buscar o registro na tabela seller_registrations
      console.log(`🔍 [SellerApproval] ${timestamp} - Buscando registro de seller...`);
      const { data: registration, error: regError } = await supabase
        .from('seller_registrations')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Usar maybeSingle() em vez de single() para evitar erro 406

      if (regError) {
        console.error(`❌ [SellerApproval] ${timestamp} - Error fetching registration:`, regError);
        throw regError;
      }

      console.log(`✅ [SellerApproval] ${timestamp} - Registro encontrado:`, registration);

      // 3. Buscar o admin do afiliado
      console.log(`🔍 [SellerApproval] ${timestamp} - Buscando admin do afiliado...`);
      const { data: affiliateAdmin, error: adminError } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (adminError) {
        console.error('Error fetching affiliate admin:', adminError);
        throw adminError;
      }

      // 4. Verificar o system_type do admin para determinar o system_type do seller
      const { data: adminProfile, error: adminProfileError } = await supabase
        .from('user_profiles')
        .select('system_type')
        .eq('user_id', user.id)
        .single();

      if (adminProfileError) {
        console.error('Error fetching admin profile:', adminProfileError);
        throw adminProfileError;
      }

      const sellerSystemType = adminProfile?.system_type || 'legacy';
      console.log('🔍 [SellerApproval] Admin system_type:', sellerSystemType);

      // 5. Criar o seller na tabela sellers
      console.log(`🔍 [SellerApproval] ${timestamp} - Criando seller na tabela sellers...`);
      const sellerData = {
        user_id: userId,
        affiliate_admin_id: affiliateAdmin.id,
        name: registration.full_name, // ✅ Usar do registration
        email: registration.email, // ✅ Usar do registration (sempre preenchido)
        referral_code: `SELL${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        is_active: true
      };
      console.log(`📝 [SellerApproval] ${timestamp} - Dados do seller:`, sellerData);
      
      const { data: newSeller, error: sellerError } = await supabase
        .from('sellers')
        .insert(sellerData)
        .select()
        .single();

      if (sellerError) {
        console.error(`❌ [SellerApproval] ${timestamp} - Error creating seller:`, sellerError);
        throw sellerError;
      }
      
      console.log(`✅ [SellerApproval] ${timestamp} - Seller criado com sucesso:`, newSeller);

      // 5. Atualizar o status do registro
      const { error: updateError } = await supabase
        .from('seller_registrations')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating registration:', updateError);
        throw updateError;
      }

      // 6. Atualizar o perfil do usuário para seller com o system_type correto
      // ✅ IMPORTANTE: seller_referral_code é o código que o ESTUDANTE USOU para se registrar,
      // NÃO o código que ele gera como seller! Por isso, devemos limpar esse campo.
      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({
          role: 'seller',
          seller_referral_code: null, // ✅ Limpar o código antigo para evitar auto-referência
          system_type: sellerSystemType, // ✅ Usar o system_type do admin
          email: registration.email, // ✅ Garantir que email esteja no perfil
          full_name: registration.full_name // ✅ Garantir que nome esteja atualizado
        })
        .eq('user_id', userId);

      if (profileUpdateError) {
        console.error('Error updating user profile:', profileUpdateError);
        throw profileUpdateError;
      }

      setSuccess('Seller approved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Recarregar registros
      loadRegistrations();
      onRefresh?.();

    } catch (err: any) {
      console.error('Error approving registration:', err);
      setError(err.message || 'Error approving registration');
      setTimeout(() => setError(''), 5000);
    }
  };

  const rejectRegistration = async (userId: string) => {
    try {
      // Atualizar o status do registro para rejeitado
      const { error: updateError } = await supabase
        .from('seller_registrations')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating registration:', updateError);
        throw updateError;
      }

      setSuccess('Registration rejected successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Recarregar registros
      loadRegistrations();
      onRefresh?.();

    } catch (err: any) {
      console.error('Error rejecting registration:', err);
      setError(err.message || 'Error rejecting registration');
      setTimeout(() => setError(''), 5000);
    }
  };

  // Mostrar loading se ainda estiver carregando o affiliate admin ID
  if (affiliateAdminLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading registrations...</span>
      </div>
    );
  }

  // Mostrar erro se não conseguir encontrar o affiliate admin ID
  if (affiliateAdminError || !affiliateAdminId) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">Erro ao carregar dados do administrador</p>
          <p className="text-sm text-gray-500">
            {affiliateAdminError || 'Usuário não é um administrador de afiliados'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Pending Seller Registrations
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Review and approve seller registration requests.
          </p>
        </div>

        {registrations.length === 0 ? (
          <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
            No pending registrations found.
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registrations.map((registration) => (
                  <tr key={registration.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {registration.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {registration.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registration.registration_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        registration.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : registration.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {registration.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(registration.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {registration.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveRegistration(registration.user_id || registration.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => rejectRegistration(registration.user_id || registration.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerRegistrationsManagerSimple;
