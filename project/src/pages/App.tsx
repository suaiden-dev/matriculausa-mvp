import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import Layout from '../components/Layout';
import Home from '../pages/Home';
import About from '../pages/About';
import Auth from '../pages/Auth';
import Scholarships from '../pages/Scholarships';
import Universities from '../pages/Universities';
import UniversityDetail from '../pages/UniversityDetail';
import HowItWorks from '../pages/HowItWorks';
import CheckoutSuccess from '../pages/CheckoutSuccess';
import CheckoutCancel from '../pages/CheckoutCancel';
import StudentDashboard from '../pages/StudentDashboard/index';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/auth" element={<Auth mode="login" />} />
            <Route path="/scholarships" element={<Scholarships />} />
            <Route path="/universities" element={<Universities />} />
            <Route path="/schools/:id" element={<UniversityDetail />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            {/* Checkout Routes */}
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/checkout/cancel" element={<CheckoutCancel />} />
            {/* Student Routes */}
            <Route path="/student/dashboard/*" element={<StudentDashboard />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;