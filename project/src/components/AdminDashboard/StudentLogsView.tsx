import React, { useState, useEffect } from 'react';
import { useStudentLogs, StudentActionLog } from '../../hooks/useStudentLogs';
import ScholarshipInfoDisplay from './ScholarshipInfoDisplay';
import { supabase } from '../../lib/supabase';

interface StudentLogsViewProps {
  studentId: string;
  studentName: string;
  showIpIdentity?: boolean; // Only true for Admin — shows IP identity for school_manager actions
}

interface IpIdentity {
  person_name: string;
  person_email: string;
  person_type: string;
  frequency: number;
  last_seen: string;
  confidence: 'high' | 'medium' | 'low';
}

const StudentLogsView: React.FC<StudentLogsViewProps> = ({ studentId, studentName, showIpIdentity = false }) => {
  const {
    logs,
    loading,
    error,
    filters,
    pagination,
    refreshLogs,
    loadMore,
    updateFilters,
    clearFilters
  } = useStudentLogs(studentId);

  const [showFilters, setShowFilters] = useState(false);

  // IP identity cache: { [ip]: IpIdentity | null }
  const [ipIdentityMap, setIpIdentityMap] = useState<Record<string, IpIdentity | null>>({});

  // Batch-fetch identities for all unique IPs from school_manager logs
  useEffect(() => {
    if (!showIpIdentity || logs.length === 0) return;

    const schoolManagerLogs = logs.filter(l => l.performed_by_type === 'school_manager');
    const ips = Array.from(new Set(
      schoolManagerLogs
        .map(l => l.metadata?.ip || l.metadata?.client_ip || l.metadata?.request_ip)
        .filter(Boolean)
    ));

    const uncachedIps = ips.filter(ip => !(ip in ipIdentityMap));
    if (uncachedIps.length === 0) return;

    const fetchAll = async () => {
      const results = await Promise.allSettled(
        uncachedIps.map(ip =>
          supabase.rpc('identify_ip', { p_ip: ip }).then(({ data }) => ({ ip, top: (data as IpIdentity[])?.[0] || null }))
        )
      );
      const newEntries: Record<string, IpIdentity | null> = {};
      results.forEach(r => {
        if (r.status === 'fulfilled') newEntries[r.value.ip] = r.value.top;
      });
      setIpIdentityMap(prev => ({ ...prev, ...newEntries }));
    };

    fetchAll();
  }, [logs, showIpIdentity]);

  const actionTypeOptions = [
    { value: '', label: 'All Actions' },
    { value: 'document_upload', label: 'Document Upload' },
    { value: 'document_approval', label: 'Document Approval' },
    { value: 'document_rejection', label: 'Document Rejection' },
    { value: 'fee_payment', label: 'Fee Payment' },
    { value: 'application_approval', label: 'Application Approval' },
    { value: 'application_rejection', label: 'Application Rejection' },
    { value: 'profile_update', label: 'Profile Update' },
    { value: 'acceptance_letter_sent', label: 'Acceptance Letter Sent' },
    { value: 'document_request_created', label: 'Document Request Created' },
    { value: 'document_request_uploaded', label: 'Document Request Uploaded' },
    { value: 'newsletter_email_sent', label: 'Newsletter Email Sent' },
    { value: 'newsletter_email_failed', label: 'Newsletter Email Failed' }
  ];

  const performerTypeOptions = [
    { value: '', label: 'All Users' },
    { value: 'student', label: 'Student' },
    { value: 'admin', label: 'Admin' },
    { value: 'university', label: 'University' },
    { value: 'school_manager', label: 'School Manager' },
    { value: 'post_sales', label: 'Post Sales' },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionTypeLabel = (actionType: string) => {
    const option = actionTypeOptions.find(opt => opt.value === actionType);
    return option ? option.label : actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPerformerTypeLabel = (performerType: string) => {
    const option = performerTypeOptions.find(opt => opt.value === performerType);
    return option ? option.label : performerType.charAt(0).toUpperCase() + performerType.slice(1);
  };

  const getPerformerDisplayName = (log: StudentActionLog) => {
    if (log.performed_by_name) {
      return log.performed_by_name;
    }
    return log.performed_by_email || 'Unknown User';
  };

  const getPerformerTypeColor = (performerType: string) => {
    switch (performerType) {
      case 'admin':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'university':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'school_manager':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'student':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'post_sales':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatActionDescription = (description: string) => {
    // Substituir "manual payment" por "Outside payment" na exibição
    return description.replace(/manual payment/gi, 'Outside payment');
  };

  const getActionTypeColor = (actionType: string, description?: string) => {
    const desc = description?.toLowerCase() || '';
    const type = actionType.toLowerCase();

    if (type.includes('pending') || desc.includes('pending') || desc.includes('pendente')) {
      return 'text-amber-600';
    }
    if (type.includes('approval') || type.includes('payment')) {
      return 'text-green-600';
    }
    if (type.includes('rejection') || type.includes('rejected')) {
      return 'text-red-600';
    }
    if (type.includes('upload') || type.includes('created') || type === 'newsletter_email_sent') {
      return 'text-blue-600';
    }
    if (type === 'newsletter_email_failed') {
      return 'text-red-600';
    }
    return 'text-slate-600';
  };

  const getScholarshipIdFromLog = (log: StudentActionLog): string | null => {
    // Check if this is a scholarship-related log
    if (!log.action_type.includes('scholarship') && !log.metadata?.scholarship_id) {
      return null;
    }

    // Try to get scholarship_id from metadata
    if (log.metadata?.scholarship_id) {
      return log.metadata.scholarship_id;
    }

    // For checkout_session_created with scholarship_fee, check scholarships_ids
    if (log.action_type === 'checkout_session_created' && 
        log.metadata?.fee_type === 'scholarship_fee' && 
        log.metadata?.scholarships_ids && 
        Array.isArray(log.metadata.scholarships_ids) && 
        log.metadata.scholarships_ids.length > 0) {
      return log.metadata.scholarships_ids[0]; // Return first scholarship ID
    }

    return null;
  };

  const isScholarshipRelatedLog = (log: StudentActionLog): boolean => {
    return getScholarshipIdFromLog(log) !== null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Activity Log</h2>
          <p className="text-sm text-slate-600">Action history for {studentName}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <button
            onClick={refreshLogs}
            disabled={loading}
            className="px-3 py-2 text-sm bg-[#05294E] text-white rounded-lg hover:bg-[#041f38] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Action Type
              </label>
              <select
                value={filters.action_type || ''}
                onChange={(e) => updateFilters({ action_type: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
              >
                {actionTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Performed By
              </label>
              <select
                value={filters.performed_by_type || ''}
                onChange={(e) => updateFilters({ performed_by_type: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
              >
                {performerTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => updateFilters({ date_from: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => updateFilters({ date_to: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Clear Filters
            </button>
            <div className="text-sm text-slate-600">
              {pagination.total} total actions
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">Error loading logs: {error}</p>
        </div>
      )}

      {/* Logs List */}
      <div className="space-y-3">
        {loading && logs.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E] mx-auto"></div>
            <p className="mt-2 text-sm text-slate-600">Loading activity log...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-slate-300 rounded"></div>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Activity Yet</h3>
            <p className="text-sm text-slate-600">No actions have been recorded for this student.</p>
          </div>
        ) : (
          logs.map((log) => {
            const scholarshipId = getScholarshipIdFromLog(log);
            const isScholarshipLog = isScholarshipRelatedLog(log);
            
            return (
              <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Type badge, Action type, Description */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPerformerTypeColor(log.performed_by_type)}`}>
                        {getPerformerTypeLabel(log.performed_by_type)}
                      </span>
                      <span className={`text-sm font-medium ${getActionTypeColor(log.action_type, log.action_description)}`}>
                        {getActionTypeLabel(log.action_type)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-900">
                      {formatActionDescription(log.action_description)}
                    </p>
                    
                    {/* Scholarship Information Display */}
                    {isScholarshipLog && scholarshipId && (
                      <ScholarshipInfoDisplay 
                        scholarshipId={scholarshipId} 
                        metadata={log.metadata}
                      />
                    )}
                  </div>

                  {/* Right: By, Date, IP */}
                  <div className="flex flex-col items-end text-xs space-y-1.5 text-slate-600 whitespace-nowrap">
                    <span>By: {getPerformerDisplayName(log)}</span>
                    <span>{formatDate(log.created_at)}</span>
                    {log.metadata && (log.metadata.ip || log.metadata.client_ip || log.metadata.request_ip) && (() => {
                      const ip = log.metadata.ip || log.metadata.client_ip || log.metadata.request_ip;
                      const identity = showIpIdentity && log.performed_by_type === 'school_manager'
                        ? ipIdentityMap[ip]
                        : undefined;
                      return (
                        <div className="flex flex-col items-end gap-0.5">
                          <span>IP: {ip}</span>
                          {identity && (
                            <span className="text-[11px] text-purple-600 font-medium">
                              ↳ {identity.person_name}
                            </span>
                          )}
                          {showIpIdentity && log.performed_by_type === 'school_manager' && !(ip in ipIdentityMap) && (
                            <span className="text-[11px] text-slate-400">↳ identifying...</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More Button */}
      {pagination.hasMore && (
        <div className="text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentLogsView;

