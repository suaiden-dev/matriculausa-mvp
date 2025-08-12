import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface UploadedDoc { name: string; url: string; type: string; uploaded_at: string }

const ManualReview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [prevDocs, setPrevDocs] = useState<UploadedDoc[]>([]);
  const [files, setFiles] = useState<Record<string, File | null>>({ passport: null, diploma: null, funds_proof: null });
  const [usePrev, setUsePrev] = useState<Record<string, boolean>>({ passport: true, diploma: true, funds_proof: true });
  const [confirmAllTrue, setConfirmAllTrue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const e = JSON.parse(localStorage.getItem('documentAnalysisErrors') || '{}');
      const d = JSON.parse(localStorage.getItem('documentUploadedDocs') || '[]');
      setFieldErrors(e || {});
      setPrevDocs(Array.isArray(d) ? d : []);
      // If a field had error, default to not using previous file
      setUsePrev(prev => ({
        passport: e?.passport ? false : !!(Array.isArray(d) && d.find((x: any) => x.type === 'passport')),
        diploma: e?.diploma ? false : !!(Array.isArray(d) && d.find((x: any) => x.type === 'diploma')),
        funds_proof: e?.funds_proof ? false : !!(Array.isArray(d) && d.find((x: any) => x.type === 'funds_proof')),
      }));
    } catch {}
  }, []);

  const attachFile = (key: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (!user) throw new Error('User not authenticated');

      // Upload only the files the user chose to replace
      for (const [key, file] of Object.entries(files)) {
        if (usePrev[key]) continue;
        if (!file) continue; // nothing selected
        const { data, error: upErr } = await supabase.storage
          .from('student-documents')
          .upload(`${user.id}/manual-${key}-${Date.now()}-${file.name}`, file, { upsert: true });
        if (upErr) throw upErr;
        const fileUrl = data?.path ? supabase.storage.from('student-documents').getPublicUrl(data.path).data.publicUrl : null;
        if (!fileUrl) throw new Error('Failed to get file URL');
        await supabase.from('student_documents').insert({ user_id: user.id, type: key, file_url: fileUrl, status: 'under_review' });
      }

      if (confirmAllTrue) {
        // Mark documents as pending manual review
        await supabase
          .from('user_profiles')
          .update({ documents_status: 'under_review' })
          .eq('user_id', user.id);
      }

      navigate('/student/dashboard');
    } catch (e: any) {
      setError(e.message || 'Failed to submit manual review');
    } finally {
      setSubmitting(false);
    }
  };

  const docByType = (type: string) => prevDocs.find(d => d.type === type);
  const entries = [
    { key: 'passport', label: 'Passport' },
    { key: 'diploma', label: 'High School Diploma' },
    { key: 'funds_proof', label: 'Proof of Funds' }
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Manual Document Review</h1>
      <p className="text-slate-600 mb-6">
        Some of your documents need manual verification by the university. You can reattach the problematic files below or,
        if everything is correct, confirm that all information is true to proceed with manual review.
      </p>

      <div className="space-y-4 bg-white border border-slate-200 rounded-xl p-4">
        {entries.map(e => (
          <div key={e.key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 text-sm">{e.label}</label>
              {docByType(e.key) && (
                <a className="text-xs text-blue-600 hover:underline" href={docByType(e.key)!.url} target="_blank" rel="noreferrer">View previous file</a>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {usePrev[e.key] && docByType(e.key) ? (
                <div className="border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-slate-700 text-sm truncate max-w-[260px]">
                  {docByType(e.key)!.name || docByType(e.key)!.url.split('/').pop()}
                </div>
              ) : (
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(ev) => attachFile(e.key, ev.target.files?.[0] || null)}
                  className={`border border-slate-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition text-sm`}
                />
              )}
            </div>
            {docByType(e.key) && (
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={usePrev[e.key]}
                  onChange={(ev) => setUsePrev(prev => ({ ...prev, [e.key]: ev.target.checked }))}
                />
                Use previous file (uncheck to replace)
              </label>
            )}
            {fieldErrors[e.key] && (
              <span className="text-xs text-red-500 mt-1">{fieldErrors[e.key]}</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-2">
        <input id="confirmTruth" type="checkbox" className="h-4 w-4 mt-1" checked={confirmAllTrue} onChange={e => setConfirmAllTrue(e.target.checked)} />
        <label htmlFor="confirmTruth" className="text-sm text-slate-700">
          I confirm that all the information and documents provided are accurate and true to the best of my knowledge.
        </label>
      </div>

      {error && <div className="text-red-600 text-sm mt-4">{error}</div>}

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate('/student/dashboard')}
          className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || (!confirmAllTrue && !Object.entries(files).some(([k, f]) => !usePrev[k] && f))}
          className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit for Manual Review'}
        </button>
      </div>
    </div>
  );
};

export default ManualReview;

