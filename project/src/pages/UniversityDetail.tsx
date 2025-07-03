import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MapPin, ExternalLink, ArrowLeft, Sparkles, Phone, Mail, Fan as Fax, DollarSign, Award, Clock, Edit, Settings } from 'lucide-react';
import { mockSchools } from '../data/mockData';
import { supabase } from '../lib/supabase';
import type { Scholarship } from '../types';
import Header from '../components/Header';

const UniversityDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [university, setUniversity] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(university?.image_url || university?.image || university?.logo_url);
  const [formData, setFormData] = useState({
    name: university?.name || '',
    description: university?.description || '',
    website: university?.website || '',
    location: university?.location || '',
    address: university?.address || { street: '', city: '', state: '', zipCode: '', country: '' },
    contact: university?.contact || { phone: '', email: '', admissionsEmail: '', fax: '' },
    programs: university?.programs || []
  });
  const [newProgram, setNewProgram] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar se o usuário logado é dono desta universidade
  const isOwner = user?.role === 'school' && university?.user_id === user?.id;

  useEffect(() => {
    const fetchUniversity = async () => {
      // Try mock first
      const uni = mockSchools.find(school => slugify(school.name) === slug);
      if (uni) {
        setUniversity(uni);
        setLoading(false);
        return;
      }
      // Try Supabase
      const { data } = await supabase
        .from('universities')
        .select('*')
        .eq('slug', slug);
      if (data && data.length > 0) {
        setUniversity(data[0]);
      } else {
        setUniversity(null);
      }
      setLoading(false);
    };
    fetchUniversity();
  }, [slug]);

  useEffect(() => {
    setFormData({
      name: university?.name || '',
      description: university?.description || '',
      website: university?.website || '',
      location: university?.location || '',
      address: university?.address || { street: '', city: '', state: '', zipCode: '', country: '' },
      contact: university?.contact || { phone: '', email: '', admissionsEmail: '', fax: '' },
      programs: university?.programs || []
    });
    setImageUrl(university?.image_url || university?.image || university?.logo_url);
  }, [university]);

  const handleEditClick = () => setIsEditing(true);
  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: university?.name || '',
      description: university?.description || '',
      website: university?.website || '',
      location: university?.location || '',
      address: university?.address || { street: '', city: '', state: '', zipCode: '', country: '' },
      contact: university?.contact || { phone: '', email: '', admissionsEmail: '', fax: '' },
      programs: university?.programs || []
    });
    setImageUrl(university?.image_url || university?.image || university?.logo_url);
    setUploadError(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };
  const handleAddressChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, address: { ...prev.address, [field]: value } }));
  };
  const handleContactChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, contact: { ...prev.contact, [field]: value } }));
  };
  const handleAddProgram = () => {
    if (newProgram.trim()) {
      setFormData((prev: any) => ({ ...prev, programs: [...prev.programs, newProgram.trim()] }));
      setNewProgram('');
    }
  };
  const handleRemoveProgram = (index: number) => {
    setFormData((prev: any) => ({ ...prev, programs: prev.programs.filter((_: any, i: number) => i !== index) }));
  };
  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !university) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `university_${university.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('university-profile-pictures')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage
        .from('university-profile-pictures')
        .getPublicUrl(fileName);
      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error('Could not get image URL');
      setImageUrl(publicUrl);
    } catch (err: any) {
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  const handleSave = async () => {
    if (!university) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      // Montar updateData apenas com campos válidos, igual ao ProfileManagement
      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        website: formData.website.trim() || null,
        location: formData.location.trim() || null,
        address: formData.address,
        contact: formData.contact,
        programs: formData.programs,
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      };
      // LOGS PARA DEBUG
      console.log('USER:', user);
      console.log('isAuthenticated:', isAuthenticated);
      console.log('updateData enviado para o Supabase:', updateData);
      // Não enviar id, user_id, type, created_at, is_approved, terms_accepted, profile_completed
      const { error } = await supabase
        .from('universities')
        .update(updateData)
        .eq('id', university.id);
      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      // Recarregar dados
      const { data } = await supabase
        .from('universities')
        .select('*')
        .eq('id', university.id);
      if (data && data.length > 0) setUniversity(data[0]);
    } catch (error: any) {
      setErrorMessage('Failed to update profile. Please try again.');
      console.error('Erro no catch do update:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditProfile = () => {
    if (isOwner) {
      navigate('/school/dashboard/profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading university details...</p>
        </div>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">University not found</h1>
          <Link to="/schools" className="text-[#05294E] hover:underline">
            Back to Universities
          </Link>
        </div>
      </div>
    );
  }

  // Fallbacks for missing fields in real data
  const programs = university.programs || [];
  const address = typeof university.address === 'string'
    ? { street: university.address }
    : university.address || {};
  const contact = university.contact || {};

  return (
    <>
      <Header />
    <div className="min-h-screen bg-white">
      {/* Header Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {isOwner && (
              isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEditClick}
                  className="inline-flex items-center px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#05294E]/90 transition-colors text-sm font-medium"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              )
            )}
          {successMessage && <div className="text-green-600 mt-2">{successMessage}</div>}
          {errorMessage && <div className="text-red-600 mt-2">{errorMessage}</div>}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative h-80 overflow-hidden">
        <img
          src={imageUrl || '/university-placeholder.png'}
          alt={`${formData.name} campus`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40"></div>
        {isOwner && isEditing && (
          <div className="absolute top-4 right-4 z-10">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleBannerChange}
              className="hidden"
              id="banner-upload"
              disabled={uploading}
                title="Upload university banner image"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-white/80 text-[#05294E] px-4 py-2 rounded-lg shadow hover:bg-white"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Change Banner'}
            </button>
            {uploadError && <div className="text-red-600 text-xs mt-1">{uploadError}</div>}
          </div>
        )}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
            <div className="text-white">
              <div className="flex items-center space-x-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  university.type === 'Private' ? 'bg-[#05294E]' : 'bg-green-600'
                }`}>
                  {university.type || (university.is_public ? 'Public' : 'Private')}
                </span>
                {isOwner && (
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                    <Settings className="h-3 w-3 mr-1" />
                    Your University
                  </span>
                )}
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  className="text-4xl md:text-5xl font-black mb-3 bg-white/80 text-[#05294E] rounded-lg px-4 py-2 w-full"
                  placeholder="University Name"
                />
              ) : (
                <h1 className="text-4xl md:text-5xl font-black mb-3">
                  {university.name}
                </h1>
              )}
              <div className="flex items-center text-lg">
                <MapPin className="h-5 w-5 mr-2" />
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => handleInputChange('location', e.target.value)}
                    className="bg-white/80 text-[#05294E] rounded-lg px-2 py-1 w-1/2"
                    placeholder="Location"
                  />
                ) : (
                  university.location
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">About</h2>
              </div>
              {isEditing ? (
                <textarea
                  value={formData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                  rows={4}
                  placeholder="Describe your university..."
                />
              ) : (
                <p className="text-gray-600 leading-relaxed">
                  {university.description}
                </p>
              )}
            </section>

            {/* Programs */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Academic Programs</h2>
              </div>
              {isEditing ? (
                <div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newProgram}
                      onChange={e => setNewProgram(e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded-lg"
                      placeholder="Add new program"
                    />
                    <button
                      type="button"
                      onClick={handleAddProgram}
                      className="bg-[#05294E] text-white px-3 py-1 rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {formData.programs.length > 0 ? formData.programs.map((program: string, index: number) => (
                      <div key={index} className="bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 text-center flex items-center justify-between">
                        <span>{program}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProgram(index)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    )) : <div className="text-gray-400 col-span-2 md:col-span-3">No programs listed</div>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {programs.length > 0 ? programs.map((program: string, index: number) => (
                    <div 
                      key={index}
                      className="bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 text-center"
                    >
                      {program}
                    </div>
                  )) : <div className="text-gray-400 col-span-2 md:col-span-3">No programs listed</div>}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Contact Information</h3>
              </div>
              {/* Address */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Address</h4>
                {isEditing ? (
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={e => handleAddressChange('street', e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded-lg"
                      placeholder="Street"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={e => handleAddressChange('city', e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded-lg w-1/2"
                        placeholder="City"
                      />
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={e => handleAddressChange('state', e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded-lg w-1/4"
                        placeholder="State"
                      />
                      <input
                        type="text"
                        value={formData.address.zipCode}
                        onChange={e => handleAddressChange('zipCode', e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded-lg w-1/4"
                        placeholder="ZIP Code"
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={e => handleAddressChange('country', e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded-lg"
                      placeholder="Country"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{address.street}</p>
                    <p>{address.city}{address.city && address.state ? ',' : ''} {address.state} {address.zipCode}</p>
                    <p>{address.country}</p>
                  </div>
                )}
              </div>
              {/* Contact Details */}
              <div className="space-y-3">
                {['phone', 'email', 'admissionsEmail', 'fax'].map((field) => (
                  <div className="flex items-center" key={field}>
                    {field === 'phone' && <Phone className="h-4 w-4 mr-3 text-[#05294E]" />}
                    {field === 'email' && <Mail className="h-4 w-4 mr-3 text-[#05294E]" />}
                    {field === 'admissionsEmail' && <Mail className="h-4 w-4 mr-3 text-[#D0151C]" />}
                    {field === 'fax' && <Fax className="h-4 w-4 mr-3 text-gray-500" />}
                    <div>
                      <div className="text-sm font-medium text-gray-700 capitalize">{field === 'admissionsEmail' ? 'Admissions Email' : field.charAt(0).toUpperCase() + field.slice(1)}</div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.contact[field]}
                          onChange={e => handleContactChange(field, e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-lg"
                          placeholder={field === 'admissionsEmail' ? 'Admissions Email' : field.charAt(0).toUpperCase() + field.slice(1)}
                        />
                      ) : (
                        <div className="text-sm text-gray-600">{contact[field]}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Website Link */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Website</h3>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.website}
                  onChange={e => handleInputChange('website', e.target.value)}
                  className="w-full px-2 py-1 border border-slate-200 rounded-lg"
                  placeholder="https://university.edu"
                  aria-label="University website"
                />
              ) : university.website ? (
                <a
                  href={university.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-[#05294E] text-white py-3 px-4 rounded-lg hover:bg-[#05294E]/90 transition-colors text-center font-medium"
                >
                  <div className="flex items-center justify-center">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Official Website
                  </div>
                </a>
              ) : (
                <div className="text-gray-400">No website provided</div>
              )}
            </div>
            {/* Scholarships CTA */}
            <div className="bg-[#D0151C]/10 border border-[#D0151C]/20 rounded-xl p-6">
              <div className="text-center">
                <div className="bg-[#D0151C] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Scholarship Opportunities
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Discover exclusive scholarships available at {formData.name}
                </p>
                <Link
                  to="/scholarships"
                  className="block bg-[#D0151C] text-white py-2 px-4 rounded-lg hover:bg-[#D0151C]/90 transition-colors text-sm font-medium"
                >
                  View Scholarships
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default UniversityDetail;

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}