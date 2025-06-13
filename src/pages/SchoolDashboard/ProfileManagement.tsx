import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, 
  Edit, 
  Settings, 
  Phone, 
  Mail, 
  Globe, 
  MapPin,
  Users,
  Award,
  CheckCircle,
  AlertCircle,
  Camera,
  Save,
  X,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';
import { University, supabase } from '../../lib/supabase';

interface ProfileManagementProps {
  university: University | null;
}

const ProfileManagement: React.FC<ProfileManagementProps> = ({ university }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(university?.logo_url);

  const profileCompleteness = university ? (
    (university.name ? 20 : 0) +
    (university.description ? 20 : 0) +
    (university.location ? 15 : 0) +
    (university.website ? 15 : 0) +
    (university.contact?.email ? 10 : 0) +
    (university.contact?.phone ? 10 : 0) +
    (university.programs && university.programs.length > 0 ? 10 : 0)
  ) : 0;

  const handleProfilePicClick = () => {
    if (uploading) return;
    document.getElementById('university-profile-pic-input')?.click();
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !university) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `university_${university.id}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('university-profile-pictures')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage
        .from('university-profile-pictures')
        .getPublicUrl(fileName);
      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error('Could not get image URL');
      // Update university record
      const { error: updateError } = await supabase
        .from('universities')
        .update({ logo_url: publicUrl })
        .eq('id', university.id);
      if (updateError) throw updateError;
      setLogoUrl(publicUrl);
    } catch (err: any) {
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
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
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-[#05294E] to-blue-700 rounded-2xl p-4 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 w-full">
              <div className="relative mb-4 sm:mb-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="University Logo" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <Building className="h-12 w-12 text-white" />
                  )}
                </div>
                <button
                  type="button"
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-white text-[#05294E] rounded-lg flex items-center justify-center shadow-lg opacity-50 cursor-not-allowed"
                  disabled
                  title="Profile picture upload temporarily disabled"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  id="university-profile-pic-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePicChange}
                  disabled={uploading}
                />
                {uploading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-2xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E]"></div>
                  </div>
                )}
                {uploadError && (
                  <div className="absolute left-0 right-0 -bottom-8 text-red-200 text-xs mt-2 text-center">{uploadError}</div>
                )}
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
                onClick={() => setIsEditing(!isEditing)}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-white/30 transition-all duration-300 font-medium flex items-center shadow-lg justify-center"
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
        {/* Basic Information */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Basic Information</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[#05294E] hover:text-[#05294E]/80 font-medium text-sm flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">University Name *</label>
                  <input
                    type="text"
                    defaultValue={university.name}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    rows={4}
                    defaultValue={university.description || ''}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="Describe your university..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                    <input
                      type="url"
                      defaultValue={university.website || ''}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                      placeholder="https://university.edu"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                    <input
                      type="text"
                      defaultValue={university.location || ''}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                      placeholder="City, State"
                    />
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button className="bg-[#05294E] text-white px-6 py-3 rounded-xl hover:bg-[#05294E]/90 transition-colors font-bold flex items-center">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-500">University Name</label>
                  <p className="text-lg font-semibold text-slate-900">{university.name}</p>
                </div>

                {university.description && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Description</label>
                    <p className="text-slate-700 leading-relaxed mt-1">{university.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-slate-500">Website</label>
                    {university.website ? (
                      <a 
                        href={university.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[#05294E] hover:underline flex items-center mt-1"
                      >
                        {university.website}
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    ) : (
                      <p className="text-slate-400 mt-1">Not provided</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-500">Location</label>
                    <p className="text-slate-900 mt-1">{university.location}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Contact Information</h3>
              <button
                onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                className="text-slate-500 hover:text-slate-700 flex items-center text-sm"
              >
                {showSensitiveInfo ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-500 flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    Phone
                  </label>
                  <p className="text-slate-900 mt-1">
                    {showSensitiveInfo 
                      ? university.contact?.phone || 'Not provided'
                      : '•••••••••••'
                    }
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    General Email
                  </label>
                  <p className="text-slate-900 mt-1">
                    {showSensitiveInfo 
                      ? university.contact?.email || 'Not provided'
                      : '•••••••••••@•••••••.com'
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-500 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Admissions Email
                  </label>
                  <p className="text-slate-900 mt-1">
                    {showSensitiveInfo 
                      ? university.contact?.admissionsEmail || 'Not provided'
                      : '•••••••••••@•••••••.com'
                    }
                  </p>
                </div>

                {university.contact?.fax && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Fax</label>
                    <p className="text-slate-900 mt-1">
                      {showSensitiveInfo 
                        ? university.contact.fax
                        : '•••••••••••'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Academic Programs */}
          {university.programs && university.programs.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Academic Programs</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {university.programs.map((program, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 text-center hover:from-[#05294E]/5 hover:to-blue-50 hover:border-[#05294E]/20 transition-all duration-300"
                  >
                    {program}
                  </div>
                ))}
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