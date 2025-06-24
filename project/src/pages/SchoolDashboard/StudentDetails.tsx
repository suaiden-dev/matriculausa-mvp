import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { ScholarshipApplication, UserProfile, Scholarship } from '../../types';
import ApplicationChat from '../../components/ApplicationChat';
import { useApplicationChat } from '../../hooks/useApplicationChat';
import { useAuth } from '../../hooks/useAuth';

interface ApplicationDetails extends ScholarshipApplication {
  user_profiles: UserProfile;
  scholarships: Scholarship;
}

const StudentDetails: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const chat = useApplicationChat(applicationId);

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
              <div><strong>Scholarship:</strong> {scholarship.name}</div>
              <div><strong>Amount:</strong> ${Number(scholarship.amount).toLocaleString()}</div>
              <div><strong>Course:</strong> {scholarship.course}</div>
              <div><strong>Country:</strong> {scholarship.country}</div>
              <div className="md:col-span-2"><strong>Description:</strong> {scholarship.description}</div>
            </div>
          </div>
        </div>
        
        {/* Actions & Documents */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white p-6 rounded-xl shadow-md">
             <h2 className="text-xl font-bold text-[#05294E] mb-4">Application Actions</h2>
             <p className="text-sm text-gray-600 mb-4">Manage the student's application status.</p>
             <div className="flex space-x-2">
                <button className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-green-300">
                  Approve
                </button>
                <button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-red-300">
                  Reject
                </button>
             </div>
           </div>
        </div>
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
    </div>
  );
};

export default StudentDetails; 