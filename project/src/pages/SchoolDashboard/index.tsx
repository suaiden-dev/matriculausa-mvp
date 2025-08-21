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
import SelectionProcess from './SelectionProcess';
import StudentDetails from './StudentDetails';
import PaymentManagement from './PaymentManagement';
import UniversityGlobalDocumentRequests from './UniversityGlobalDocumentRequests';
import AISolutions from './AISolutions';



import Inbox from './Inbox';
import WhatsAppConnection from './WhatsAppConnection';
import ConnectWhatsApp from './ConnectWhatsApp';
import UniversityRewardsDashboard from './UniversityRewardsDashboard';
import StripeConnectSetup from './StripeConnectSetup';
import StripeConnectCallback from './StripeConnectCallback';
import StripeConnectTransfers from './StripeConnectTransfers';
import PaymentMethodConfiguration from './PaymentMethodConfiguration';
import PaymentDashboard from './PaymentDashboard';

const SkeletonLoader = () => <div className="animate-pulse h-40 bg-slate-100 rounded-xl w-full my-8" />;

export const SchoolDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="bg-slate-50">
      <UniversityProvider>
        <SchoolDashboardLayout user={user}>
          <Routes>
            <Route index element={<Overview />} />
            <Route path="scholarships" element={<ScholarshipManagement />} />
            <Route path="scholarship/new" element={<NewScholarship />} />
            <Route path="scholarship/new" element={<NewScholarship />} />
            <Route path="profile" element={<ProfileManagement />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="selection-process" element={<SelectionProcess />} />
            <Route path="student/:applicationId" element={<StudentDetails />} />
            <Route path="analytics" element={<PaymentManagement />} />
            <Route path="global-document-requests" element={<UniversityGlobalDocumentRequests />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="ai-solutions" element={<AISolutions />} />
            <Route path="stripe-connect" element={<StripeConnectSetup />} />
            <Route path="stripe-connect/callback" element={<StripeConnectCallback />} />
            <Route path="stripe-connect/transfers" element={<StripeConnectTransfers />} />
            <Route path="payment-method-config" element={<PaymentMethodConfiguration />} />
            <Route path="payment-dashboard" element={<PaymentDashboard />} />

            <Route path="matricula-rewards" element={<UniversityRewardsDashboard />} />
            <Route path="whatsapp" element={<WhatsAppConnection />} />
          </Routes>
        </SchoolDashboardLayout>
      </UniversityProvider>
    </div>
  );
};

