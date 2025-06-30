import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { ScholarshipApplication, UserProfile, Scholarship } from '../../types';
import ApplicationChat from '../../components/ApplicationChat';
import { useApplicationChat } from '../../hooks/useApplicationChat';
import { useAuth } from '../../hooks/useAuth';
import DocumentRequestsCard from '../../components/DocumentRequestsCard';
import ImagePreviewModal from '../../components/ImagePreviewModal';

interface ApplicationDetails extends ScholarshipApplication {
  user_profiles: UserProfile;
  scholarships: Scholarship;
}

const DOCUMENTS_INFO = [
  {
    key: 'passport',
    label: 'Passport',
    description: 'A valid copy of the student\'s passport. Used for identification and visa purposes.'
  },
  {
    key: 'diploma',
    label: 'High School Diploma',
    description: 'Proof of high school graduation. Required for university admission.'
  },
  {
    key: 'funds_proof',
    label: 'Proof of Funds',
    description: 'A bank statement or financial document showing sufficient funds for study.'
  }
];

const StudentDetails: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const chat = useApplicationChat(applicationId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (applicationId) {
      fetchApplicationDetails();
    }
  }, [applicationId]);

  const fetchApplicationDetails = async () => {
    if (!applicationId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          user_profiles!student_id(*),
          scholarships(*)
        `)
        .eq('id', applicationId)
        .single();

      if (error) {
        throw error;
      }
      
      if (data) {
        setApplication(data as ApplicationDetails);
      }
    } catch (err: any) {
      console.error("Error fetching application details:", err);
      setError("Failed to load application details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }
  
  if (!application) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p>Application not found.</p>
      </div>
    );
  }

  const { user_profiles: student, scholarships: scholarship, status } = application;

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Student Application Details</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold text-[#05294E] mb-4">Student Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><strong>Name:</strong> {student.full_name}</div>
              <div><strong>Email:</strong> {student.email}</div>
              <div><strong>Phone:</strong> {student.phone || 'N/A'}</div>
              <div><strong>Country:</strong> {student.country || 'N/A'}</div>
              <div><strong>Student Type:</strong> {
                application.student_process_type === 'initial' ? 'Initial - F-1 Visa Required' :
                application.student_process_type === 'transfer' ? 'Transfer - Current F-1 Student' :
                application.student_process_type === 'status_change' ? 'Status Change - From Other Visa' :
                application.student_process_type || 'N/A'
              }</div>
            </div>
             <div className="mt-4 pt-4 border-t">
               <strong>Status: </strong> 
               <span className={`px-3 py-1 rounded-full text-sm font-medium ${status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
          </div>

          {/* Scholarship Information */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold text-[#05294E] mb-4">Scholarship Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><strong>Scholarship:</strong> {scholarship.title || scholarship.name}</div>
                                      <div><strong>Amount:</strong> ${Number(scholarship.annual_value_with_scholarship ?? 0).toLocaleString()}</div>
              {scholarship.course && <div><strong>Course:</strong> {scholarship.course}</div>}
              {scholarship.country && <div><strong>Country:</strong> {scholarship.country}</div>}
              <div className="md:col-span-2"><strong>Description:</strong> {scholarship.description}</div>
            </div>
          </div>

          {/* Student Documents Section */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold text-[#05294E] mb-4">Student Documents</h2>
            <ul className="space-y-6">
              {DOCUMENTS_INFO.map((doc) => {
                let docData = Array.isArray(application.documents)
                  ? application.documents.find((d: any) => d.type === doc.key)
                  : null;
                if (!docData && Array.isArray(student.documents)) {
                  docData = student.documents.find((d: any) => d.type === doc.key);
                }
                return (
                  <li key={doc.key} className="border-b last:border-0 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-800 text-base">{doc.label}</div>
                        <div className="text-xs text-slate-500 mb-1">{doc.description}</div>
                        {docData && (
                          <div className="text-xs text-slate-600 mb-1">Uploaded: {new Date(docData.uploaded_at).toLocaleDateString()}</div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2 md:mt-0">
                        {docData ? (
                          <>
                            <button
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium"
                              onClick={() => setPreviewUrl(docData.url)}
                            >
                              View
                            </button>
                            <a
                              href={docData.url}
                              download
                              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-xs font-medium"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Download
                            </a>
                          </>
                        ) : (
                          <span className="text-xs text-red-500">Not uploaded</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
      {/* Card de Solicitações de Documentos */}
      <div className="mt-10">
        <DocumentRequestsCard 
          applicationId={application.id} 
          isSchool={true} 
          currentUserId={user?.id || ''} 
        />
      </div>
      {/* Chat Section */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold text-[#05294E] mb-4">Chat with Student</h2>
        <ApplicationChat
          messages={chat.messages}
          onSend={chat.sendMessage}
          loading={chat.loading}
          isSending={chat.isSending}
          error={chat.error}
          currentUserId={user?.id}
        />
      </div>
      {previewUrl && (
        <ImagePreviewModal imageUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </div>
  );
};

export default StudentDetails; 