import React, { useState, useRef } from 'react';
import { 
  User, 
  Edit, 
  Save, 
  X, 
  Phone, 
  Mail, 
  Globe, 
  MapPin,
  BookOpen,
  GraduationCap,
  Star,
  Award,
  CheckCircle,
  AlertCircle,
  Camera,
  Calendar,
  Target
} from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface ProfileManagementProps {
  profile: any;
  onUpdateProfile: (data: any) => void;
}

const ProfileManagement: React.FC<ProfileManagementProps> = ({
  profile,
  onUpdateProfile
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile?.avatar_url || user?.avatar_url);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    country: profile?.country || '',
    field_of_interest: profile?.field_of_interest || '',
    academic_level: profile?.academic_level || '',
    gpa: profile?.gpa?.toString() || '',
    english_proficiency: profile?.english_proficiency || ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error messages when user starts typing
    if (saveError) setSaveError(null);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setUploadError(null);

         try {
       // Validate file type
       if (!file.type.startsWith('image/')) {
         throw new Error('Please select an image file');
       }

       // Validate file size (max 5MB)
       if (file.size > 5 * 1024 * 1024) {
         throw new Error('File size must be less than 5MB');
       }

       const fileExt = file.name.split('.').pop();
       const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;
       
       console.log('Uploading to bucket: user-avatars');
       console.log('File name:', fileName);
       console.log('User ID:', user.id);

       // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
         .from('user-avatars')
         .upload(fileName, file, { 
           upsert: true,
           contentType: file.type
         });
         
       if (uploadError) {
         console.error('Upload error:', uploadError);
         throw new Error(`Upload failed: ${uploadError.message}`);
       }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error('Could not get image URL');

      // Update user profile with new avatar URL using RPC function
      const { data: updateResult, error: updateError } = await supabase.rpc('update_user_avatar', {
        user_id_param: user.id,
        avatar_url_param: publicUrl
      });

      if (updateError) throw updateError;
      
      if (!updateResult?.success) {
        throw new Error(updateResult?.message || 'Failed to update avatar');
      }

      setAvatarUrl(publicUrl);
      
      // Call the parent component's update function
      onUpdateProfile({ 
        ...formData, 
        avatar_url: publicUrl 
      });

    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      // Normaliza o GPA: permite vazio (null), e se numérico, limita a 0-4 e 2 casas decimais
      const parsedGpa = formData.gpa === '' ? null : Number.parseFloat(formData.gpa);
      const normalizedGpa =
        parsedGpa === null || Number.isNaN(parsedGpa)
          ? null
          : Math.min(4, Math.max(0, Math.round(parsedGpa * 100) / 100));

      const updatedData = {
        ...formData,
        gpa: normalizedGpa
      };
      
      await onUpdateProfile(updatedData);
      
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile?.name || '',
      phone: profile?.phone || '',
      country: profile?.country || '',
      field_of_interest: profile?.field_of_interest || '',
      academic_level: profile?.academic_level || '',
      gpa: profile?.gpa?.toString() || '',
      english_proficiency: profile?.english_proficiency || ''
    });
    setSaveError(null);
    setSuccessMessage(null);
    setIsEditing(false);
  };

  const getProfileCompleteness = () => {
    const fields = [
      profile?.name,
      profile?.phone,
      profile?.country,
      profile?.field_of_interest,
      profile?.academic_level,
      profile?.gpa,
      profile?.english_proficiency
    ];
    const completedFields = fields.filter(field => field && field !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  };

  const completeness = getProfileCompleteness();

  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Student Profile</h2>
          <p className="text-sm sm:text-base text-slate-600">Manage your academic profile and preferences</p>
        </div>
        
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
              <p className="text-blue-100">Complete your profile to unlock more scholarship opportunities</p>
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
              <span className="text-sm">Complete your profile to improve scholarship matching</span>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Country *</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="Your country"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Field of Interest</label>
                <select
                  value={formData.field_of_interest}
                  onChange={(e) => handleInputChange('field_of_interest', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                >
                  <option value="">Select your field</option>
                  <option value="engineering">Engineering</option>
                  <option value="business">Business</option>
                  <option value="computer-science">Computer Science</option>
                  <option value="medicine">Medicine</option>
                  <option value="law">Law</option>
                  <option value="arts">Arts & Humanities</option>
                  <option value="sciences">Natural Sciences</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Academic Level</label>
                <select
                  value={formData.academic_level}
                  onChange={(e) => handleInputChange('academic_level', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                >
                  <option value="">Select level</option>
                  <option value="high-school">High School</option>
                  <option value="undergraduate">Undergraduate</option>
                  <option value="graduate">Graduate</option>
                  <option value="doctorate">Doctorate</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">GPA</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="4"
                  value={formData.gpa}
                  onChange={(e) => handleInputChange('gpa', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  placeholder="0.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">English Proficiency</label>
                <select
                  value={formData.english_proficiency}
                  onChange={(e) => handleInputChange('english_proficiency', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                >
                  <option value="">Select proficiency</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="native">Native</option>
                  <option value="toefl">TOEFL Certified</option>
                  <option value="ielts">IELTS Certified</option>
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
                  {user?.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
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
                  title="Change profile picture"
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
                />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{profile?.name || 'Student Name'}</h3>
                <p className="text-slate-600 mb-3">{profile?.email}</p>
                <div className="flex items-center space-x-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <Star className="h-3 w-3 mr-1" />
                    Active Student
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
                      <p className="text-slate-900">{profile?.name || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Email</label>
                      <p className="text-slate-900">{profile?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Phone</label>
                      <p className="text-slate-900">{profile?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Country</label>
                      <p className="text-slate-900">{profile?.country || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-6">Academic Information</h4>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <BookOpen className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Field of Interest</label>
                      <p className="text-slate-900">{profile?.field_of_interest || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <GraduationCap className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Academic Level</label>
                      <p className="text-slate-900">{profile?.academic_level || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">GPA</label>
                      <p className="text-slate-900">{profile?.gpa || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 text-slate-400 mr-3" />
                    <div>
                      <label className="text-sm font-medium text-slate-500">English Proficiency</label>
                      <p className="text-slate-900">{profile?.english_proficiency || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <h4 className="text-lg font-bold text-slate-900 mb-6">Account Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <label className="text-sm font-medium text-slate-500">Member Since</label>
                    <p className="text-slate-900">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Target className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <label className="text-sm font-medium text-slate-500">Profile Completeness</label>
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
                A complete profile helps us match you with the most relevant scholarship opportunities. 
                Consider adding the missing information to improve your chances of finding the perfect scholarships.
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {!profile?.phone && (
                  <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg text-xs font-medium">
                    Add phone number
                  </span>
                )}
                {!profile?.country && (
                  <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg text-xs font-medium">
                    Add country
                  </span>
                )}
                {!profile?.field_of_interest && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium">
                    Add field of interest
                  </span>
                )}
                {!profile?.academic_level && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium">
                    Add academic level
                  </span>
                )}
                {!profile?.gpa && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium">
                    Add GPA
                  </span>
                )}
                {!profile?.english_proficiency && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium">
                    Add English proficiency
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

export default ProfileManagement;