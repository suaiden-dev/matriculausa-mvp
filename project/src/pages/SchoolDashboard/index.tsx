import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UniversityProvider } from '../../context/UniversityContext';
import SchoolDashboardLayout from './SchoolDashboardLayout';
import Overview from './Overview';
import ScholarshipManagement from './ScholarshipManagement';
import NewScholarship from './NewScholarship';
import ProfileManagement from './ProfileManagement';
import StudentManagement from './StudentManagement';
import StudentDetails from './StudentDetails';
import PaymentManagement from './PaymentManagement';
import UniversityGlobalDocumentRequests from './UniversityGlobalDocumentRequests';
import AISolutions from './AISolutions';
import AISettings from './AISettings';
import AIConversations from './AIConversations';

import Inbox from './Inbox';
import WhatsAppConnection from './WhatsAppConnection';
import ConnectWhatsApp from './ConnectWhatsApp';
import UniversityRewardsDashboard from './UniversityRewardsDashboard';

const SkeletonLoader = () => <div className="animate-pulse h-40 bg-slate-100 rounded-xl w-full my-8" />;

export const SchoolDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="bg-slate-50">
      <UniversityProvider>
        <Routes>
          <Route 
            path="/" 
            element={<SchoolDashboardLayout user={user} />}
          >
            <Route index element={<Overview />} />
            <Route path="scholarships" element={<ScholarshipManagement />} />
            <Route path="scholarship/new" element={<NewScholarship />} />
            <Route path="scholarship/new" element={<NewScholarship />} />
            <Route path="profile" element={<ProfileManagement />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="student/:applicationId" element={<StudentDetails />} />
            <Route path="analytics" element={<PaymentManagement />} />
            <Route path="global-document-requests" element={<UniversityGlobalDocumentRequests />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="ai-solutions" element={<AISolutions />} />
            <Route path="ai-settings" element={<AISettings />} />
            <Route path="ai-conversations" element={<AIConversations />} />
            <Route path="matricula-rewards" element={<UniversityRewardsDashboard />} />
            <Route path="whatsapp" element={<WhatsAppConnection />} />
          </Route>
        </Routes>
      </UniversityProvider>
    </div>
  );
};

