import React, { useState } from 'react';
import { 
  Building, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search, 
  Filter, 
  Calendar, 
  MapPin,
  Globe,
  Mail,
  Phone,
  AlertTriangle,
  Clock,
  TrendingUp
} from 'lucide-react';

interface UniversityManagementProps {
  universities: any[];
  stats: {
    total: number;
    pending: number;
    approved: number;
  };
  onApprove: (universityId: string) => void;
  onReject: (universityId: string) => void;
}

const UniversityManagement: React.FC<UniversityManagementProps> = ({
  universities,
  stats,
  onApprove,
  onReject
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUniversity, setSelectedUniversity] = useState<any>(null);

  const filteredUniversities = universities.filter(university => {
    const matchesSearch = university.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         university.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'approved' && university.is_approved) ||
      (statusFilter === 'pending' && !university.is_approved);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Universities</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pending Approval</p>
              <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Approved</p>
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search universities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all duration-200"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all duration-200"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center text-sm text-slate-600">
          <span className="font-medium">{filteredUniversities.length}</span>
          <span className="ml-1">
            universit{filteredUniversities.length !== 1 ? 'ies' : 'y'} found
          </span>
        </div>
      </div>

      {/* Universities List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  University
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Applied
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredUniversities.map((university) => (
                <tr key={university.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                        <Building className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{university.name}</div>
                        {university.website && (
                          <div className="text-sm text-slate-500 flex items-center">
                            <Globe className="h-3 w-3 mr-1" />
                            {university.website}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-slate-400" />
                      {university.location || 'Not provided'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {university.contact?.email && (
                        <div className="text-sm text-slate-600 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {university.contact.email}
                        </div>
                      )}
                      {university.contact?.phone && (
                        <div className="text-sm text-slate-600 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {university.contact.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      university.is_approved 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {university.is_approved ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(university.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setSelectedUniversity(university)}
                        className="text-purple-600 hover:text-purple-900 hover:bg-purple-50 p-2 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {!university.is_approved && (
                        <>
                          <button
                            onClick={() => onApprove(university.id)}
                            className="text-green-600 hover:text-green-900 hover:bg-green-50 p-2 rounded-lg transition-colors"
                            title="Approve University"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onReject(university.id)}
                            className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Reject University"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUniversities.length === 0 && (
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No universities found</h3>
            <p className="text-slate-500">
              {searchTerm ? `No universities match "${searchTerm}"` : 'No universities registered yet'}
            </p>
          </div>
        )}
      </div>

      {/* University Detail Modal */}
      {selectedUniversity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">University Details</h3>
                <button
                  onClick={() => setSelectedUniversity(null)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-500">Name</label>
                    <p className="text-slate-900">{selectedUniversity.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Location</label>
                    <p className="text-slate-900">{selectedUniversity.location || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Website</label>
                    <p className="text-slate-900">{selectedUniversity.website || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Status</label>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedUniversity.is_approved 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {selectedUniversity.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedUniversity.description && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Description</h4>
                  <p className="text-slate-700">{selectedUniversity.description}</p>
                </div>
              )}

              {selectedUniversity.programs && selectedUniversity.programs.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Programs</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedUniversity.programs.map((program: string, index: number) => (
                      <span key={index} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-sm">
                        {program}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!selectedUniversity.is_approved && (
                <div className="flex space-x-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      onApprove(selectedUniversity.id);
                      setSelectedUniversity(null);
                    }}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 transition-colors font-medium"
                  >
                    Approve University
                  </button>
                  <button
                    onClick={() => {
                      onReject(selectedUniversity.id);
                      setSelectedUniversity(null);
                    }}
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl hover:bg-red-700 transition-colors font-medium"
                  >
                    Reject University
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityManagement;