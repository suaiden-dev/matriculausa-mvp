import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Edit, 
  Save, 
  X, 
  Phone, 
  Mail, 
  Globe, 
  MapPin,
  Building,
  Users,
  Award,
  CheckCircle,
  AlertCircle,
  Camera,
  Calendar,
  Target,
  Shield,
  Bell,
  Settings
} from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface ProfileSettingsProps {
  user: any;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user }) => {
  const { user: authUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatar_url);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    territory: user?.territory || '',
    company_name: user?.company_name || '',
    website: user?.website || '',
    notifications: {
      email: user?.notifications?.email ?? true,
      sms: user?.notifications?.sms ?? false,
      push: user?.notifications?.push ?? true
    }
  });

  // Carregar dados do perfil diretamente do banco de dados
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!authUser) return;
      
      try {
        console.log('🔄 [ProfileSettings] Carregando perfil do banco de dados para user_id:', authUser.id);
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('full_name, phone, territory, company_name, website, notifications, avatar_url')
          .eq('user_id', authUser.id)
          .single();
        
        if (error) {
          console.error('❌ [ProfileSettings] Erro ao carregar perfil:', error);
          // Fallback para dados do user prop
          if (user) {
            setFormData({
              name: user.name || '',
              phone: user.phone || '',
              territory: user.territory || '',
              company_name: user.company_name || '',
              website: user.website || '',
              notifications: {
                email: user.notifications?.email ?? true,
                sms: user.notifications?.sms ?? false,
                push: user.notifications?.push ?? true
              }
            });
            setAvatarUrl(user.avatar_url);
          }
          return;
        }
        
        if (profile) {
          console.log('✅ [ProfileSettings] Perfil carregado do banco:', {
            full_name: profile.full_name,
            company_name: profile.company_name,
            website: profile.website,
            territory: profile.territory,
            notifications: profile.notifications
          });
          
          setFormData({
            name: profile.full_name || user?.name || '',
            phone: profile.phone || user?.phone || '',
            territory: profile.territory || user?.territory || '',
            company_name: profile.company_name || user?.company_name || '',
            website: profile.website || user?.website || '',
            notifications: (profile.notifications as any) || {
              email: user?.notifications?.email ?? true,
              sms: user?.notifications?.sms ?? false,
              push: user?.notifications?.push ?? true
            }
          });
          setAvatarUrl(profile.avatar_url || user?.avatar_url);
        }
      } catch (error) {
        console.error('❌ [ProfileSettings] Erro ao carregar perfil:', error);
        // Fallback para dados do user prop
        if (user) {
          setFormData({
            name: user.name || '',
            phone: user.phone || '',
            territory: user.territory || '',
            company_name: user.company_name || '',
            website: user.website || '',
            notifications: {
              email: user.notifications?.email ?? true,
              sms: user.notifications?.sms ?? false,
              push: user.notifications?.push ?? true
            }
          });
          setAvatarUrl(user.avatar_url);
        }
      }
    };
    
    loadUserProfile();
  }, [authUser, user]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error messages when user starts typing
    if (saveError) setSaveError(null);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;

    setUploading(true);
    setUploadError(null);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Por favor, selecione um arquivo de imagem');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('O arquivo deve ter menos de 5MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}/avatar_${Date.now()}.${fileExt}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });
        
      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error('Não foi possível obter a URL da imagem');

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', authUser.id);

      if (updateError) {
        throw new Error(`Erro ao atualizar perfil: ${updateError.message}`);
      }

      setAvatarUrl(publicUrl);
      setSuccessMessage('Avatar atualizado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error: any) {
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    if (!authUser) {
      setSaveError('Usuário não autenticado');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      // Update user profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.name,
          phone: formData.phone,
          territory: formData.territory,
          company_name: formData.company_name,
          website: formData.website,
          notifications: formData.notifications,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', authUser.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Erro ao salvar: ${updateError.message}`);
      }

      // Atualizar o estado local com os dados salvos
      if (updatedProfile) {
        console.log('✅ [ProfileSettings] Perfil atualizado com sucesso:', {
          full_name: updatedProfile.full_name,
          company_name: updatedProfile.company_name,
          website: updatedProfile.website,
          territory: updatedProfile.territory,
          notifications: updatedProfile.notifications
        });
        
        setFormData({
          name: updatedProfile.full_name || formData.name,
          phone: updatedProfile.phone || '',
          territory: updatedProfile.territory || '',
          company_name: updatedProfile.company_name || '',
          website: updatedProfile.website || '',
          notifications: (updatedProfile.notifications as any) || formData.notifications
        });
      }

      setSuccessMessage('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditing(false);

      // Recarregar os dados do perfil após salvar
      if (updatedProfile) {
        setFormData({
          name: updatedProfile.full_name || formData.name,
          phone: updatedProfile.phone || formData.phone,
          territory: updatedProfile.territory || formData.territory,
          company_name: updatedProfile.company_name || formData.company_name,
          website: updatedProfile.website || formData.website,
          notifications: (updatedProfile.notifications as any) || formData.notifications
        });
      }

    } catch (error: any) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        territory: user.territory || '',
        company_name: user.company_name || '',
        website: user.website || '',
        notifications: {
          email: user.notifications?.email ?? true,
          sms: user.notifications?.sms ?? false,
          push: user.notifications?.push ?? true
        }
      });
    }
    setAvatarUrl(user?.avatar_url);
    setIsEditing(false);
    setSaveError(null);
    setSuccessMessage(null);
  };

  const getProfileCompleteness = () => {
    const fields = [
      formData.name,
      formData.phone,
      formData.territory,
      formData.company_name,
      avatarUrl
    ];
    const completedFields = fields.filter(field => field && field !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  };

  const completeness = getProfileCompleteness();

  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-4 sm:space-y-0">
        {!isEditing && (
          <button
            onClick={() => {
              setIsEditing(true);
              setSaveError(null);
              setSuccessMessage(null);
            }}
            className="w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center sm:justify-start shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Profile Completeness */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Profile Completeness</h3>
              <p className="text-blue-100">Complete your profile to unlock more affiliate management features</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold mb-2">{completeness}%</div>
              <div className="text-blue-100 text-sm">Complete</div>
            </div>
          </div>
          
          <div className="w-full bg-white/20 rounded-full h-3 mb-4">
            <div 
              className="bg-white rounded-full h-3 transition-all duration-500"
              style={{ width: `${completeness}%` }}
            ></div>
          </div>
          
          {completeness < 100 && (
            <div className="flex items-center text-blue-100">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="text-sm">Complete your profile to improve affiliate management capabilities</span>
            </div>
          )}
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isEditing ? (
          <div className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Edit Profile</h3>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="w-full sm:w-auto bg-slate-100 text-slate-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome Completo *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Digite seu nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Telefone *</label>
                <PhoneInput
                  international
                  defaultCountry="BR"
                  value={formData.phone}
                  onChange={(value) => handleInputChange('phone', value || '')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Ex: +55 11 99999-8888"
                  limitMaxLength
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Território/Região *</label>
                <input
                  type="text"
                  value={formData.territory}
                  onChange={(e) => handleInputChange('territory', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Ex: São Paulo, Sul do Brasil"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome da Empresa</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Nome da sua empresa ou organização"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="https://exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notificações por Email</label>
                <select
                  value={formData.notifications.email ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('notifications.email', e.target.value === 'true')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  aria-label="Configurar notificações por email"
                >
                  <option value="true">Ativadas</option>
                  <option value="false">Desativadas</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0 mb-6 sm:mb-8">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Profile Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                  )}
                </div>
                <button 
                  onClick={handleCameraClick}
                  disabled={uploading}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-white text-blue-600 rounded-lg flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Alterar foto do perfil"
                  aria-label="Alterar foto do perfil"
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  aria-label="Selecionar foto de perfil"
                />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {formData.company_name && formData.company_name.trim() 
                    ? formData.company_name 
                    : (formData.name || user?.name || 'Admin de Afiliados')
                  }
                </h3>
                <p className="text-slate-600 mb-3">{user?.email}</p>
                <div className="flex items-center space-x-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <Users className="h-3 w-3 mr-1" />
                    Admin de Afiliados
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verificado
                  </span>
                </div>
              </div>
            </div>

            {/* Upload Error Message */}
            {uploadError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-700 text-sm">{uploadError}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-green-700 text-sm">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Save Error Message */}
            {saveError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-700 text-sm">{saveError}</p>
                </div>
              </div>
            )}

            {/* Profile Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-6">Informações Pessoais</h4>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Nome Completo</label>
                      <p className="text-slate-900">{formData.name || user?.name || 'Não fornecido'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Email</label>
                      <p className="text-slate-900">{user?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Telefone</label>
                      <p className="text-slate-900">{formData.phone || user?.phone || 'Não fornecido'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Território/Região</label>
                      <p className="text-slate-900">{formData.territory || user?.territory || 'Não fornecido'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-6">Informações da Empresa</h4>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Building className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Nome da Empresa</label>
                      <p className="text-slate-900">{formData.company_name || user?.company_name || 'Não fornecido'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Website</label>
                      <p className="text-slate-900">{formData.website || user?.website || 'Não fornecido'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Bell className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Notificações por Email</label>
                      <p className="text-slate-900">
                        {formData.notifications?.email !== undefined 
                          ? (formData.notifications.email ? 'Ativadas' : 'Desativadas')
                          : (user?.notifications?.email ? 'Ativadas' : 'Desativadas')
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Status da Conta</label>
                      <p className="text-slate-900">Ativo</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <h4 className="text-lg font-bold text-slate-900 mb-6">Informações da Conta</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <label className="text-sm font-medium text-slate-500">Membro Desde</label>
                    <p className="text-slate-900">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'Desconhecido'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Target className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <label className="text-sm font-medium text-slate-500">Perfil Completo</label>
                    <p className="text-slate-900">{completeness}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Tips */}
      {completeness < 100 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0">
            <AlertCircle className="h-5 w-5 text-yellow-600 mx-auto sm:mx-0 sm:mr-3 sm:mt-0.5" />
            <div className="text-center sm:text-left">
              <h4 className="font-medium text-yellow-800 mb-2">Complete Seu Perfil</h4>
              <p className="text-sm text-yellow-700 mb-4">
                Um perfil completo ajuda você a gerenciar melhor seus afiliados e vendedores. 
                Considere adicionar as informações em falta para melhorar suas capacidades de gestão.
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {!user?.phone && (
                  <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg text-xs font-medium">
                    Adicionar telefone
                  </span>
                )}
                {!user?.territory && (
                  <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg text-xs font-medium">
                    Adicionar território
                  </span>
                )}
                {!user?.company_name && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium">
                    Adicionar nome da empresa
                  </span>
                )}
                {!user?.website && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium">
                    Adicionar website
                  </span>
                )}
                {!avatarUrl && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium">
                    Adicionar foto de perfil
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;
