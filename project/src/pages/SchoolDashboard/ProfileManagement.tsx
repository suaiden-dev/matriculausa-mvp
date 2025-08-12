import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, 
  Edit, 
  Settings, 
  Users,
  Award,
  CheckCircle,
  AlertCircle,
  Save,
  X,
  ExternalLink,
  Plus,
  Trash2,
  Globe,
  MapPin,
  Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { useProfileForm } from '../../hooks/useProfileForm';
import { profileFieldsConfig } from '../../config/profileFields';
import FormSection from '../../components/ProfileForm/FormSection';

const ProfileManagement: React.FC = () => {
  const { university, refreshData } = useUniversity();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(university?.image_url);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Academic programs editing state
  const [newProgram, setNewProgram] = useState('');
  const [programError, setProgramError] = useState<string | null>(null);

  // Hook personalizado para gerenciar o formulário
  const {
    formData,
    isEditing,
    saving,
    showSensitiveInfo,
    setIsEditing,
    setShowSensitiveInfo,
    handleSave,
    handleCancel,
    updateField,
    updateImage,
    getFieldRef
  } = useProfileForm({
    university,
    onSuccess: () => {
      refreshData();
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error) => {
      setErrorMessage(error);
    }
  });

  // Sincronizar imageUrl com dados da universidade
  useEffect(() => {
    if (university?.image_url) {
      setImageUrl(university.image_url);
    }
  }, [university?.image_url]);

  const profileCompleteness = university ? (
    (university.name ? 20 : 0) +
    (university.description ? 20 : 0) +
    (university.location ? 15 : 0) +
    (university.website ? 15 : 0) +
    (university.contact?.email ? 10 : 0) +
    (university.contact?.phone ? 10 : 0) +
    (university.programs && university.programs.length > 0 ? 10 : 0)
  ) : 0;



  const handleImageUpload = async (file: File) => {
    if (!university || !user) return;

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
      const fileName = `university_${university.id}_${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });
        
      if (uploadError) {
        console.error('Upload error:', uploadError);
        
        // Tratamento específico para erros comuns
        if (uploadError.message.includes('The resource was not found')) {
          throw new Error('Storage bucket not configured. Please contact support.');
        } else if (uploadError.message.includes('row-level security policy')) {
          throw new Error('Permission denied. Please try logging in again.');
        } else {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error('Could not get image URL');

      // Update university record
      const { error: updateError } = await supabase
        .from('universities')
        .update({ image_url: publicUrl })
        .eq('id', university.id);

      if (updateError) throw updateError;

      // Update local state
      setImageUrl(publicUrl);
      updateImage(publicUrl);
      
      // Refresh university data to update context
      await refreshData();
      
      setSuccessMessage('University logo updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };



  const handleAddProgram = () => {
    if (!newProgram.trim()) {
      setProgramError('Program name cannot be empty');
      return;
    }

    // Check for duplicates (case insensitive)
    const normalizedNewProgram = newProgram.trim().toLowerCase();
    const isDuplicate = formData.programs.some(
      program => program.toLowerCase() === normalizedNewProgram
    );

    if (isDuplicate) {
      setProgramError('This program already exists');
      return;
    }

    updateField('programs', JSON.stringify([...formData.programs, newProgram.trim()]));
    setNewProgram('');
    setProgramError(null);
  };

  const handleRemoveProgram = (index: number) => {
    const updatedPrograms = formData.programs.filter((_: string, i: number) => i !== index);
    updateField('programs', JSON.stringify(updatedPrograms));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddProgram();
    }
  };

  const handleCancelWithCleanup = () => {
    handleCancel();
    setNewProgram('');
    setProgramError(null);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  if (!university) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <Building className="h-12 w-12 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">University profile not found</h3>
        <p className="text-slate-500 mb-8 max-w-lg mx-auto">
          Create your university profile to showcase your institution to international students
        </p>
        <Link
          to="/school/setup-profile"
          className="bg-gradient-to-r from-[#05294E] to-blue-700 text-white px-8 py-4 rounded-xl hover:from-[#05294E]/90 hover:to-blue-600 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Create University Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {errorMessage}
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-[#05294E] to-blue-700 rounded-2xl p-4 sm:p-8 text-white relative overflow-hidden mt-6">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 w-full">
              <div className="relative mb-4 sm:mb-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt="University Logo" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <Building className="h-12 w-12 text-white" />
                  )}
                </div>
              </div>
              <div className="flex-1 w-full">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">{university.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-blue-100 text-sm">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {university.location}
                  </div>
                  {university.website && (
                    <a 
                      href={university.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center hover:text-white transition-colors"
                    >
                      <Globe className="h-4 w-4 mr-1" />
                      Website
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                    university.is_approved 
                      ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
                      : 'bg-yellow-500/20 text-yellow-100 border border-yellow-400/30'
                  }`}>
                    {university.is_approved ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        University Approved
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Pending Approval
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={isEditing ? handleCancelWithCleanup : () => setIsEditing(true)}
                disabled={saving}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-white/30 transition-all duration-300 font-medium flex items-center shadow-lg justify-center disabled:opacity-50"
              >
                {isEditing ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </button>
              {!university.profile_completed && (
                <Link
                  to="/school/setup-profile"
                  className="bg-white text-[#05294E] px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-slate-100 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 text-center"
                >
                  <Settings className="h-4 w-4 mr-2 inline" />
                  Complete Profile
                </Link>
              )}
            </div>
          </div>
          {/* Profile Completeness */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 sm:p-4 mt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-2 gap-2">
              <span className="font-medium">Profile Completeness</span>
              <span className="font-bold">{profileCompleteness}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${profileCompleteness}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Seções do formulário usando configuração */}
        <div className="lg:col-span-2 space-y-8">
          {profileFieldsConfig.map((sectionConfig) => (
            <FormSection
              key={sectionConfig.title}
              config={sectionConfig}
              data={formData}
              isEditing={isEditing}
              showSensitive={showSensitiveInfo}
              onEdit={() => setIsEditing(true)}
              onToggleSensitive={() => setShowSensitiveInfo(!showSensitiveInfo)}
              onFieldChange={updateField}
              onImageUpload={handleImageUpload}
              imageUploading={uploading}
              imageUploadError={uploadError}
              getFieldRef={getFieldRef}
            />
          ))}

          {/* Academic Programs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Academic Programs</h3>
              {!isEditing && formData.programs.length > 0 && (
                <span className="text-sm text-slate-500">{formData.programs.length} programs</span>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-6">
                {/* Add New Program */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Add New Program</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newProgram}
                      onChange={(e) => {
                        setNewProgram(e.target.value);
                        setProgramError(null);
                      }}
                      onKeyPress={handleKeyPress}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                      placeholder="Enter program name (e.g., Computer Science, Business Administration)"
                    />
                    <button
                      type="button"
                      onClick={handleAddProgram}
                      className="bg-[#05294E] text-white px-4 py-3 rounded-xl hover:bg-[#05294E]/90 transition-colors flex items-center"
                      aria-label="Add new academic program"
                      title="Add new academic program"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {programError && (
                    <p className="text-red-600 text-sm mt-2">{programError}</p>
                  )}
                </div>

                {/* Programs List */}
                {formData.programs.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Current Programs</label>
                    <div className="space-y-2">
                      {formData.programs.map((program, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl group hover:bg-slate-100 transition-colors"
                        >
                          <span className="text-slate-900 font-medium">{program}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProgram(index)}
                            className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove program"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.programs.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No programs added yet</p>
                    <p className="text-sm">Add your first academic program above</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {formData.programs.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {formData.programs.map((program: string, index: number) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 text-center hover:from-[#05294E]/5 hover:to-blue-50 hover:border-[#05294E]/20 transition-all duration-300"
                  >
                    {program}
                  </div>
                ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No academic programs listed</p>
                    <p className="text-sm">Edit your profile to add programs</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Save/Cancel Buttons */}
          {isEditing && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex space-x-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#05294E] text-white px-6 py-3 rounded-xl hover:bg-[#05294E]/90 transition-colors font-bold flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                  onClick={handleCancelWithCleanup}
                  disabled={saving}
                  className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Stats</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center">
                  <Award className="h-5 w-5 text-[#05294E] mr-3" />
                  <span className="font-medium text-slate-700">Scholarships Created</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">0</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="font-medium text-slate-700">Applicants</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">0</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-green-600 mr-3" />
                  <span className="font-medium text-slate-700">Profile Views</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">0</span>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Account Status</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Profile Created</span>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Information Complete</span>
                {university.profile_completed ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Team Approval</span>
                {university.is_approved ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
              </div>
            </div>

            {(!university.profile_completed || !university.is_approved) && (
              <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <p className="text-sm font-medium text-orange-800 mb-2">
                  {!university.profile_completed 
                    ? 'Complete your profile to unlock all features'
                    : 'Your profile is being reviewed by our team'
                  }
                </p>
                {!university.profile_completed && (
                  <Link
                    to="/school/setup-profile"
                    className="text-sm font-bold text-orange-700 hover:text-orange-800 transition-colors"
                  >
                    Complete now →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Help & Support */}
          <div className="bg-gradient-to-br from-[#05294E] to-blue-700 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-bold mb-4">Need Help?</h3>
            <p className="text-blue-100 text-sm mb-4">
              Our team is ready to help you maximize your university's potential on our platform.
            </p>
            <button className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white py-3 px-4 rounded-xl hover:bg-white/30 transition-all duration-300 font-medium">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileManagement;