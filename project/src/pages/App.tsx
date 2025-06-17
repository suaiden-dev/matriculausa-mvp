@@ .. @@
 import React from 'react';
 import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
 import { AuthProvider } from './hooks/useAuth';
 import Layout from './components/Layout';
 import Home from './pages/Home';
 import About from './pages/About';
 import Auth from './pages/Auth';
 import Scholarships from './pages/Scholarships';
 import Universities from './pages/Universities';
 import UniversityDetail from './pages/UniversityDetail';
 import HowItWorks from './pages/HowItWorks';
 import TermsAndConditions from './pages/TermsAndConditions';
 import SchoolProfileSetup from './pages/SchoolProfileSetup';
 import SchoolDashboard from './pages/SchoolDashboard/index';
 import StudentDashboard from './pages/StudentDashboard/index';
 import AdminDashboard from './pages/AdminDashboard/index';
 import NewScholarship from './pages/SchoolDashboard/NewScholarship';
 import ForgotPassword from './pages/ForgotPassword';
 import AdminRegistration from './pages/AdminRegistration';
+import CheckoutSuccess from './pages/CheckoutSuccess';
+import CheckoutCancel from './pages/CheckoutCancel';

 function App() {
   return (
   )
 }
@@ .. @@
             <Route path="/schools/:id" element={<UniversityDetail />} />
             <Route path="/how-it-works" element={<HowItWorks />} />
             
+            {/* Checkout Routes */}
+            <Route path="/checkout/success" element={<CheckoutSuccess />} />
+            <Route path="/checkout/cancel" element={<CheckoutCancel />} />
+            
             {/* Student Routes */}
             <Route path="/student/dashboard/*" element={<StudentDashboard />} />