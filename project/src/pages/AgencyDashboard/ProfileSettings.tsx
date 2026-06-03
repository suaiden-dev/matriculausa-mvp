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
  Building2,
  Users,
  Award,
  CheckCircle,
  AlertCircle,
  Camera,
  Calendar,
  Target,
  Shield,
  Bell,
  Settings,
  Smartphone,
  Briefcase,
} from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface ProfileSettingsProps {
  user: any;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user }) => {
  const { user: authUser, supabaseUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatar_url);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  const [formData, setFormData] = useState({
    // user_profiles
    name: user?.name || '',
    phone: user?.phone || '',
    company_name: user?.company_name || '',
    website: user?.website || '',
    notifications: {
      email: user?.notifications?.email ?? true,
      sms: user?.notifications?.sms ?? false,
      push: user?.notifications?.push ?? true
    },
    // affiliate_admins extra fields
    country: '',
    state: '',
    city: '',
    address: '',
    whatsapp: '',
    students_per_year: '',
  });

  const hasLoadedProfile = useRef(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!authUser || hasLoadedProfile.current) return;
      hasLoadedProfile.current = true;

      try {
        const [{ data: profile }, { data: agency }] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('full_name, phone, company_name, website, notifications, avatar_url')
            .eq('user_id', authUser.id)
            .single(),
          supabase
            .from('affiliate_admins')
            .select('company_name, website, country, state, city, address, phone, whatsapp, students_per_year, logo_url')
            .eq('user_id', authUser.id)
            .maybeSingle(),
        ]);

        setAvatarUrl(profile?.avatar_url || user?.avatar_url);
        setLogoUrl(agency?.logo_url || undefined);

        setFormData({
          name: profile?.full_name || user?.name || '',
          phone: agency?.phone || profile?.phone || user?.phone || '',
          company_name: agency?.company_name || profile?.company_name || user?.company_name || '',
          website: agency?.website || profile?.website || user?.website || '',
          notifications: (profile?.notifications as any) || {
            email: user?.notifications?.email ?? true,
            sms: user?.notifications?.sms ?? false,
            push: user?.notifications?.push ?? true
          },
          country: agency?.country || '',
          state: agency?.state || '',
          city: agency?.city || '',
          address: agency?.address || '',
          whatsapp: agency?.whatsapp || '',
          students_per_year: agency?.students_per_year || '',
        });
      } catch (error) {
        console.error('❌ [ProfileSettings] load error:', error);
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
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (saveError) setSaveError(null);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;

    setUploading(true);
    setUploadError(null);
    try {
      if (!file.type.startsWith('image/')) throw new Error('Please select an image file');
      if (file.size > 5 * 1024 * 1024) throw new Error('File must be under 5MB');

      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}/avatar_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage.from('user-avatars').upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw new Error(`Upload error: ${uploadErr.message}`);

      const { data: urlData } = supabase.storage.from('user-avatars').getPublicUrl(fileName);
      if (!urlData?.publicUrl) throw new Error('Could not get image URL');

      await supabase.from('user_profiles').update({ avatar_url: urlData.publicUrl }).eq('user_id', authUser.id);
      setAvatarUrl(urlData.publicUrl);
      setSuccessMessage('Avatar updated!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;

    setUploadingLogo(true);
    setUploadError(null);
    try {
      if (!file.type.startsWith('image/')) throw new Error('Please select an image file');
      if (file.size > 5 * 1024 * 1024) throw new Error('File must be under 5MB');

      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}/logo_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage.from('user-avatars').upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw new Error(`Upload error: ${uploadErr.message}`);

      const { data: urlData } = supabase.storage.from('user-avatars').getPublicUrl(fileName);
      if (!urlData?.publicUrl) throw new Error('Could not get image URL');

      await supabase.from('affiliate_admins').update({ logo_url: urlData.publicUrl }).eq('user_id', authUser.id);
      setLogoUrl(urlData.publicUrl);
      setSuccessMessage('Logo updated!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setUploadError(error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!authUser) {
      setSaveError('User not authenticated');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      const [{ data: updatedProfile, error: profileError }] = await Promise.all([
        supabase
          .from('user_profiles')
          .update({
            full_name: formData.name,
            phone: formData.phone,
            company_name: formData.company_name,
            website: formData.website,
            notifications: formData.notifications,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', authUser.id)
          .select()
          .single(),

        supabase
          .from('affiliate_admins')
          .update({
            company_name: formData.company_name,
            website: formData.website,
            country: formData.country,
            state: formData.state,
            city: formData.city,
            address: formData.address,
            phone: formData.phone,
            whatsapp: formData.whatsapp,
            students_per_year: formData.students_per_year,
          })
          .eq('user_id', authUser.id),
      ]);

      if (profileError) throw new Error(`Error saving: ${profileError.message}`);

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditing(false);
    } catch (error: any) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    hasLoadedProfile.current = false;
    setIsEditing(false);
    setSaveError(null);
    setSuccessMessage(null);
  };

  const getProfileCompleteness = () => {
    const fields = [
      formData.name,
      formData.phone,
      formData.city,
      formData.company_name,
      logoUrl
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="w-full sm:w-auto bg-slate-100 text-slate-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
            </div>

            {/* Section: Basic Info */}
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Personal Info</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone *</label>
                <PhoneInput
                  international
                  defaultCountry="BR"
                  value={formData.phone}
                  onChange={(value) => handleInputChange('phone', value || '')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  limitMaxLength
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Notifications</label>
                <select
                  value={formData.notifications.email ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('notifications.email', e.target.value === 'true')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>

            {/* Section: Company */}
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Company</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="https://youragency.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Students per Year</label>
                <input
                  type="text"
                  value={formData.students_per_year}
                  onChange={(e) => handleInputChange('students_per_year', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="11-50"
                />
              </div>
            </div>

            {/* Section: Location */}
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Location</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Brazil"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="São Paulo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="São Paulo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Street, number"
                />
              </div>
            </div>

            {/* Section: Contact */}
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">WhatsApp</label>
                <PhoneInput
                  international
                  defaultCountry="BR"
                  value={formData.whatsapp}
                  onChange={(value) => handleInputChange('whatsapp', value || '')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  limitMaxLength
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0 mb-6 sm:mb-8">
              {/* Agency Logo */}
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg overflow-hidden border-2 border-slate-200">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Agency Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400" />
                  )}
                </div>
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-white text-blue-600 rounded-lg flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 border border-slate-200 disabled:opacity-50"
                  title="Change agency logo"
                >
                  {uploadingLogo ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">
                  {formData.company_name && formData.company_name.trim()
                    ? formData.company_name
                    : (formData.name || user?.name || 'Agency')
                  }
                </h3>
                <p className="text-slate-600 mb-3">{user?.email}</p>
                <div className="flex items-center space-x-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <Users className="h-3 w-3 mr-1" />
                    Agency
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Upload Error / Success */}
            {uploadError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-700 text-sm">{uploadError}</p>
              </div>
            )}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-green-700 text-sm">{successMessage}</p>
              </div>
            )}
            {saveError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-700 text-sm">{saveError}</p>
              </div>
            )}

            {/* Profile Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Personal */}
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-6">Personal Information</h4>
                <div className="space-y-4">
                  <InfoRow icon={<User />} label="Full Name" value={formData.name || user?.name} />
                  <InfoRow icon={<Mail />} label="Email" value={user?.email} />
                  <InfoRow icon={<Phone />} label="Phone" value={formData.phone || user?.phone} />
                  <InfoRow icon={<Bell />} label="Email Notifications" value={formData.notifications?.email ? 'Enabled' : 'Disabled'} />
                  <InfoRow icon={<Shield />} label="Account Status" value="Active" />
                </div>
              </div>

              {/* Company */}
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-6">Company Information</h4>
                <div className="space-y-4">
                  <InfoRow icon={<Building />} label="Company Name" value={formData.company_name || user?.company_name} />
                  <InfoRow icon={<Globe />} label="Website" value={formData.website || user?.website} isLink />
                  <InfoRow icon={<Briefcase />} label="Students per Year" value={formData.students_per_year} />
                </div>
              </div>

              {/* Location */}
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-6">Location</h4>
                <div className="space-y-4">
                  <InfoRow icon={<MapPin />} label="Country" value={formData.country} />
                  <InfoRow icon={<MapPin />} label="State" value={formData.state} />
                  <InfoRow icon={<MapPin />} label="City" value={formData.city} />
                  <InfoRow icon={<MapPin />} label="Address" value={formData.address} />
                </div>
              </div>

              {/* Social */}
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-6">Contact</h4>
                <div className="space-y-4">
                  <InfoRow icon={<Smartphone />} label="WhatsApp" value={formData.whatsapp} />
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <h4 className="text-lg font-bold text-slate-900 mb-6">Account Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoRow icon={<Calendar />} label="Member Since" value={
                  supabaseUser?.created_at
                    ? new Date(supabaseUser.created_at).toLocaleDateString('en-US')
                    : undefined
                } />
                <InfoRow icon={<Target />} label="Profile Completeness" value={`${completeness}%`} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Tips */}
      {completeness < 100 && !isEditing && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0">
            <AlertCircle className="h-5 w-5 text-yellow-600 mx-auto sm:mx-0 sm:mr-3 sm:mt-0.5" />
            <div className="text-center sm:text-left">
              <h4 className="font-medium text-yellow-800 mb-2">Complete Your Profile</h4>
              <p className="text-sm text-yellow-700 mb-4">
                A complete profile helps you manage your sellers and track performance better.
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {!formData.name && <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg text-xs font-medium">Add your name</span>}
                {!formData.phone && <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg text-xs font-medium">Add phone</span>}
                {!formData.company_name && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium">Add company name</span>}
                {!formData.city && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium">Add city</span>}
                {!logoUrl && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium">Add agency logo</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Helper ── */
const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string; isLink?: boolean }> = ({
  icon, label, value, isLink
}) => (
  <div className="flex items-center">
    <span className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0">{icon}</span>
    <div>
      <label className="text-sm font-medium text-slate-500">{label}</label>
      {value ? (
        isLink ? (
          <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline text-sm">
            {value}
          </a>
        ) : (
          <p className="text-slate-900">{value}</p>
        )
      ) : (
        <p className="text-slate-400 italic text-sm">Not provided</p>
      )}
    </div>
  </div>
);

export default ProfileSettings;
