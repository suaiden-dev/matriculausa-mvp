import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { List, Grid3X3 } from 'lucide-react';

interface Application {
  id: string;
  student_name: string;
  student_email: string;
  scholarship_title: string;
  university_name: string;
  amount: number;
  status: string;
  applied_at: string;
}

const ApplicationMonitoring: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [universities, setUniversities] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
    const saved = localStorage.getItem('application-view-mode') as 'grid' | 'list';
    if (saved) setViewMode(saved);
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scholarship_applications')
      .select(`
        id,
        status,
        applied_at,
        user_profiles!student_id(full_name, email),
        scholarships(title, amount, universities(name))
      `)
      .order('applied_at', { ascending: false });
    if (error) {
      setApplications([]);
      setLoading(false);
      return;
    }
    const apps = (data || []).map((app: any) => ({
      id: app.id,
      student_name: app.user_profiles?.full_name || 'Unknown',
      student_email: app.user_profiles?.email || '',
      scholarship_title: app.scholarships?.title || 'Unknown',
      university_name: app.scholarships?.universities?.name || 'Unknown',
      amount: app.scholarships?.amount || 0,
      status: app.status,
      applied_at: app.applied_at
    }));
    setApplications(apps);
    // Populate university filter
    const uniqueUniversities = Array.from(new Set(apps.map(a => a.university_name)));
    setUniversities(uniqueUniversities);
    setLoading(false);
  };

  const filtered = applications.filter(app => {
    const matchesSearch =
      app.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.university_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.scholarship_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesUniversity = universityFilter === 'all' || app.university_name === universityFilter;
    return matchesSearch && matchesStatus && matchesUniversity;
  });

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('application-view-mode', mode);
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">Application Monitoring</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 flex flex-col md:flex-row gap-4 items-center md:items-end">
        <input
          type="text"
          placeholder="Search by student, university, or scholarship..."
          className="w-full md:w-96 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all duration-200"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <select
          className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          title="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="under_review">Under Review</option>
        </select>
        <select
          className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
          value={universityFilter}
          onChange={e => setUniversityFilter(e.target.value)}
          title="Filter by university"
        >
          <option value="all">All Universities</option>
          {universities.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1">
          <button
            onClick={() => handleViewModeChange('grid')}
            className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
              viewMode === 'grid' ? 'bg-white text-[#05294E] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleViewModeChange('list')}
            className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
              viewMode === 'list' ? 'bg-white text-[#05294E] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Applications Grid/List */}
      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading applications...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-500">No applications found.</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(app => (
            <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">{app.student_name}</h2>
                <p className="text-slate-600 text-sm mb-1">University: <span className="font-medium">{app.university_name}</span></p>
                <p className="text-slate-600 text-sm mb-1">Scholarship: <span className="font-medium">{app.scholarship_title}</span></p>
                <p className="text-slate-600 text-sm mb-1">Status: <span className="font-medium capitalize">{app.status.replace('_', ' ')}</span></p>
                <p className="text-slate-600 text-xs">Applied on: {new Date(app.applied_at).toLocaleDateString()}</p>
              </div>
              <button
                className="mt-4 w-full bg-[#05294E] text-white py-2.5 px-4 rounded-xl hover:bg-[#102336] transition-colors font-medium text-sm"
                onClick={() => navigate(`/admin/dashboard/application-monitoring/${app.id}`)}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-2 text-left">Student</th>
                <th className="px-4 py-2 text-left">University</th>
                <th className="px-4 py-2 text-left">Scholarship</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Applied At</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(app => (
                <tr key={app.id} className="border-b">
                  <td className="px-4 py-2 font-medium text-slate-900">{app.student_name}</td>
                  <td className="px-4 py-2 text-slate-600">{app.university_name}</td>
                  <td className="px-4 py-2 text-slate-600">{app.scholarship_title}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">{app.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{new Date(app.applied_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <button
                      className="bg-slate-100 text-slate-700 py-1 px-3 rounded-lg hover:bg-slate-200 transition-colors text-xs font-medium"
                      onClick={() => navigate(`/admin/dashboard/application-monitoring/${app.id}`)}
                      title="View details"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ApplicationMonitoring; 