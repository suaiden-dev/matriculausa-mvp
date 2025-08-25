import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  User, 
  Edit, 
  Save, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Save as SaveIcon,
  Key, 
  Shield, 
  Star,
  Camera,
  Calendar,
  Target,
  Bell,
  AlertCircle,
  CheckCircle,
  Building,
  Users
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface ProfileSettingsProps {
  user: any;
  sellerProfile: any;
  onUpdate: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, sellerProfile, onUpdate }) => {
  const { user: authUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(sellerProfile?.avatar_url);
  
  const [formData, setFormData] = useState({
    name: sellerProfile?.name || '',
    email: sellerProfile?.email || user?.email || '',
    phone: sellerProfile?.phone || '',
    territory: sellerProfile?.territory || '',
    notifications: {
      email: true,
      sms: false,
      push: true
    }
  });

  // Sync user data only when sellerProfile changes
  useEffect(() => {
    if (sellerProfile) {
      setFormData({
        name: sellerProfile.name || '',
        email: sellerProfile.email || user?.email || '',
        phone: sellerProfile.phone || '',
        territory: sellerProfile.territory || '',
        notifications: {
          email: true,
          sms: false,
          push: true
        }
      });
      setAvatarUrl(sellerProfile.avatar_url);
    }
  }, [sellerProfile, user?.email]);

  // Memoize input change handler
  const handleInputChange = useCallback((field: string, value: any) => {
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
  }, [saveError]);

  // Memoize avatar upload handler
  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;

    setUploading(true);
    setUploadError(null);
    
    try {
      // Simulate avatar upload (implement with Supabase)
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAvatarUrl(URL.createObjectURL(file));
      setSuccessMessage('Profile photo updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setUploadError('Failed to upload profile photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [authUser]);

  // Memoize camera click handler
  const handleCameraClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Memoize save handler
  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    
    try {
      // Simulate saving (implement with Supabase)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      setSaveError('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [onUpdate]);

  // Memoize cancel handler
  const handleCancel = useCallback(() => {
    // Reset form data to original values
    if (sellerProfile) {
      setFormData({
        name: sellerProfile.name || '',
        email: sellerProfile.email || user?.email || '',
        phone: sellerProfile.phone || '',
        territory: sellerProfile.territory || '',
        notifications: {
          email: true,
          sms: false,
          push: true
        }
      });
    }
    setAvatarUrl(sellerProfile?.avatar_url);
    setIsEditing(false);
    setSaveError(null);
    setSuccessMessage(null);
  }, [sellerProfile, user?.email]);

  // Memoize edit mode toggle
  const handleEditToggle = useCallback(() => {
    setIsEditing(true);
    setSaveError(null);
    setSuccessMessage(null);
  }, []);

  // Memoize profile completeness calculation
  const completeness = useMemo(() => {
    const fields = [
      formData.name,
      formData.phone,
      formData.territory,
      avatarUrl
    ];
    const completedFields = fields.filter(field => field && field !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  }, [formData.name, formData.phone, formData.territory, avatarUrl]);

  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <p className="text-sm sm:text-base text-slate-600">Manage your seller profile and preferences</p>
        </div>
        
        {!isEditing && (
          <button
            onClick={handleEditToggle}
            className="w-full sm:w-auto bg-red-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center justify-center sm:justify-start shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Profile Completeness */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Profile Completeness</h3>
              <p className="text-red-100">Complete your profile to unlock more seller features</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold mb-2">{completeness}%</div>
              <div className="text-red-100 text-sm">Complete</div>
            </div>
          </div>
          
          <div className="w-full bg-white/20 rounded-full h-3 mb-4">
            <div 
              className="bg-white rounded-full h-3 transition-all duration-500"
              style={{ width: `${completeness}%` }}
            ></div>
          </div>
          
          {completeness < 100 && (
            <div className="flex items-center text-red-100">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="text-sm">Complete your profile to improve seller capabilities</span>
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
                  className="w-full sm:w-auto bg-red-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="h-4 w-4 mr-2" />
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all duration-200"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all duration-200"
                  disabled
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all duration-200"
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Territory/Region *</label>
                <input
                  type="text"
                  value={formData.territory}
                  onChange={(e) => handleInputChange('territory', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all duration-200"
                  placeholder="Ex: São Paulo, South Brazil, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Notifications</label>
                <select
                  value={formData.notifications.email ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('notifications.email', e.target.value === 'true')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all duration-200"
                  aria-label="Configure email notifications"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">SMS Notifications</label>
                <select
                  value={formData.notifications.sms ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('notifications.sms', e.target.value === 'true')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all duration-200"
                  aria-label="Configure SMS notifications"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0 mb-6 sm:mb-8">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
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
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-white text-red-600 rounded-lg flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Change profile photo"
                  aria-label="Change profile photo"
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
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
                  aria-label="Select profile photo"
                />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{sellerProfile?.name || 'Seller'}</h3>
                <p className="text-slate-600 mb-3">{sellerProfile?.email || user?.email}</p>
                <div className="flex items-center space-x-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    <Users className="h-3 w-3 mr-1" />
                    MatriculaUSA Seller
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
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
                <h4 className="text-lg font-bold text-slate-900 mb-6">Personal Information</h4>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Full Name</label>
                      <p className="text-slate-900">{sellerProfile?.name || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Email</label>
                      <p className="text-slate-900">{sellerProfile?.email || user?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Phone</label>
                      <p className="text-slate-900">{sellerProfile?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Territory/Region</label>
                      <p className="text-slate-900">{sellerProfile?.territory || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-6">Account Information</h4>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Account Type</label>
                      <p className="text-slate-900">MatriculaUSA Seller</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Bell className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Email Notifications</label>
                      <p className="text-slate-900">
                        {formData.notifications.email ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Account Status</label>
                      <p className="text-slate-900">{sellerProfile?.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Target className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Profile Complete</label>
                      <p className="text-slate-900">{completeness}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Code Info */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <h4 className="text-lg font-bold text-slate-900 mb-6">Referral Information</h4>
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Your Referral Code</p>
                    <p className="text-2xl font-mono font-bold text-red-600">{sellerProfile?.referral_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Administrator</p>
                    <p className="font-medium text-slate-900">{sellerProfile?.affiliate_admin_name || 'Admin'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <h4 className="text-lg font-bold text-slate-900 mb-6">Account Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <label className="text-sm font-medium text-slate-500">Member Since</label>
                    <p className="text-slate-900">
                      {sellerProfile?.created_at ? new Date(sellerProfile.created_at).toLocaleDateString('en-US') : 'Unknown'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Target className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <label className="text-sm font-medium text-slate-500">Profile Complete</label>
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
              <h4 className="font-medium text-yellow-800 mb-2">Complete Your Profile</h4>
              <p className="text-sm text-yellow-700 mb-4">
                A complete profile helps you manage your referrals better and access more seller features. 
                Consider adding the missing information to improve your seller capabilities.
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {!sellerProfile?.phone && (
                  <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg text-xs font-medium">
                    Add phone
                  </span>
                )}
                {!sellerProfile?.territory && (
                  <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg text-xs font-medium">
                    Add territory
                  </span>
                )}
                {!avatarUrl && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium">
                    Add profile photo
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
