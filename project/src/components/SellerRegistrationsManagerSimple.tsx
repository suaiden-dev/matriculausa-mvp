import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Clock, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

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
  const [registrations, setRegistrations] = useState<SellerRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (user && !hasLoaded) {
      loadRegistrations();
    }
  }, [user?.id, hasLoaded]);

  const loadRegistrations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 1. Buscar códigos criados por este admin
      // Primeiro, buscar o affiliate_admin_id do usuário
      const { data: affiliateAdmin, error: adminError } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (adminError || !affiliateAdmin) {
        console.error('Error finding affiliate admin:', adminError);
        setError('Affiliate admin not found');
        return;
      }

      const { data: adminCodes, error: codesError } = await supabase
        .from('seller_registration_codes')
        .select('code')
        .eq('admin_id', affiliateAdmin.id)
        .eq('is_active', true);

      if (codesError) {
        console.error('Error loading admin codes:', codesError);
        setError('Error loading admin codes');
        return;
      }

      if (!adminCodes || adminCodes.length === 0) {
        setRegistrations([]);
        setHasLoaded(true);
        return;
      }

      const codes = adminCodes.map(c => c.code);
      
      // 2. Carregar registros da tabela seller_registrations
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
        console.error('Error loading registrations:', registrationsError);
        setError('Error loading registrations');
        return;
      }

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
    } catch (err) {
      console.error('Error loading registrations:', err);
      setError('Error loading registrations');
    } finally {
      setLoading(false);
    }
  };

  const approveRegistration = async (userId: string) => {
    console.log('🔍 [SellerApproval] approveRegistration called with userId:', userId);
    
    if (!userId || userId === 'undefined') {
      console.error('❌ [SellerApproval] Invalid userId:', userId);
      setError('Invalid user ID');
      return;
    }
    
    try {
      // 1. Buscar o perfil do usuário
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw profileError;
      }

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // 2. Buscar o registro na tabela seller_registrations
      const { data: registration, error: regError } = await supabase
        .from('seller_registrations')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (regError) {
        console.error('Error fetching registration:', regError);
        throw regError;
      }

      // 3. Buscar o admin do afiliado
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
      const { data: newSeller, error: sellerError } = await supabase
        .from('sellers')
        .insert({
          user_id: userId,
          affiliate_admin_id: affiliateAdmin.id,
          name: userProfile.full_name,
          email: userProfile.email,
          referral_code: `SELL${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          is_active: true
        })
        .select()
        .single();

      if (sellerError) {
        console.error('Error creating seller:', sellerError);
        throw sellerError;
      }

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
          system_type: sellerSystemType // ✅ Usar o system_type do admin
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading registrations...</span>
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
