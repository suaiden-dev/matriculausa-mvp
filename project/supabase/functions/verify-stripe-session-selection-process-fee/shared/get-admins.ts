import { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

/**
 * Busca todos os usuários admin do sistema
 * Retorna array com email, nome e telefone de cada admin
 */
export async function getAllAdmins(supabase: SupabaseClient): Promise<Array<{
  email: string;
  full_name: string;
  phone: string;
}>> {
  try {
    // Buscar todos os admins da tabela user_profiles onde role = 'admin'
    // Usar RPC ou query direta - tentar primeiro com user_profiles
    const { data: adminProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, phone')
      .eq('role', 'admin');

    if (profileError) {
      console.error('[getAllAdmins] Erro ao buscar admins de user_profiles:', profileError);
      
      // Fallback: tentar buscar de auth.users usando raw_user_meta_data
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && authUsers) {
          const adminUsers = authUsers.users
            .filter(user => user.user_metadata?.role === 'admin' || user.email === 'admin@matriculausa.com')
            .map(user => ({
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Admin MatriculaUSA',
              phone: user.user_metadata?.phone || ''
            }))
            .filter(admin => admin.email); // Apenas admins com email
          
          if (adminUsers.length > 0) {
            console.log(`[getAllAdmins] Encontrados ${adminUsers.length} admin(s) via auth.users:`, adminUsers.map(a => a.email));
            return adminUsers;
          }
        }
      } catch (authFallbackError) {
        console.error('[getAllAdmins] Erro no fallback para auth.users:', authFallbackError);
      }
      
      // Fallback final: retornar admin padrão se houver erro
      return [{
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.warn('[getAllAdmins] Nenhum admin encontrado em user_profiles, tentando auth.users...');
      
      // Fallback: tentar buscar de auth.users
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && authUsers) {
          const adminUsers = authUsers.users
            .filter(user => user.user_metadata?.role === 'admin' || user.email === 'admin@matriculausa.com')
            .map(user => ({
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Admin MatriculaUSA',
              phone: user.user_metadata?.phone || ''
            }))
            .filter(admin => admin.email);
          
          if (adminUsers.length > 0) {
            console.log(`[getAllAdmins] Encontrados ${adminUsers.length} admin(s) via auth.users:`, adminUsers.map(a => a.email));
            return adminUsers;
          }
        }
      } catch (authFallbackError) {
        console.error('[getAllAdmins] Erro no fallback para auth.users:', authFallbackError);
      }
      
      // Fallback final: retornar admin padrão se não houver admins
      console.warn('[getAllAdmins] Nenhum admin encontrado, usando admin padrão');
      return [{
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    // Se algum admin não tem email em user_profiles, buscar de auth.users
    const adminsWithEmail = await Promise.all(
      adminProfiles.map(async (profile) => {
        if (profile.email) {
          return {
            email: profile.email,
            full_name: profile.full_name || 'Admin MatriculaUSA',
            phone: profile.phone || ''
          };
        } else {
          // Buscar email de auth.users se não estiver em user_profiles
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
            return {
              email: authUser?.user?.email || '',
              full_name: profile.full_name || authUser?.user?.user_metadata?.full_name || 'Admin MatriculaUSA',
              phone: profile.phone || authUser?.user?.user_metadata?.phone || ''
            };
          } catch (e) {
            console.warn(`[getAllAdmins] Erro ao buscar email para user_id ${profile.user_id}:`, e);
            return null;
          }
        }
      })
    );

    // Filtrar nulos e admins sem email
    const admins = adminsWithEmail
      .filter((admin): admin is { email: string; full_name: string; phone: string } => 
        admin !== null && !!admin.email
      );

    if (admins.length === 0) {
      console.warn('[getAllAdmins] Nenhum admin válido encontrado após processamento, usando admin padrão');
      return [{
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    console.log(`[getAllAdmins] Encontrados ${admins.length} admin(s):`, admins.map(a => a.email));

    return admins;
  } catch (error) {
    console.error('[getAllAdmins] Erro inesperado ao buscar admins:', error);
    // Fallback: retornar admin padrão em caso de erro
    return [{
      email: 'admin@matriculausa.com',
      full_name: 'Admin MatriculaUSA',
      phone: ''
    }];
  }
}

