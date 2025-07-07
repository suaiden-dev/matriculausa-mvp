import React, { useState } from 'react';
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

interface ProfileManagementProps {
  profile: any;
  onUpdateProfile: (data: any) => void;
}

const ProfileManagement: React.FC<ProfileManagementProps> = ({
  profile,
  onUpdateProfile
}) => {
  const [isEditing, setIsEditing] = useState(false);
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
  };

  const handleSave = () => {
    const updatedData = {
      ...formData,
      gpa: parseFloat(formData.gpa) || 0
    };
    onUpdateProfile(updatedData);
    setIsEditing(false);
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Student Profile</h2>
          <p className="text-slate-600">Manage your academic profile and preferences</p>
        </div>
        
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isEditing ? (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900">Edit Profile</h3>
              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium flex items-center"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="flex items-center space-x-6 mb-8">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <User className="h-12 w-12 text-white" />
                </div>
                <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white text-blue-600 rounded-lg flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 border border-slate-200">
                  <Camera className="h-4 w-4" />
                </button>
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
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">Complete Your Profile</h4>
              <p className="text-sm text-yellow-700 mb-4">
                A complete profile helps us match you with the most relevant scholarship opportunities. 
                Consider adding the missing information to improve your chances of finding the perfect scholarships.
              </p>
              <div className="flex flex-wrap gap-2">
                {!profile?.phone && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium">
                    Add phone number
                  </span>
                )}
                {!profile?.country && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium">
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