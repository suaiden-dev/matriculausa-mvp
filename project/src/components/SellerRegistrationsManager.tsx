import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Clock, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface SellerRegistration {
  id: string;
  user_id?: string; // ✅ Adicionar user_id para o sistema simplified
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

const SellerRegistrationsManager: React.FC<SellerRegistrationsManagerProps> = ({ onRefresh }) => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<SellerRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<SellerRegistration | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load registrations apenas uma vez
  useEffect(() => {
    if (user && !hasLoaded) {
      loadRegistrations();
    }
  }, [user?.id, hasLoaded]); // Depender apenas do ID do usuário e da flag de carregamento

  const loadRegistrations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      
      // Load registrations from the new seller_registrations table
      // First get the codes created by this admin
      const { data: adminCodes, error: codesError } = await supabase
        .from('seller_registration_codes')
        .select('code')
        .eq('admin_id', user.id)
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
      
      // ABORDAGEM SIMPLIFICADA: Sempre tentar seller_registrations primeiro
      console.log('🔍 [SELLER_REG_MANAGER] Attempting to load registrations with codes:', codes);
      console.log('🔍 [SELLER_REG_MANAGER] User ID:', user?.id);
      
      // 1. Sempre tentar carregar da tabela seller_registrations primeiro
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
        
      console.log('🔍 [SELLER_REG_MANAGER] Query result:', { data: registrationsData, error: registrationsError });
      console.log('🔍 [SELLER_REG_MANAGER] Raw registrationsData:', registrationsData);
      if (registrationsData && registrationsData.length > 0) {
        console.log('🔍 [SELLER_REG_MANAGER] First registration raw data:', registrationsData[0]);
      }

      if (registrationsError) {
        console.error('❌ [SELLER_REG_MANAGER] Error loading registrations:', registrationsError);
        console.error('❌ [SELLER_REG_MANAGER] Error details:', {
          message: registrationsError.message,
          details: registrationsError.details,
          hint: registrationsError.hint,
          code: registrationsError.code
        });
        console.error('❌ [SELLER_REG_MANAGER] Full error object:', JSON.stringify(registrationsError, null, 2));
        console.error('❌ [SELLER_REG_MANAGER] Codes being queried:', codes);
        console.error('❌ [SELLER_REG_MANAGER] User ID:', user?.id);
        // Não falhar, continuar com abordagem legacy
        // setError(`Error loading registrations: ${registrationsError.message}`);
      } else {
        console.log('✅ [SELLER_REG_MANAGER] Registrations loaded successfully:', registrationsData?.length || 0, 'records');
      }

      // 2. Se não há registros na nova tabela, usar abordagem legacy (sistema do Matheus)
      if (!registrationsData || registrationsData.length === 0) {
        console.log('🔍 [SELLER_REG_MANAGER] No registrations in seller_registrations table, using legacy approach');
        console.log('🔍 [SELLER_REG_MANAGER] registrationsData:', registrationsData);
        console.log('🔍 [SELLER_REG_MANAGER] registrationsError:', registrationsError);
        
        // Se há erro na consulta, tentar novamente com uma consulta mais simples
        if (registrationsError) {
          console.log('🔍 [SELLER_REG_MANAGER] Retrying with simpler query...');
          try {
            const retryResult = await supabase
              .from('seller_registrations')
              .select('*')
              .in('registration_code', codes);
              
            if (retryResult.data && retryResult.data.length > 0) {
              console.log('✅ [SELLER_REG_MANAGER] Retry successful, using simplified approach');
              registrationsData = retryResult.data;
              registrationsError = null;
            }
          } catch (retryError) {
            console.error('❌ [SELLER_REG_MANAGER] Retry failed:', retryError);
          }
        }
        
        // Se ainda não há dados após o retry, usar abordagem legacy
        if (!registrationsData || registrationsData.length === 0) {
          console.log('🔍 [SELLER_REG_MANAGER] Still no data, proceeding with legacy approach');
          
          // Carregar usuários que usaram os códigos (abordagem legacy)
        const { data: users, error: usersError } = await supabase
          .from('user_profiles')
          .select(`
            user_id,
            full_name,
            email,
            phone,
            created_at,
            role,
            seller_referral_code
          `)
          .in('seller_referral_code', codes)
          .eq('role', 'student')
          .order('created_at', { ascending: false });

        if (usersError) {
          console.error('Error loading users:', usersError);
          setError('Error loading users');
          return;
        }

        // Transformar usuários em formato de registro (legacy)
        const legacyRegistrations: SellerRegistration[] = (users || []).map(user => ({
          id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          status: 'pending' as const,
          created_at: user.created_at,
          registration_code: user.seller_referral_code || 'Unknown',
        }));

          setRegistrations(legacyRegistrations);
          setHasLoaded(true);
          return;
        }
      }

      // 3. Se há registros na nova tabela, usar sistema simplified
      console.log('✅ [SELLER_REG_MANAGER] Using simplified system with seller_registrations table');
      console.log('✅ [SELLER_REG_MANAGER] Found registrations:', registrationsData?.length || 0);
      console.log('🔍 [SELLER_REG_MANAGER] registrationsData exists?', !!registrationsData);
      console.log('🔍 [SELLER_REG_MANAGER] registrationsData length:', registrationsData?.length);
      
      // Transformar registros da nova tabela
      console.log('🔍 [SELLER_REG_MANAGER] Transforming registrations...');
      const transformedRegistrations: SellerRegistration[] = registrationsData.map(reg => {
        console.log('🔍 [SELLER_REG_MANAGER] Transforming registration:', reg);
        console.log('🔍 [SELLER_REG_MANAGER] reg.user_id:', reg.user_id);
        console.log('🔍 [SELLER_REG_MANAGER] reg.id:', reg.id);
        
        return {
          id: reg.id,
          user_id: reg.user_id, // ✅ Adicionar user_id para o sistema simplified
          email: reg.email,
          full_name: reg.full_name,
          phone: reg.phone,
          status: reg.status as 'pending' | 'approved' | 'rejected',
          created_at: reg.created_at,
          registration_code: reg.registration_code,
          approved_at: reg.approved_at,
          approved_by: reg.approved_by,
        };
      });
      
      console.log('🔍 [SELLER_REG_MANAGER] Transformed registrations:', transformedRegistrations);

      setRegistrations(transformedRegistrations);
      setHasLoaded(true);

      // Get approved sellers for this admin
      // First get the affiliate_admin record for this user
      const { data: affiliateAdmin, error: adminError } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', user.id)
        .single();


      if (adminError) {
        console.error('Error fetching affiliate admin:', adminError);
        // Don't fail completely, just log the error
      }

      let sellers: { user_id: string; name: string; email: string; created_at: string }[] = [];
      if (affiliateAdmin) {
        const { data: sellersData, error: sellersError } = await supabase
          .from('sellers')
          .select(`
            user_id,
            name,
            email,
            created_at
          `)
          .eq('affiliate_admin_id', affiliateAdmin.id)
          .order('created_at', { ascending: false });


        if (sellersError) {
          console.error('Error loading sellers:', sellersError);
          // Don't fail completely, just log the error
        } else {
          sellers = sellersData || [];
        }
      }

      // Get registration history for this admin
      const { data: history, error: historyError } = await supabase
        .from('seller_registration_history')
        .select(`
          user_id,
          status,
          action_taken_at,
          notes,
          registration_code
        `)
        .eq('admin_id', user.id)
        .order('action_taken_at', { ascending: false });


      if (historyError) {
        console.error('Error loading registration history:', historyError);
        // Don't fail completely, just log the error
      }

      // Create maps for approved sellers and history
      const approvedSellers = new Map();
      (sellers || []).forEach(seller => {
        approvedSellers.set(seller.user_id, seller);
      });

      const registrationHistory = new Map();
      (history || []).forEach(record => {
        // Only keep the most recent record for each user
        if (!registrationHistory.has(record.user_id)) {
          registrationHistory.set(record.user_id, record);
        }
      });

      // Get user profiles for rejected users from history
      // Only show rejected users who are NOT currently using any registration code
      const rejectedUserIds = (history || [])
        .filter(record => record.status === 'rejected')
        .map(record => record.user_id);

      let rejectedUsers: {
        user_id: string;
        full_name: string;
        email: string;
        phone: string | null;
        created_at: string;
        role: string;
        seller_referral_code: string | null;
      }[] = [];
      if (rejectedUserIds.length > 0) {
        const { data: rejectedUsersData, error: rejectedError } = await supabase
          .from('user_profiles')
          .select(`
            user_id,
            full_name,
            email,
            phone,
            created_at,
            role,
            seller_referral_code
          `)
          .in('user_id', rejectedUserIds);

        if (rejectedError) {
          console.error('Error loading rejected users:', rejectedError);
        } else {
          // Only show users who are NOT currently using a registration code
          // (i.e., their seller_referral_code is null)
          rejectedUsers = (rejectedUsersData || []).filter(user => !user.seller_referral_code);
        }
      }

      // Transform current pending users into registration format
      const currentRegistrations: SellerRegistration[] = (users || []).map(user => {
        const isApproved = approvedSellers.has(user.user_id);
        const status: SellerRegistration['status'] = isApproved ? 'approved' : 'pending';

        return {
          id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          status,
          created_at: user.created_at,
          registration_code: user.seller_referral_code || 'Unknown',
          approved_at: isApproved ? approvedSellers.get(user.user_id)?.created_at : undefined,
        };
      });

      // Transform rejected users into registration format
      const rejectedRegistrations: SellerRegistration[] = rejectedUsers.map(user => {
        const historyRecord = registrationHistory.get(user.user_id);
        return {
          id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          status: 'rejected',
          created_at: user.created_at,
          registration_code: historyRecord?.registration_code || 'Unknown',
          approved_at: historyRecord?.action_taken_at || undefined
        };
      });

      // Combine all registrations
      const registrations: SellerRegistration[] = [...currentRegistrations, ...rejectedRegistrations];


      setRegistrations(registrations);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error loading registrations:', err);
      // setError('Error loading registrations');
    } finally {
      setLoading(false);
    }
  };

  const approveRegistration = async (userId: string) => {
    console.log('🔍 [SellerApproval] approveRegistration called with userId:', userId);
    console.log('🔍 [SellerApproval] userId type:', typeof userId);
    console.log('🔍 [SellerApproval] userId is undefined?', userId === undefined);
    
    if (!userId || userId === 'undefined') {
      console.error('❌ [SellerApproval] Invalid userId:', userId);
      setError('Invalid user ID');
      return;
    }
    
    try {
      // 0. First try to sync any missing emails from auth.users
      try {
        const { data: syncResult, error: syncError } = await supabase
          .rpc('sync_missing_emails');
        
        if (syncError) {
          console.warn('⚠️ [SellerApproval] Erro ao sincronizar emails:', syncError);
        } else {
          console.log('🔄 [SellerApproval] Sincronização de emails concluída. Registros atualizados:', syncResult);
        }
      } catch (syncErr) {
        console.warn('⚠️ [SellerApproval] Função sync_missing_emails não disponível:', syncErr);
      }

      // 1. Get the user profile to obtain details
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
 
      // Se o email não estiver no user_profiles, buscar através de métodos alternativos
      let userEmail = userProfile.email;
      console.log('🔍 [SellerApproval] Email inicial do user_profile:', userEmail);
      
      if (!userEmail) {
        console.log('🔍 [SellerApproval] Email não encontrado no user_profiles, buscando alternativas...');
        
        // Primeiro, tentar buscar na registration atual (mais confiável)
        const currentRegistration = registrations.find(r => r.id === userId);
        if (currentRegistration?.email) {
          userEmail = currentRegistration.email;
          console.log('🔍 [SellerApproval] Email encontrado na registration:', userEmail);
        }
        
        // Se ainda não encontrou, tentar usar auth.admin
        if (!userEmail) {
          try {
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
            
            if (authError) {
              console.error('Error fetching auth user:', authError);
            } else if (authUser?.user?.email) {
              userEmail = authUser.user.email;
              console.log('🔍 [SellerApproval] Email encontrado no auth.users:', userEmail);
            }
          } catch (authErr) {
            console.warn('⚠️ [SellerApproval] Método auth.admin não disponível:', authErr);
          }
        }

        // Se ainda não encontrou, tentar buscar diretamente do auth.users via RPC
        if (!userEmail) {
          try {
            const { data: rpcResult, error: rpcError } = await supabase
              .rpc('get_auth_user_email', { target_user_id: userId });
            
            if (!rpcError && rpcResult) {
              userEmail = rpcResult;
              console.log('🔍 [SellerApproval] Email encontrado via RPC:', userEmail);
            }
          } catch (rpcErr) {
            console.warn('⚠️ [SellerApproval] RPC get_auth_user_email não disponível:', rpcErr);
          }
        }
        
        // Se encontrou o email, atualizar o user_profiles
        if (userEmail) {
          console.log('🔄 [SellerApproval] Atualizando user_profiles com email:', userEmail);
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ 
              email: userEmail,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
            
          if (updateError) {
            console.warn('⚠️ [SellerApproval] Não foi possível atualizar o email no user_profiles:', updateError);
          } else {
            console.log('✅ [SellerApproval] Email atualizado no user_profiles com sucesso');
            // Atualizar o userProfile local também
            userProfile.email = userEmail;
          }
        }
      }
      
      // Validar se email existe e é válido
      if (!userEmail || userEmail.trim() === '') {
        throw new Error('User email is required but not found in profile or auth');
      }

      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        throw new Error(`Invalid email format: ${userEmail}`);
      }

      // Atualizar userProfile com o email correto
      userProfile.email = userEmail;
      console.log('✅ [SellerApproval] Email validado e confirmado:', userEmail);

      // 2. Update the user's role from student to seller
      // Update user role to 'seller' using RPC function to avoid RLS recursion
      const { data: roleUpdateResult, error: roleUpdateError } = await supabase
        .rpc('update_user_role_safe', {
          target_user_id: userId,
          new_role: 'seller'
        });

      if (roleUpdateError) {
        console.error('Error updating user role:', roleUpdateError);
        throw roleUpdateError;
      }

      if (!roleUpdateResult) {
        throw new Error('Failed to update user role - insufficient permissions');
      }

      // 3. Get affiliate_admin_id from affiliate_admins table
      const { data: affiliateAdmin, error: adminError } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (adminError) {
        console.error('Error fetching affiliate admin:', adminError);
        throw adminError;
      }

      if (!affiliateAdmin) {
        throw new Error('Affiliate admin not found');
      }

      // 4. Check if seller already exists (ignore 406 errors)
      const { data: existingSeller, error: checkError } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 errors

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is expected if seller doesn't exist
        console.warn('Error checking existing seller:', checkError);
      }

      if (!existingSeller) {
        // 5. Create seller record in sellers table
        const sellerData = {
          user_id: userId,
          affiliate_admin_id: affiliateAdmin.id,
          name: userProfile.full_name,
          email: userProfile.email,
          phone: userProfile.phone,
          territory: 'General',
          referral_code: `SELL${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          is_active: true,
          notes: 'Approved from registration'
        };

        // Validação final dos dados antes da inserção
        if (!sellerData.email || sellerData.email.trim() === '') {
          throw new Error('Email is required for seller creation but is missing');
        }
        
        if (!sellerData.name || sellerData.name.trim() === '') {
          throw new Error('Name is required for seller creation but is missing');
        }

        // Log para debug dos dados que serão inseridos
        console.log('🔍 [SellerApproval] Dados para inserir na tabela sellers:', sellerData);
        console.log('🔍 [SellerApproval] Email especificamente:', sellerData.email);
        console.log('🔍 [SellerApproval] Tipo do email:', typeof sellerData.email);
        console.log('🔍 [SellerApproval] Nome especificamente:', sellerData.name);

        const { error: sellerError } = await supabase
          .from('sellers')
          .insert(sellerData);

        if (sellerError) {
          console.error('Error creating seller record:', sellerError);
          throw sellerError;
        }
      }

      // 6. Record the approval in history
      const { error: historyError } = await supabase
        .from('seller_registration_history')
        .insert({
          user_id: userId,
          admin_id: user?.id,
          registration_code: userProfile.seller_referral_code || 'Unknown',
          status: 'approved',
          notes: 'Registration approved by admin'
        });

      if (historyError) {
        console.error('Error recording approval history:', historyError);
        // Don't fail completely, just log the error
      }

      // 7. Send webhook notifications
      try {
        // Buscar dados do affiliate admin atual
        const { data: affiliateAdminData } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('user_id', user?.id)
          .single();

        // Buscar dados do seller criado
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('referral_code, commission_rate')
          .eq('user_id', userId)
          .single();

        // Enviar notificação para admin sobre aprovação do seller
        try {
          const adminNotificationPayload = {
            tipo_notf: "Seller aprovado via registro",
            email_admin: "admin@matriculausa.com", // Email fixo do admin
            nome_admin: "Admin MatriculaUSA",
            email_seller: userProfile.email,
            nome_seller: userProfile.full_name || "Seller",
            email_affiliate_admin: affiliateAdminData?.email || "",
            nome_affiliate_admin: affiliateAdminData?.full_name || "Affiliate Admin",
            o_que_enviar: `O affiliate admin ${affiliateAdminData?.full_name || "Affiliate Admin"} aprovou o registro de seller de ${userProfile.full_name || "Seller"}. Código de referência: ${sellerData?.referral_code || "N/A"}`,
            seller_id: userId,
            referral_code: sellerData?.referral_code || "",
            commission_rate: sellerData?.commission_rate || 0.1,
            created_by: "affiliate_admin_approval"
          };

          console.log('📧 [SellerApproval] Enviando notificação para admin:', adminNotificationPayload);

          const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(adminNotificationPayload),
          });

          if (adminNotificationResponse.ok) {
            console.log('✅ [SellerApproval] Notificação para admin enviada com sucesso!');
          } else {
            console.warn('⚠️ [SellerApproval] Erro ao enviar notificação para admin:', adminNotificationResponse.status);
          }
        } catch (notificationError) {
          console.error('❌ [SellerApproval] Erro ao enviar notificação para admin:', notificationError);
        }

        // Enviar notificação para o seller sobre sua aprovação
        try {
          const sellerNotificationPayload = {
            tipo_notf: "Seu registro de seller foi aprovado",
            email_seller: userProfile.email,
            nome_seller: userProfile.full_name || "Seller",
            phone_seller: userProfile.phone || "",
            email_affiliate_admin: affiliateAdminData?.email || "",
            nome_affiliate_admin: affiliateAdminData?.full_name || "Affiliate Admin",
            o_que_enviar: `Parabéns! Seu registro de seller foi aprovado pelo affiliate admin ${affiliateAdminData?.full_name || "Affiliate Admin"}. Seu código de referência é: ${sellerData?.referral_code || "N/A"}. Use este código para indicar alunos e ganhar comissões!`,
            seller_id: userId,
            referral_code: sellerData?.referral_code || "",
            commission_rate: sellerData?.commission_rate || 0.1,
            dashboard_link: "/seller/dashboard"
          };

          console.log('📧 [SellerApproval] Enviando notificação para seller:', sellerNotificationPayload);

          const sellerNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sellerNotificationPayload),
          });

          if (sellerNotificationResponse.ok) {
            console.log('✅ [SellerApproval] Notificação para seller enviada com sucesso!');
          } else {
            console.warn('⚠️ [SellerApproval] Erro ao enviar notificação para seller:', sellerNotificationResponse.status);
          }
        } catch (notificationError) {
          console.error('❌ [SellerApproval] Erro ao enviar notificação para seller:', notificationError);
        }
      } catch (webhookError) {
        console.error('❌ [SellerApproval] Erro geral ao enviar webhooks:', webhookError);
        // Não falhar a operação por causa dos webhooks
      }

      // 8. Reload registrations and refresh parent component
      await loadRegistrations();
      if (onRefresh) {
        onRefresh(); // Refresh the parent component (SellerManagement)
      }
      setSuccess('Registration approved successfully!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      console.error('Error approving registration:', err);
      setError(err.message || 'Error approving registration');
      setTimeout(() => setError(''), 5000);
    }
  };

  const rejectRegistration = async (userId: string) => {
    try {
      // 1. Get the user's registration code before removing it
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('seller_referral_code')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw profileError;
      }

      const registrationCode = userProfile?.seller_referral_code || 'Unknown';

      // 2. Record the rejection in history
      const { error: historyError } = await supabase
        .from('seller_registration_history')
        .insert({
          user_id: userId,
          admin_id: user?.id,
          registration_code: registrationCode,
          status: 'rejected',
          notes: 'Registration rejected by admin'
        });

      if (historyError) {
        console.error('Error recording rejection history:', historyError);
        // Don't fail completely, just log the error
      }

      // 3. Remove the seller_referral_code to remove from pending list
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          seller_referral_code: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error rejecting registration:', updateError);
        throw updateError;
      }

      // 4. Reload registrations
      await loadRegistrations();
      setSuccess('Registration rejected successfully!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      console.error('Error rejecting registration:', err);
      setError(err.message || 'Error rejecting registration');
      setTimeout(() => setError(''), 5000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 whitespace-nowrap shrink-0">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 whitespace-nowrap shrink-0">
            <UserCheck className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 whitespace-nowrap shrink-0">
            <UserX className="w-3 h-3 mr-1" />
            Rejected
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
          Manage Seller Registrations
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Approve or reject seller registration requests
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

      {/* Statistics - Only Pending */}
      <div className="mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-xs">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-gray-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-700">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {registrations.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Registrations List */}
      {registrations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No seller registrations found.</p>
          <p className="text-sm mt-1">Registrations will appear here when sellers use their codes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((registration) => (
            <div
              key={registration.id}
              className="border border-gray-200 rounded-lg p-4 bg-white overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">
                      {registration.full_name}
                    </h4>
                    {/* {getStatusBadge(registration.status)} */}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1 break-words">
                    <p className="whitespace-normal break-words">
                      Email: <span className="break-all">{registration.email}</span>
                    </p>
                    {registration.phone && (
                      <p className="whitespace-normal break-words">Phone: {registration.phone}</p>
                    )}
                    <p>
                      Code: <span className="font-mono break-all">{registration.registration_code}</span>
                    </p>
                    <p>Registered on: {new Date(registration.created_at).toLocaleDateString('en-US')}</p>
                    {registration.approved_at && (
                      <p>
                        {registration.status === 'approved' ? 'Approved' : 'Rejected'} on: {' '}
                        {new Date(registration.approved_at).toLocaleDateString('en-US')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-0 sm:ml-4 self-end sm:self-auto">
                  <button
                    onClick={() => openDetailsModal(registration)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {registration.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          console.log('🔍 [SellerApproval] Button clicked for registration:', registration);
                          console.log('🔍 [SellerApproval] registration.user_id:', registration.user_id);
                          console.log('🔍 [SellerApproval] registration.id:', registration.id);
                          approveRegistration(registration.user_id || registration.id);
                        }}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => {
                          console.log('🔍 [SellerRejection] Button clicked for registration:', registration);
                          console.log('🔍 [SellerRejection] registration.user_id:', registration.user_id);
                          console.log('🔍 [SellerRejection] registration.id:', registration.id);
                          rejectRegistration(registration.user_id || registration.id);
                        }}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        title="Reject"
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
                Registration Details
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
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <p className="text-sm text-gray-900">{selectedRegistration.full_name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{selectedRegistration.email}</p>
              </div>
              
              {selectedRegistration.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{selectedRegistration.phone}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700">Registration Code</label>
                <p className="text-sm text-gray-900 font-mono">{selectedRegistration.registration_code}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">{getStatusBadge(selectedRegistration.status)}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Registration Date</label>
                <p className="text-sm text-gray-900">
                                      {new Date(selectedRegistration.created_at).toLocaleDateString('en-US')}
                </p>
              </div>
              
              {selectedRegistration.approved_at && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {selectedRegistration.status === 'approved' ? 'Approval Date' : 'Rejection Date'}
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedRegistration.approved_at).toLocaleDateString('en-US')}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerRegistrationsManager;
