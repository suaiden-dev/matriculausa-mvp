import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import ScholarshipDetailModal from '../ScholarshipDetailModal';
import { ScholarshipBulkUploadModal } from './ScholarshipBulkUploadModal';
import { is3800ScholarshipBlocked } from '../../utils/scholarshipDeadlineValidation';

interface AdminScholarshipSelectionProps {
  studentProfileId: string; // user_profiles.id
  studentUserId: string;    // user_profiles.user_id
}

interface ScholarshipItem {
  id: string;
  title: string;
  universities?: { name?: string | null } | null;
  // Adicionar campos necessários para o modal
  description?: string;
  original_annual_value?: number;
  annual_value_with_scholarship?: number;
  original_value_per_credit?: number;
  application_fee_amount?: number;
  placement_fee_amount?: number;
  field_of_study?: string;
  level?: string;
  delivery_mode?: string;
  duration?: string;
  language?: string;
  deadline?: string;
  is_exclusive?: boolean;
  image_url?: string;
  work_permissions?: string[];
  requirements?: string[] | string;
  benefits?: string[] | string;
  scholarship_percentage?: number;
  total_credits?: number;
}


const AdminScholarshipSelection: React.FC<AdminScholarshipSelectionProps> = ({ studentProfileId, studentUserId }) => {
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [scholarships, setScholarships] = useState<ScholarshipItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [cart, setCart] = useState<string[]>([]);
  const [cartDetails, setCartDetails] = useState<Record<string, { title?: string; universityName?: string }>>({});
  const [applications, setApplications] = useState<any[]>([]);
  const [processType, setProcessType] = useState<'initial' | 'transfer' | 'change_of_status' | ''>('');
  const [selectedScholarship, setSelectedScholarship] = useState<ScholarshipItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Filters
  const [universities, setUniversities] = useState<{ id: string; name: string }[]>([]);
  const [filterUniversityId, setFilterUniversityId] = useState('');
  const [filterScholarshipMin, setFilterScholarshipMin] = useState('');
  const [filterScholarshipMax, setFilterScholarshipMax] = useState('');
  const [filterAppFeeMin, setFilterAppFeeMin] = useState('');
  const [filterAppFeeMax, setFilterAppFeeMax] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterFieldOfStudy, setFilterFieldOfStudy] = useState('');
  const [filterDeliveryMode, setFilterDeliveryMode] = useState('');
  const [filterWorkPermission, setFilterWorkPermission] = useState('');
  const [distinctLevels, setDistinctLevels] = useState<string[]>([]);
  const [distinctFields, setDistinctFields] = useState<string[]>([]);
  const [distinctDeliveryModes, setDistinctDeliveryModes] = useState<string[]>([]);
  const [distinctWorkPermissions, setDistinctWorkPermissions] = useState<string[]>([]);
  const [hideBlocked, setHideBlocked] = useState(false);

  const canMutate = !!(user && (user.role === 'admin' || user.role === 'school'));

  useEffect(() => {
    supabase
      .from('universities')
      .select('id, name')
      .in('name', ['Caroline University', 'Oikos University Los Angeles'])
      .order('name')
      .then(({ data }) => {
        if (data) setUniversities(data);
      });

    // Load distinct filter options
    supabase
      .from('scholarships')
      .select('level, field_of_study, delivery_mode, work_permissions')
      .then(({ data }) => {
        if (data) {
          const levelSet = new Set<string>();
          const fieldSet = new Set<string>();
          const deliverySet = new Set<string>();
          const workPermSet = new Set<string>();
          data.forEach((row: any) => {
            if (row.level) levelSet.add(row.level);
            if (row.field_of_study) fieldSet.add(row.field_of_study);
            if (row.delivery_mode) deliverySet.add(row.delivery_mode);
            if (Array.isArray(row.work_permissions)) {
              row.work_permissions.forEach((wp: any) => {
                if (typeof wp === 'string' && wp.trim() && wp.trim().toUpperCase() !== 'F1') {
                  workPermSet.add(wp.trim());
                }
              });
            }
          });
          setDistinctLevels(Array.from(levelSet).sort());
          setDistinctFields(Array.from(fieldSet).sort());
          setDistinctDeliveryModes(Array.from(deliverySet).sort());
          setDistinctWorkPermissions(Array.from(workPermSet).sort());
        }
      });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar bolsas (com busca por título) - incluir relação com universities e paginação
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let baseSelect = supabase
        .from('scholarships')
        .select(`*, universities(name)`, { count: 'exact' })
        .order('title', { ascending: true });

      if (query) {
        baseSelect = baseSelect.ilike('title', `%${query}%`);
      }
      if (filterUniversityId) {
        baseSelect = baseSelect.eq('university_id', filterUniversityId);
      }
      if (filterScholarshipMin !== '') {
        baseSelect = baseSelect.gte('annual_value_with_scholarship', Number(filterScholarshipMin));
      }
      if (filterScholarshipMax !== '') {
        baseSelect = baseSelect.lte('annual_value_with_scholarship', Number(filterScholarshipMax));
      }
      if (filterAppFeeMin !== '') {
        baseSelect = baseSelect.gte('placement_fee_amount', Number(filterAppFeeMin));
      }
      if (filterAppFeeMax !== '') {
        baseSelect = baseSelect.lte('placement_fee_amount', Number(filterAppFeeMax));
      }
      if (filterLevel) {
        baseSelect = baseSelect.eq('level', filterLevel);
      }
      if (filterFieldOfStudy) {
        baseSelect = baseSelect.ilike('field_of_study', `%${filterFieldOfStudy}%`);
      }
      if (filterDeliveryMode) {
        baseSelect = baseSelect.eq('delivery_mode', filterDeliveryMode);
      }
      if (filterWorkPermission) {
        baseSelect = baseSelect.contains('work_permissions', [filterWorkPermission]);
      }

      const { data: scholarshipsData, error: scholarshipsError, count } = await baseSelect.range(from, to);
      
      if (scholarshipsError) {
        throw scholarshipsError;
      }
      
      setScholarships((scholarshipsData as any) || []);
      setTotal(count || 0);

      // Carrinho do aluno com detalhes (titulo e universidade)
      const { data: cartRows, error: cartError } = await supabase
        .from('user_cart')
        .select('scholarship_id, scholarships(title, universities(name))')
        .eq('user_id', studentUserId);
      if (cartError) throw cartError;
      const newCartDetails: Record<string, { title?: string; universityName?: string }> = {};
      const newCartIds = (cartRows || []).map((r: any) => {
        newCartDetails[r.scholarship_id] = {
           title: r.scholarships?.title,
           universityName: r.scholarships?.universities?.name
        };
        return r.scholarship_id;
      });
      setCartDetails(newCartDetails);
      setCart(newCartIds);

      // Aplicações existentes
      const { data: apps, error: appsErr } = await supabase
        .from('scholarship_applications')
        .select('id, scholarship_id, status, documents, scholarships(title, universities(name))')
        .eq('student_id', studentProfileId)
        .order('created_at', { ascending: false });
      if (appsErr) throw appsErr;
      setApplications(apps || []);

      // Process type sugerido a partir da aplicação mais recente
      const latest = (apps || [])[0] as any;
      if (latest && typeof latest === 'object') {
        const ptype = (latest as any).student_process_type;
        if (ptype && ['initial','transfer','change_of_status'].includes(ptype)) {
          setProcessType(ptype as any);
        }
      }
    } catch (e) {
      // noop (evitar travar UI)
    } finally {
      setLoading(false);
    }
  }, [query, page, pageSize, studentProfileId, studentUserId, filterUniversityId, filterScholarshipMin, filterScholarshipMax, filterAppFeeMin, filterAppFeeMax, filterLevel, filterFieldOfStudy, filterDeliveryMode, filterWorkPermission]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isInCart = (scholarshipId: string) => cart.includes(scholarshipId);

  const toggleCart = async (scholarshipId: string) => {
    if (!canMutate) return;
    try {
      if (isInCart(scholarshipId)) {
        const { error } = await supabase
          .from('user_cart')
          .delete()
          .eq('user_id', studentUserId)
          .eq('scholarship_id', scholarshipId);
        if (error) throw error;
        setCart(prev => prev.filter(id => id !== scholarshipId));
      } else {
        const { error } = await supabase
          .from('user_cart')
          .insert({ user_id: studentUserId, scholarship_id: scholarshipId });
        if (error) throw error;
        
        // Save the details to avoid ID flashing
        const s = scholarships.find(x => x.id === scholarshipId);
        if (s) {
          setCartDetails(prev => ({
            ...prev,
            [scholarshipId]: { title: s.title, universityName: s.universities?.name || undefined }
          }));
        }
        
        setCart(prev => prev.concat(scholarshipId));
      }
    } catch {
      // noop
    }
  };

  const existingApplicationMap = useMemo(() => {
    const map: Record<string, any> = {};
    (applications || []).forEach((a: any) => {
      map[a.scholarship_id] = a;
    });
    return map;
  }, [applications]);

  const createApplicationsFromCart = async () => {
    if (!canMutate || cart.length === 0) return;
    setIsBulkModalOpen(true);
  };

  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleViewScholarship = (scholarship: ScholarshipItem) => {
    setSelectedScholarship(scholarship);
    setIsModalOpen(true);
  };

  const handleUploadAppDocument = async (applicationId: string, docType: 'passport' | 'diploma' | 'funds_proof', file: File) => {
    if (!canMutate) return;
    try {
      const safeDocType = docType.replace(/[^a-z0-9_\-]/gi, '').toLowerCase();
      const sanitized = sanitizeFileName(file.name);
      const timestamp = Date.now();
      const storagePath = `${studentProfileId}/${applicationId}/${safeDocType}_${timestamp}_${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(storagePath, file, { upsert: true, cacheControl: '3600' });
      if (uploadError) return;

      // Preferir armazenar o path (como no fluxo do aluno) para compatibilidade com a visualização
      const storedUrl = storagePath;

      // Buscar documentos atuais da aplicação
      const targetApp = (applications || []).find((a: any) => a.id === applicationId);
      const currentDocs: any[] = Array.isArray(targetApp?.documents) ? targetApp?.documents : [];
      let found = false;
      const updatedDocs = currentDocs.map((d: any) => {
        if (d?.type === safeDocType) {
          found = true;
          return {
            ...d,
            url: storedUrl,
            status: 'under_review',
            uploaded_at: new Date().toISOString()
          };
        }
        return d;
      });
      const finalDocs = found
        ? updatedDocs
        : [...updatedDocs, { type: safeDocType, url: storedUrl, status: 'under_review', uploaded_at: new Date().toISOString() }];

      const { data, error } = await supabase
        .from('scholarship_applications')
        .update({ documents: finalDocs, updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select('id, documents')
        .single();
      if (error) return;

      // Atualizar estado local de applications
      setApplications(prev => {
        const list = Array.isArray(prev) ? prev.slice() : [];
        const idx = list.findIndex((a: any) => a.id === applicationId);
        if (idx >= 0) list[idx] = { ...list[idx], documents: data?.documents || finalDocs };
        return list;
      });

      // Logar submissão
      try {
        await supabase.rpc('log_student_action', {
          p_student_id: studentProfileId,
          p_action_type: 'document_submission',
          p_action_description: `Admin submitted ${safeDocType} for application ${applicationId}`,
          p_performed_by: user?.id || null,
          p_performed_by_type: 'admin',
          p_metadata: {
            application_id: applicationId,
            document_type: safeDocType
          }
        });
      } catch { /* noop */ }
    } catch {
      // noop
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3 w-full">
          <div className="flex items-center gap-3 mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search scholarships by title"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <button
              onClick={() => { setPage(1); loadData(); }}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[#05294E] text-white text-sm hover:bg-[#041f38] disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            {(!!query || !!filterUniversityId || !!filterScholarshipMin || !!filterScholarshipMax || !!filterAppFeeMin || !!filterAppFeeMax || !!filterLevel || !!filterFieldOfStudy || !!filterDeliveryMode || !!filterWorkPermission) && (
              <button
                onClick={() => {
                  setQuery('');
                  setFilterUniversityId('');
                  setFilterScholarshipMin('');
                  setFilterScholarshipMax('');
                  setFilterAppFeeMin('');
                  setFilterAppFeeMax('');
                  setFilterLevel('');
                  setFilterFieldOfStudy('');
                  setFilterDeliveryMode('');
                  setFilterWorkPermission('');
                  setPage(1);
                }}
                disabled={loading}
                className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer w-max hover:text-[#05294E] transition-colors">
              <input 
                type="checkbox" 
                checked={hideBlocked} 
                onChange={(e) => setHideBlocked(e.target.checked)} 
                className="w-4 h-4 rounded border-slate-300 text-[#05294E] focus:ring-[#05294E]" 
              />
              <span className="font-medium">Ocultar bolsas esgotadas da lista</span>
            </label>
          </div>

          {/* Filters */}
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">University</label>
              <select
                value={filterUniversityId}
                onChange={(e) => { setFilterUniversityId(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">All universities</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Scholarship value ($/yr) — min</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={filterScholarshipMin}
                  onChange={(e) => { if (/^\d*$/.test(e.target.value)) { setFilterScholarshipMin(e.target.value); setPage(1); } }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Scholarship value ($/yr) — max</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={filterScholarshipMax}
                  onChange={(e) => { if (/^\d*$/.test(e.target.value)) { setFilterScholarshipMax(e.target.value); setPage(1); } }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Placement fee ($) — min</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={filterAppFeeMin}
                  onChange={(e) => { if (/^\d*$/.test(e.target.value)) { setFilterAppFeeMin(e.target.value); setPage(1); } }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Placement fee ($) — max</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={filterAppFeeMax}
                  onChange={(e) => { if (/^\d*$/.test(e.target.value)) { setFilterAppFeeMax(e.target.value); setPage(1); } }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Academic level</label>
                <select
                  value={filterLevel}
                  onChange={(e) => { setFilterLevel(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">All levels</option>
                  {distinctLevels.map((l) => (
                    <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Field of study</label>
                <select
                  value={filterFieldOfStudy}
                  onChange={(e) => { setFilterFieldOfStudy(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">All fields</option>
                  {distinctFields.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Delivery mode</label>
                <select
                  value={filterDeliveryMode}
                  onChange={(e) => { setFilterDeliveryMode(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">All modes</option>
                  {distinctDeliveryModes.map((m) => (
                    <option key={m} value={m}>
                      {m === 'in_person' ? 'In-person' : m.charAt(0).toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Work permission</label>
                <select
                  value={filterWorkPermission}
                  onChange={(e) => { setFilterWorkPermission(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">All permissions</option>
                  {distinctWorkPermissions.map((wp) => (
                    <option key={wp} value={wp}>{wp}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium text-slate-700 mb-2">Student process type</div>
            <div className="flex items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="ptype" checked={processType === 'initial'} onChange={() => setProcessType('initial')} />
                <span>First-time F1</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="ptype" checked={processType === 'transfer'} onChange={() => setProcessType('transfer')} />
                <span>School Transfer</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="ptype" checked={processType === 'change_of_status'} onChange={() => setProcessType('change_of_status')} />
                <span>Change of Status</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="ptype" checked={processType === ''} onChange={() => setProcessType('')} />
                <span>Unspecified</span>
              </label>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">Scholarships</div>
            <div className="divide-y">
              {scholarships.length === 0 && (
                <div className="p-4 text-sm text-slate-500">No scholarships found.</div>
              )}
              {scholarships.map((s) => {
                const isBlocked = !(s as any).is_active || is3800ScholarshipBlocked(s as any);
                if (hideBlocked && isBlocked) return null;

                const inCart = isInCart(s.id);
                const existing = existingApplicationMap[s.id];
                return (
                  <div key={s.id} className={`p-4 flex items-center justify-between ${existing ? 'bg-green-50' : ''} ${isBlocked ? 'opacity-80 bg-red-50/30' : ''}`}>
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleViewScholarship(s)}>
                      <div className="flex items-center gap-2">
                        <div className={`font-semibold ${isBlocked ? 'text-red-800 line-through' : 'text-slate-900'} truncate hover:text-[#05294E] transition-colors`}>{s.title}</div>
                        {isBlocked && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                            ⚠️ Esgotada
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600">{s.universities?.name || 'University'}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {s.level && (
                          <span className={`${isBlocked ? 'opacity-60' : ''} inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 capitalize`}>
                            {s.level}
                          </span>
                        )}
                        {(s as any).field_of_study && (
                          <span className={`${isBlocked ? 'opacity-60' : ''} inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700`}>
                            {(s as any).field_of_study}
                          </span>
                        )}
                        {(s as any).delivery_mode && (
                          <span className={`${isBlocked ? 'opacity-60' : ''} inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700 capitalize`}>
                            {(s as any).delivery_mode === 'in_person' ? 'In-person' : (s as any).delivery_mode}
                          </span>
                        )}
                      </div>
                      <div className={`flex items-center gap-3 mt-1 ${isBlocked ? 'opacity-60' : ''}`}>
                        {s.annual_value_with_scholarship != null && (
                          <span className={`text-xs ${isBlocked ? 'text-red-700' : 'text-emerald-700'} font-medium`}>
                            Scholarship: ${Number(s.annual_value_with_scholarship).toLocaleString('en-US')}/yr
                          </span>
                        )}
                        {s.placement_fee_amount != null && (
                          <span className={`text-xs ${isBlocked ? 'text-red-700' : 'text-blue-700'} font-medium`}>
                            Placement fee: ${Number(s.placement_fee_amount).toLocaleString('en-US')}
                          </span>
                        )}
                      </div>
                      {existing && (
                        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Application: {existing.status || 'pending'}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleViewScholarship(s)}
                        className="px-3 py-1 rounded-md text-xs border border-slate-300 hover:bg-slate-50 text-slate-600"
                      >
                        View Details
                      </button>
                      {!existing && (
                        <button
                          onClick={() => {
                            if (isBlocked && !inCart) {
                              alert('Não é possível adicionar uma bolsa bloqueada/esgotada para o aluno.');
                              return;
                            }
                            toggleCart(s.id);
                          }}
                          className={`px-3 py-1 rounded-md text-xs border ${inCart ? 'text-red-700 border-red-300 hover:bg-red-50' : (isBlocked ? 'text-slate-400 border-slate-200 cursor-not-allowed bg-slate-50' : 'text-[#05294E] border-slate-300 hover:bg-slate-50')}`}
                          disabled={!canMutate || (isBlocked && !inCart)}
                          title={isBlocked && !inCart ? "Bolsa Esgotada" : ""}
                        >
                          {inCart ? 'Remove' : 'Add'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Pagination Controls */}
            <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Page {page} of {Math.max(1, Math.ceil(total / pageSize))} • {total} results
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="text-xs px-2 py-1 border border-slate-300 rounded-md"
                  value={pageSize}
                  onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n}/page</option>
                  ))}
                </select>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2 py-1 text-xs border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => (p < Math.ceil(total / pageSize) ? p + 1 : p))}
                  disabled={page >= Math.ceil(total / pageSize) || total === 0}
                  className="px-2 py-1 text-xs border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:w-1/3 w-full">
          <div className="border rounded-xl overflow-hidden mb-6">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">Selected scholarships ({cart.length})</div>
            <div className="divide-y">
              {cart.length === 0 && (
                <div className="p-4 text-sm text-slate-500">No items in selection.</div>
              )}
              {cart.map((id) => {
                const s = scholarships.find(x => x.id === id);
                const detailInfo = cartDetails[id] || {};
                const displayTitle = s?.title || detailInfo.title || id;
                const displayUni = s?.universities?.name || detailInfo.universityName || 'University';
                
                return (
                  <div key={id} className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{displayTitle}</div>
                      <div className="text-xs text-slate-500">{displayUni}</div>
                    </div>
                    <button
                      onClick={() => toggleCart(id)}
                      className="px-2 py-1 rounded-md text-xs text-red-700 border border-red-300 hover:bg-red-50"
                      disabled={!canMutate}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="p-4">
              <button
                onClick={createApplicationsFromCart}
                disabled={cart.length === 0 || !canMutate}
                className="w-full px-4 py-2 rounded-lg bg-[#05294E] text-white text-sm hover:bg-[#041f38] disabled:opacity-50"
              >
                Create applications
              </button>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">Existing applications</div>
            <div className="divide-y">
              {(applications || []).length === 0 && (
                <div className="p-4 text-sm text-slate-500">No applications yet.</div>
              )}
              {(applications || []).map((a: any) => {
                  return (
                    <div key={a.id} className="p-3">
                      <div className="text-sm font-semibold text-slate-900">{a.scholarships?.title || a.scholarship_id}</div>
                      <div className="text-xs text-slate-600">{a.scholarships?.universities?.name || 'University'}</div>
                      <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {String(a.status || 'pending').replace('_',' ')}
                      </div>

                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-xs font-semibold text-slate-700 mb-2">Submit required documents</div>
                    <div className="grid grid-cols-1 gap-2">
                      {(['passport','diploma','funds_proof'] as const).map((docType) => {
                        const d = (Array.isArray(a.documents) ? a.documents : []).find((x: any) => x.type === docType);
                        return (
                          <div key={`${a.id}-${docType}`} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-slate-800 capitalize">{docType.replace('_',' ')}</div>
                              {d && (
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Status: <span className="font-medium">{String(d.status || 'under_review').replace('_',' ')}</span>
                                </div>
                              )}
                            </div>
                            <label className="text-xs text-slate-600 hover:text-slate-800 font-medium px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap">
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleUploadAppDocument(a.id, docType, f);
                                }}
                                disabled={!canMutate}
                              />
                              {d ? 'Replace' : 'Upload'}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de detalhes da bolsa */}
      {selectedScholarship && (
        <ScholarshipDetailModal
          scholarship={selectedScholarship}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedScholarship(null);
          }}
          userProfile={null} // Admin não precisa de userProfile
          user={user ? {
            ...user,
            name: user.name || 'Admin'
          } : null}
          userRole="admin" // Forçar role admin para ver tudo
        />
      )}

      {isBulkModalOpen && (
        <ScholarshipBulkUploadModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={(successfulIds) => {
            setCart(prev => prev.filter(id => !successfulIds.includes(id)));
            setCartDetails(prev => {
              const newDetails = { ...prev };
              successfulIds.forEach(id => delete newDetails[id]);
              return newDetails;
            });
            loadData();
          }}
          scholarships={cart.filter(id => !existingApplicationMap[id]).map(id => ({
            id,
            title: cartDetails[id]?.title || id,
            universities: { name: cartDetails[id]?.universityName || null }
          }))}
          studentProfileId={studentProfileId}
          processType={processType}
          user={user}
        />
      )}
    </div>
  );
};

export default AdminScholarshipSelection;


