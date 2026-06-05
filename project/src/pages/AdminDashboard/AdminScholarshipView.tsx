import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useScholarship } from '../../hooks/useScholarship';
import ScholarshipDetailView from '../../components/ScholarshipDetailView';

const AdminScholarshipView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { scholarship, loading, error } = useScholarship(id);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/dashboard/scholarships')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Scholarships
        </button>
        {scholarship && (
          <>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-500 truncate max-w-xs">{scholarship.title}</span>
          </>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-24 text-slate-500">
            Scholarship not found.
          </div>
        )}

        {scholarship && !loading && (
          <ScholarshipDetailView
            scholarship={scholarship}
            userProfile={null}
            user={null}
            userRole="admin"
          />
        )}
      </div>
    </div>
  );
};

export default AdminScholarshipView;
