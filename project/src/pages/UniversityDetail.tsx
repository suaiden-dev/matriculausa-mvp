import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { MapPin, ExternalLink, ArrowLeft, Sparkles, Phone, Mail, Fan as Fax, DollarSign, Award, Clock, Edit, Settings } from 'lucide-react';
import { mockSchools } from '../data/mockData';
import { supabase } from '../lib/supabase';
import type { Scholarship } from '../types';
import Header from '../components/Header';
import { slugify } from '../utils/slugify';

const UniversityDetail: React.FC = () => {
  const { t } = useTranslation();
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
      console.log('Fetching university with slug:', slug);
      console.log('Testing slugify function:', slugify('Adelphi University'));
      
      if (!slug) {
        setUniversity(null);
        setLoading(false);
        return;
      }
      
      // Try Supabase first - search by name using the slug
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('is_approved', true);
      
      console.log('Supabase search result:', { data, error });
      
      if (data && data.length > 0) {
        console.log('Available universities:', data.map(u => ({ name: u.name, slug: slugify(u.name) })));
        
        // Find the best match by comparing slugified names
        const bestMatch = data.find(uni => slugify(uni.name) === slug);
        console.log('Best match found:', bestMatch);
        
        if (bestMatch) {
          setUniversity(bestMatch);
          setLoading(false);
          return;
        }
        
        // If no exact match, try partial matching
        const partialMatch = data.find(uni => {
          const uniSlug = slugify(uni.name);
          return uniSlug.includes(slug) || slug.includes(uniSlug);
        });
        
        if (partialMatch) {
          console.log('Partial match found:', partialMatch);
          setUniversity(partialMatch);
          setLoading(false);
          return;
        }
        
        // If no match at all, try fuzzy matching
        const fuzzyMatch = data.find(uni => {
          const uniName = uni.name.toLowerCase();
          const searchName = slug.replace(/-/g, ' ').toLowerCase();
          return uniName.includes(searchName) || searchName.includes(uniName);
        });
        
        if (fuzzyMatch) {
          console.log('Fuzzy match found:', fuzzyMatch);
          setUniversity(fuzzyMatch);
          setLoading(false);
          return;
        }
        
        // If no match at all, use the first result as fallback
        console.log('No match found, using first result:', data[0]);
        setUniversity(data[0]);
      } else {
        // Try mock as fallback
        console.log('No Supabase results, trying mock data');
        const uni = mockSchools.find(school => slugify(school.name) === slug);
        if (uni) {
          console.log('Found in mock data:', uni);
          setUniversity(uni);
        } else {
          console.log('University not found in mock data either');
          setUniversity(null);
        }
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
    setImageUrl(university?.banner_url || university?.image_url || university?.image || university?.logo_url);
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
      setUploadError(t('universityDetailPage.messages.uploadError'));
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
      setSuccessMessage(t('universityDetailPage.editProfile.successMessage'));
      setTimeout(() => setSuccessMessage(null), 3000);
      // Recarregar dados
      const { data } = await supabase
        .from('universities')
        .select('*')
        .eq('id', university.id);
      if (data && data.length > 0) setUniversity(data[0]);
    } catch (error: any) {
      setErrorMessage(t('universityDetailPage.editProfile.errorMessage'));
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
          <p className="text-gray-600">{t('universityDetailPage.loading')}</p>
        </div>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('universityDetailPage.notFound.title')}</h1>
          <Link to="/schools" className="text-[#05294E] hover:underline">
            {t('universityDetailPage.notFound.backLink')}
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
      {/* Success/Error Messages */}
      {(successMessage || errorMessage) && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {successMessage && <div className="text-green-600">{successMessage}</div>}
            {errorMessage && <div className="text-red-600">{errorMessage}</div>}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative h-80 overflow-hidden">
        <img
          src={university.banner_url || university.image_url || '/university-placeholder.png'}
          alt={`${formData.name} campus`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Edit Controls - Top Right */}
        {isOwner && (
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            {isEditing ? (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-lg"
                  >
                    {t('universityDetailPage.editProfile.saveButton')}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium shadow-lg"
                  >
                    {t('universityDetailPage.editProfile.cancelButton')}
                  </button>
                </div>
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
                  className="bg-white/90 text-[#05294E] px-4 py-2 rounded-lg shadow-lg hover:bg-white transition-colors text-sm font-medium"
                  disabled={uploading}
                >
                  {uploading ? t('universityDetailPage.editProfile.uploadingBanner') : t('universityDetailPage.editProfile.changeBanner')}
                </button>
                {uploadError && <div className="text-red-600 text-xs mt-1 bg-white/90 px-2 py-1 rounded">{uploadError}</div>}
              </>
            ) : (
              <button
                onClick={handleEditClick}
                className="inline-flex items-center px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#05294E]/90 transition-colors text-sm font-medium shadow-lg"
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('universityDetailPage.editProfile.editButton')}
              </button>
            )}
          </div>
        )}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
            
            <div className="text-white">
              {/* Badges com Backdrop Blur */}
              <div className="flex items-center space-x-3 mb-4">
                {isOwner && (
                  <span className="bg-blue-500/90 backdrop-blur-md border border-white/20 text-white px-3 py-2 rounded-full text-sm font-medium flex items-center shadow-lg">
                    <Settings className="h-3 w-3 mr-1" />
                    {t('universityDetailPage.editProfile.yourUniversity')}
                  </span>
                )}
              </div>
              
              {/* Nome da Universidade com Backdrop Blur */}
              <div className="mb-3">
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    className="text-4xl md:text-5xl font-black w-full bg-white/95 backdrop-blur-sm text-[#05294E] rounded-xl px-6 py-4 shadow-2xl border-2 border-white/30 focus:outline-none focus:ring-4 focus:ring-white/50 focus:border-white transition-all duration-300"
                    placeholder={t('universityDetailPage.placeholders.universityName')}
                  />
                ) : (
                  <div className="relative group">
                    {/* Card com backdrop blur atrás do texto */}
                    <div className="bg-black/40 backdrop-blur-md rounded-xl px-6 py-4 inline-block">
                      <h1 className="text-4xl md:text-5xl font-black text-white">
                        {university.name}
                      </h1>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Localização com Backdrop Blur */}
              <div className="flex items-center text-lg">
                <MapPin className="h-5 w-5 mr-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => handleInputChange('location', e.target.value)}
                    className="bg-white/95 backdrop-blur-sm text-[#05294E] rounded-lg px-4 py-2 w-1/2 shadow-lg border-2 border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white transition-all duration-300"
                    placeholder={t('universityDetailPage.placeholders.location')}
                  />
                ) : (
                  <div className="bg-black/40 backdrop-blur-md rounded-lg px-4 py-2 inline-block">
                    <span className="text-white font-medium">
                      {university.location}
                    </span>
                  </div>
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
                <h2 className="text-2xl font-bold text-gray-900">{t('universityDetailPage.sections.about')}</h2>
              </div>
              {isEditing ? (
                <textarea
                  value={formData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                  rows={4}
                  placeholder={t('universityDetailPage.placeholders.description')}
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
                <h2 className="text-2xl font-bold text-gray-900">{t('universityDetailPage.sections.academicPrograms')}</h2>
              </div>
              {isEditing ? (
                <div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newProgram}
                      onChange={e => setNewProgram(e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded-lg"
                      placeholder={t('universityDetailPage.placeholders.addNewProgram')}
                    />
                    <button
                      type="button"
                      onClick={handleAddProgram}
                      className="bg-[#05294E] text-white px-3 py-1 rounded-lg"
                    >
                      {t('universityDetailPage.buttons.add')}
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
                          {t('universityDetailPage.buttons.remove')}
                        </button>
                      </div>
                    )) : <div className="text-gray-400 col-span-2 md:col-span-3">{t('universityDetailPage.messages.noProgramsListed')}</div>}
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
                  )) : <div className="text-gray-400 col-span-2 md:col-span-3">{t('universityDetailPage.messages.noProgramsListed')}</div>}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{t('universityDetailPage.sections.contactInformation')}</h3>
              </div>
              {/* Address */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('universityDetailPage.sections.address')}</h4>
                {isEditing ? (
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={e => handleAddressChange('street', e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded-lg"
                      placeholder={t('universityDetailPage.placeholders.street')}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={e => handleAddressChange('city', e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded-lg w-1/2"
                        placeholder={t('universityDetailPage.placeholders.city')}
                      />
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={e => handleAddressChange('state', e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded-lg w-1/4"
                        placeholder={t('universityDetailPage.placeholders.state')}
                      />
                      <input
                        type="text"
                        value={formData.address.zipCode}
                        onChange={e => handleAddressChange('zipCode', e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded-lg w-1/4"
                        placeholder={t('universityDetailPage.placeholders.zipCode')}
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={e => handleAddressChange('country', e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded-lg"
                      placeholder={t('universityDetailPage.placeholders.country')}
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
                      <div className="text-sm font-medium text-gray-700 capitalize">{t(`universityDetailPage.contact.${field}`)}</div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.contact[field]}
                          onChange={e => handleContactChange(field, e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded-lg"
                          placeholder={t(`universityDetailPage.contact.${field}`)}
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">{t('universityDetailPage.sections.website')}</h3>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.website}
                  onChange={e => handleInputChange('website', e.target.value)}
                  className="w-full px-2 py-1 border border-slate-200 rounded-lg"
                  placeholder={t('universityDetailPage.placeholders.website')}
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
                    {t('universityDetailPage.buttons.visitWebsite')}
                  </div>
                </a>
              ) : (
                <div className="text-gray-400">{t('universityDetailPage.messages.noWebsiteProvided')}</div>
              )}
            </div>
            {/* Scholarships CTA */}
            <div className="bg-[#D0151C]/10 border border-[#D0151C]/20 rounded-xl p-6">
              <div className="text-center">
                <div className="bg-[#D0151C] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {t('universityDetailPage.sections.scholarshipOpportunities')}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('universityDetailPage.messages.scholarshipDescription')} {formData.name}
                </p>
                <Link
                  to="/scholarships"
                  className="block bg-[#D0151C] text-white py-2 px-4 rounded-lg hover:bg-[#D0151C]/90 transition-colors text-sm font-medium"
                >
                  {t('universityDetailPage.buttons.viewScholarships')}
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