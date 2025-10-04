import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import ScholarshipDetailModal from '../ScholarshipDetailModal';

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
  const [creating, setCreating] = useState(false);
  const [scholarships, setScholarships] = useState<ScholarshipItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [cart, setCart] = useState<string[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [processType, setProcessType] = useState<'initial' | 'transfer' | 'change_of_status' | ''>('');
  const [selectedScholarship, setSelectedScholarship] = useState<ScholarshipItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canMutate = !!(user && (user.role === 'admin' || user.role === 'school'));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar bolsas (com busca por título) - incluir relação com universities e paginação
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let baseSelect = supabase
        .from('scholarships')
        .select(`*, universities(name, location)`, { count: 'exact' })
        .order('title', { ascending: true });

      if (query) {
        baseSelect = baseSelect.ilike('title', `%${query}%`);
      }

      const { data: scholarshipsData, error: scholarshipsError, count } = await baseSelect.range(from, to);
      
      if (scholarshipsError) {
        console.error('Erro ao buscar bolsas:', scholarshipsError);
        throw scholarshipsError;
      }
      
      setScholarships((scholarshipsData as any) || []);
      setTotal(count || 0);

      // Carrinho do aluno
      const { data: cartRows, error: cartError } = await supabase
        .from('user_cart')
        .select('scholarship_id')
        .eq('user_id', studentUserId);
      if (cartError) throw cartError;
      setCart((cartRows || []).map((r: any) => r.scholarship_id));

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
  }, [query, page, pageSize, studentProfileId, studentUserId]);

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
    setCreating(true);
    try {
      const toCreate = cart.filter(id => !existingApplicationMap[id]);
      for (const scholarshipId of toCreate) {
        const { data: inserted, error: insertErr } = await supabase
          .from('scholarship_applications')
          .insert({
            student_id: studentProfileId,
            scholarship_id: scholarshipId,
            status: 'pending',
            ...(processType ? { student_process_type: processType } : {})
          })
          .select('id')
          .single();
        if (insertErr) continue;

        // Log de criação (com IP best-effort)
        try {
          let clientIp: string | undefined = undefined;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
              const j = await res.json();
              clientIp = j?.ip;
            }
          } catch {}

          await supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'scholarship_application_created',
            p_action_description: `Application created by admin for scholarship ID: ${scholarshipId}`,
            p_performed_by: user?.id || null,
            p_performed_by_type: 'admin',
            p_metadata: {
              application_id: inserted?.id,
              scholarship_id: scholarshipId,
              process_type: processType || null,
              application_method: 'admin_selection',
              ip: clientIp
            }
          });
        } catch { /* noop */ }
      }

      // Limpar carrinho após criar
      if (toCreate.length > 0) {
        await supabase
          .from('user_cart')
          .delete()
          .eq('user_id', studentUserId);
      }

      await loadData();
    } catch {
      // noop
    } finally {
      setCreating(false);
    }
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
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[#05294E] text-white text-sm hover:bg-[#041f38] disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            {!!query && (
              <button
                onClick={() => { setQuery(''); setPage(1); }}
                disabled={loading}
                className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Clear
              </button>
            )}
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
                const inCart = isInCart(s.id);
                const existing = existingApplicationMap[s.id];
                return (
                  <div key={s.id} className={`p-4 flex items-center justify-between ${existing ? 'bg-green-50' : ''}`}>
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleViewScholarship(s)}>
                      <div className="font-semibold text-slate-900 truncate hover:text-[#05294E] transition-colors">{s.title}</div>
                      <div className="text-xs text-slate-600">{s.universities?.name || 'University'}</div>
                      {existing && (
                        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Application: {existing.status || 'pending'}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewScholarship(s)}
                        className="px-3 py-1 rounded-md text-xs border border-slate-300 hover:bg-slate-50 text-slate-600"
                      >
                        View Details
                      </button>
                      {!existing && (
                        <button
                          onClick={() => toggleCart(s.id)}
                          className={`px-3 py-1 rounded-md text-xs border ${inCart ? 'text-red-700 border-red-300 hover:bg-red-50' : 'text-[#05294E] border-slate-300 hover:bg-slate-50'}`}
                          disabled={!canMutate}
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
                return (
                  <div key={id} className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{s?.title || id}</div>
                      <div className="text-xs text-slate-500">{s?.universities?.name || 'University'}</div>
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
                disabled={creating || cart.length === 0 || !canMutate}
                className="w-full px-4 py-2 rounded-lg bg-[#05294E] text-white text-sm hover:bg-[#041f38] disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create applications'}
              </button>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">Existing applications</div>
            <div className="divide-y">
              {(applications || []).length === 0 && (
                <div className="p-4 text-sm text-slate-500">No applications yet.</div>
              )}
              {(applications || []).map((a: any) => (
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
              ))}
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
    </div>
  );
};

export default AdminScholarshipSelection;


