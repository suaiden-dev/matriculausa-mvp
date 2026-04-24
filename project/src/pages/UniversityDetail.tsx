import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { MapPin, ExternalLink, Phone, Mail, Fan as Fax, Edit, ArrowLeft, GraduationCap } from 'lucide-react';
import { mockSchools } from '../data/mockData';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { slugify } from '../utils/slugify';

const UniversityDetail: React.FC = () => {
  const { t } = useTranslation(['school', 'common']);
  const { slug } = useParams<{ slug: string }>();
  const [university, setUniversity] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    location: '',
    address: { street: '', city: '', state: '', zipCode: '', country: '' },
    contact: { phone: '', email: '', admissionsEmail: '', fax: '' },
    programs: [] as string[]
  });
  const [newProgram, setNewProgram] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOwner = user?.role === 'school' && university?.user_id === user?.id;

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const fetchUniversity = async () => {
      if (!slug) { setUniversity(null); setLoading(false); return; }
      const { data } = await supabase.from('universities').select('*').eq('is_approved', true);
      if (data && data.length > 0) {
        const best = data.find(u => slugify(u.name) === slug)
          || data.find(u => { const s = slugify(u.name); return s.includes(slug) || slug.includes(s); })
          || data.find(u => { const n = u.name.toLowerCase(); const q = slug.replace(/-/g, ' ').toLowerCase(); return n.includes(q) || q.includes(n); })
          || data[0];
        setUniversity(best);
      } else {
        setUniversity(mockSchools.find(s => slugify(s.name) === slug) || null);
      }
      setLoading(false);
    };
    fetchUniversity();
  }, [slug]);

  useEffect(() => {
    if (!university) return;
    setFormData({
      name: university.name || '',
      description: university.description || '',
      website: university.website || '',
      location: university.location || '',
      address: university.address || { street: '', city: '', state: '', zipCode: '', country: '' },
      contact: university.contact || { phone: '', email: '', admissionsEmail: '', fax: '' },
      programs: university.programs || []
    });
    setImageUrl(university.banner_url || university.image_url || university.image || university.logo_url);
  }, [university]);

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: university?.name || '', description: university?.description || '',
      website: university?.website || '', location: university?.location || '',
      address: university?.address || { street: '', city: '', state: '', zipCode: '', country: '' },
      contact: university?.contact || { phone: '', email: '', admissionsEmail: '', fax: '' },
      programs: university?.programs || []
    });
    setImageUrl(university?.banner_url || university?.image_url || university?.image || university?.logo_url);
    setUploadError(null); setErrorMessage(null); setSuccessMessage(null);
  };

  const handleInputChange = (field: string, value: any) =>
    setFormData((p: any) => ({ ...p, [field]: value }));
  const handleAddressChange = (field: string, value: string) =>
    setFormData((p: any) => ({ ...p, address: { ...p.address, [field]: value } }));
  const handleContactChange = (field: string, value: string) =>
    setFormData((p: any) => ({ ...p, contact: { ...p.contact, [field]: value } }));
  const handleAddProgram = () => {
    if (newProgram.trim()) {
      setFormData((p: any) => ({ ...p, programs: [...p.programs, newProgram.trim()] }));
      setNewProgram('');
    }
  };
  const handleRemoveProgram = (i: number) =>
    setFormData((p: any) => ({ ...p, programs: p.programs.filter((_: any, idx: number) => idx !== i) }));

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !university) return;
    setUploading(true); setUploadError(null);
    try {
      const ext = file.name.split('.').pop();
      const name = `university_${university.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('university-profile-pictures').upload(name, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('university-profile-pictures').getPublicUrl(name);
      if (!urlData?.publicUrl) throw new Error('No URL');
      setImageUrl(urlData.publicUrl);
    } catch { setUploadError(t('universityDetailPage.messages.uploadError')); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!university) return;
    setSaving(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const { error } = await supabase.from('universities').update({
        name: formData.name.trim(), description: formData.description.trim() || null,
        website: formData.website.trim() || null, location: formData.location.trim() || null,
        address: formData.address, contact: formData.contact, programs: formData.programs,
        image_url: imageUrl, updated_at: new Date().toISOString()
      }).eq('id', university.id);
      if (error) throw error;
      setIsEditing(false);
      setSuccessMessage(t('universityDetailPage.editProfile.successMessage'));
      setTimeout(() => setSuccessMessage(null), 3000);
      const { data } = await supabase.from('universities').select('*').eq('id', university.id);
      if (data?.[0]) setUniversity(data[0]);
    } catch { setErrorMessage(t('universityDetailPage.editProfile.errorMessage')); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-stone-400 text-xs tracking-[0.3em] uppercase">{t('universityDetailPage.loading')}</p>
        </div>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-300 text-xs tracking-[0.3em] uppercase mb-4">404</p>
          <h1 className="text-3xl font-black text-stone-900 mb-6">{t('universityDetailPage.notFound.title')}</h1>
          <Link to="/schools" className="text-sm text-stone-500 hover:text-stone-900 underline underline-offset-4 transition-colors">
            {t('universityDetailPage.notFound.backLink')}
          </Link>
        </div>
      </div>
    );
  }

  const programs: string[] = university.programs || [];
  const address = typeof university.address === 'string' ? { street: university.address } : university.address || {};
  const contact = university.contact || {};

  return (
    <>
      <Header />
      <div className="min-h-screen bg-stone-50">

        {/* Feedback toast */}
        {(successMessage || errorMessage) && (
          <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium transition-all ${successMessage ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {successMessage || errorMessage}
          </div>
        )}

        {/* ── HERO — Magazine Cover ── */}
        <section className="relative min-h-[90vh] flex flex-col overflow-hidden bg-stone-950">
          {/* Subtle texture/glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-950 to-stone-950" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-stone-800/30 rounded-full blur-[100px] pointer-events-none" />

          {/* Top bar */}
          <div className="relative z-10 flex items-center justify-between px-6 lg:px-14 pt-24 lg:pt-28">
            <Link to="/schools" className="flex items-center gap-2 text-white/40 hover:text-white/80 text-sm tracking-wide transition-colors">
              <ArrowLeft className="w-4 h-4" />
              {t('universityDetailPage.notFound.backLink')}
            </Link>

            {isOwner && (
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button onClick={handleSave} disabled={saving}
                      className="px-5 py-2 bg-white text-stone-900 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors shadow-lg disabled:opacity-50">
                      {saving ? 'Salvando...' : t('universityDetailPage.editProfile.saveButton')}
                    </button>
                    <button onClick={handleCancel} disabled={saving}
                      className="px-5 py-2 bg-white/10 text-white rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-sm">
                      {t('universityDetailPage.editProfile.cancelButton')}
                    </button>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleBannerChange} className="hidden" id="banner-upload" disabled={uploading} />
                    <label htmlFor="banner-upload"
                      className="px-5 py-2 bg-white/10 text-white rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-sm cursor-pointer">
                      {uploading ? t('universityDetailPage.editProfile.uploadingBanner') : t('universityDetailPage.editProfile.changeBanner')}
                    </label>
                    {uploadError && <p className="text-red-300 text-xs">{uploadError}</p>}
                  </>
                ) : (
                  <button onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-5 py-2 bg-white/10 text-white rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-sm">
                    <Edit className="w-4 h-4" />
                    {t('universityDetailPage.editProfile.editButton')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Hero content — magazine layout */}
          <div className="relative z-10 mt-auto px-6 lg:px-14 pb-16 lg:pb-24">
            <div className="flex flex-col lg:flex-row items-end gap-10 lg:gap-16">
              {/* Left: Text */}
              <div className="flex-1">
                <p className="text-[10px] text-white/30 tracking-[0.5em] uppercase mb-6">
                  {university.type || 'University'}
                </p>

                {isEditing ? (
                  <input type="text" value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    className="text-4xl md:text-5xl font-black w-full bg-white/10 backdrop-blur-sm text-white rounded-2xl px-6 py-4 border border-white/20 focus:outline-none focus:border-white/50 transition-all mb-6 block"
                    placeholder={t('universityDetailPage.placeholders.universityName')}
                  />
                ) : (
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-none tracking-tighter mb-6">
                    {university.name}
                  </h1>
                )}

                <div className="flex items-center gap-2 text-white/40">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {isEditing ? (
                    <input type="text" value={formData.location}
                      onChange={e => handleInputChange('location', e.target.value)}
                      className="bg-white/10 text-white rounded-lg px-4 py-2 border border-white/20 focus:outline-none focus:border-white/50 text-sm w-72 backdrop-blur-sm"
                      placeholder={t('universityDetailPage.placeholders.location')}
                    />
                  ) : (
                    <span className="text-sm tracking-wide">{university.location}</span>
                  )}
                </div>
              </div>

              {/* Right: Logo/Image in controlled frame */}
              {imageUrl && !isEditing && (
                <div className="shrink-0 w-40 h-40 lg:w-52 lg:h-52 rounded-3xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center p-4">
                  <img
                    src={imageUrl}
                    alt={university.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── CONTENT — Stacked Sections ── */}
        <div className="max-w-3xl mx-auto px-6 lg:px-8 pb-40">

          {/* About */}
          {(university.description || isEditing) && (
            <section className="py-16 lg:py-20 border-b border-stone-200">
              <p className="text-[10px] text-stone-400 tracking-[0.4em] uppercase mb-10">
                {t('universityDetailPage.sections.about')}
              </p>
              {isEditing ? (
                <textarea value={formData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all text-stone-700 leading-relaxed text-lg resize-none"
                  rows={6} placeholder={t('universityDetailPage.placeholders.description')}
                />
              ) : (
                <p className="text-xl lg:text-2xl text-stone-500 leading-relaxed font-light">
                  {university.description}
                </p>
              )}
            </section>
          )}

          {/* Programs */}
          {(programs.length > 0 || isEditing) && (
            <section className="py-16 lg:py-20 border-b border-stone-200">
              <p className="text-[10px] text-stone-400 tracking-[0.4em] uppercase mb-10">
                {t('universityDetailPage.sections.academicPrograms')}
              </p>
              {isEditing ? (
                <div>
                  <div className="flex gap-3 mb-6">
                    <input type="text" value={newProgram}
                      onChange={e => setNewProgram(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddProgram()}
                      className="flex-1 px-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                      placeholder={t('universityDetailPage.placeholders.addNewProgram')}
                    />
                    <button type="button" onClick={handleAddProgram}
                      className="px-5 py-3 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-700 transition-colors">
                      {t('universityDetailPage.buttons.add')}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {formData.programs.map((p: string, i: number) => (
                      <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl bg-stone-100 group">
                        <span className="text-stone-700 text-sm">{p}</span>
                        <button onClick={() => handleRemoveProgram(i)} className="text-stone-300 hover:text-red-500 text-xs transition-colors">
                          {t('universityDetailPage.buttons.remove')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {programs.map((program, i) => (
                    <div key={i} className="flex items-center gap-6 py-5 group hover:bg-stone-100/60 -mx-4 px-4 rounded-xl transition-colors cursor-default">
                      <span className="text-xs text-stone-300 font-mono w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-stone-600 font-medium group-hover:text-stone-900 transition-colors">{program}</span>
                      <GraduationCap className="w-4 h-4 text-stone-200 group-hover:text-stone-400 transition-colors ml-auto shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Contact */}
          {(Object.values(contact).some(Boolean) || Object.values(address).some(Boolean) || isEditing) && (
            <section className="py-16 lg:py-20">
              <p className="text-[10px] text-stone-400 tracking-[0.4em] uppercase mb-10">
                {t('universityDetailPage.sections.contactInformation')}
              </p>
              {isEditing ? (
                <div className="space-y-4">
                  <p className="text-xs text-stone-500 font-semibold uppercase tracking-widest">{t('universityDetailPage.sections.address')}</p>
                  {['street', 'city', 'state', 'zipCode', 'country'].map(f => (
                    <input key={f} type="text" value={(formData.address as any)[f]}
                      onChange={e => handleAddressChange(f, e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                      placeholder={t(`universityDetailPage.placeholders.${f}`, f)}
                    />
                  ))}
                  <p className="text-xs text-stone-500 font-semibold uppercase tracking-widest pt-4">{t('universityDetailPage.sections.contactInformation')}</p>
                  {['phone', 'email', 'admissionsEmail', 'fax'].map(f => (
                    <input key={f} type="text" value={(formData.contact as any)[f]}
                      onChange={e => handleContactChange(f, e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                      placeholder={t(`universityDetailPage.contact.${f}`, f)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Address block */}
                  {Object.values(address).some(Boolean) && (
                    <div>
                      <p className="text-xs text-stone-400 tracking-[0.3em] uppercase mb-4">{t('universityDetailPage.sections.address')}</p>
                      <div className="space-y-1 text-stone-600">
                        {address.street && <p>{address.street}</p>}
                        {(address.city || address.state) && (
                          <p>{[address.city, address.state, address.zipCode].filter(Boolean).join(', ')}</p>
                        )}
                        {address.country && <p>{address.country}</p>}
                      </div>
                    </div>
                  )}
                  {/* Contact block */}
                  {Object.values(contact).some(Boolean) && (
                    <div className="space-y-4">
                      {contact.phone && (
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-stone-400 tracking-widest uppercase mb-0.5">{t('universityDetailPage.contact.phone')}</p>
                            <p className="text-stone-700 text-sm">{contact.phone}</p>
                          </div>
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-start gap-3">
                          <Mail className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-stone-400 tracking-widest uppercase mb-0.5">{t('universityDetailPage.contact.email')}</p>
                            <a href={`mailto:${contact.email}`} className="text-stone-700 text-sm hover:text-stone-900 transition-colors">{contact.email}</a>
                          </div>
                        </div>
                      )}
                      {contact.admissionsEmail && (
                        <div className="flex items-start gap-3">
                          <Mail className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-stone-400 tracking-widest uppercase mb-0.5">{t('universityDetailPage.contact.admissionsEmail')}</p>
                            <a href={`mailto:${contact.admissionsEmail}`} className="text-stone-700 text-sm hover:text-stone-900 transition-colors">{contact.admissionsEmail}</a>
                          </div>
                        </div>
                      )}
                      {contact.fax && (
                        <div className="flex items-start gap-3">
                          <Fax className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-stone-400 tracking-widest uppercase mb-0.5">{t('universityDetailPage.contact.fax')}</p>
                            <p className="text-stone-700 text-sm">{contact.fax}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── STICKY ACTION BAR ── */}
        <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${showStickyBar ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
          <div className="bg-white/90 backdrop-blur-xl border-t border-stone-200/80 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
            <div className="max-w-3xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] text-stone-400 tracking-[0.3em] uppercase mb-0.5">Universidade</p>
                <p className="font-bold text-stone-900 text-sm truncate">{university.name}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {university.website && (
                  <a href={university.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 border border-stone-300 text-stone-700 rounded-xl text-sm font-medium hover:border-stone-900 hover:text-stone-900 transition-colors">
                    {t('universityDetailPage.buttons.visitWebsite')}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <Link to="/scholarships"
                  className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-700 transition-colors">
                  {t('universityDetailPage.buttons.viewScholarships')}
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default UniversityDetail;