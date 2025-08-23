import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, DollarSign, GraduationCap, Building, Award, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StudentInfo {
  student_id: string;
  full_name: string;
  email: string;
  phone: string;
  country: string;
  field_of_interest: string;
  academic_level: string;
  gpa: number;
  english_proficiency: string;
  registration_date: string;
  current_status: string;
  seller_referral_code: string;
  seller_name: string;
  total_fees_paid: number;
  fees_count: number;
}

interface FeePayment {
  payment_id: string;
  fee_type: string;
  fee_name: string;
  amount_paid: number;
  currency: string;
  payment_status: string;
  payment_date: string;
  stripe_payment_intent: string;
  notes: string;
}

interface StudentDetailsProps {
  studentId: string;
}

const StudentDetails: React.FC<StudentDetailsProps> = ({ studentId }) => {
  const navigate = useNavigate();
  
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [feeHistory, setFeeHistory] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (studentId) {
      loadStudentDetails();
    }
  }, [studentId]);

  const loadStudentDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar informações do estudante
      const { data: studentData, error: studentError } = await supabase.rpc(
        'get_student_detailed_info',
        { target_student_id: studentId }
      );

      if (studentError) {
        throw new Error(`Failed to load student info: ${studentError.message}`);
      }

      if (studentData && studentData.length > 0) {
        setStudentInfo(studentData[0]);
      } else {
        setStudentInfo(null);
      }

      // Carregar histórico de taxas
      const { data: feesData, error: feesError } = await supabase.rpc(
        'get_student_fee_history',
        { target_student_id: studentId }
      );

      if (feesError) {
        console.warn('Could not load fee history:', feesError);
        setFeeHistory([]);
      } else {
        setFeeHistory(feesData || []);
      }

    } catch (error: any) {
      console.error('Error loading student details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'registered':
        return 'bg-blue-100 text-blue-800';
      case 'enrolled':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'dropped':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading student details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/seller/dashboard')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!studentInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Student not found</p>
          <button 
            onClick={() => navigate('/seller/dashboard')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
                         <button
               onClick={() => navigate('/seller/dashboard')}
               className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
               aria-label="Go back"
               title="Go back"
             >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Student Details</h1>
              <p className="text-sm text-slate-600">Complete information about {studentInfo.full_name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Student Profile */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">
                    {studentInfo.full_name?.charAt(0)?.toUpperCase() || 'S'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{studentInfo.full_name}</h2>
                <p className="text-slate-600">{studentInfo.email}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-700">
                    {studentInfo.phone || 'Not provided'}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-700">
                    {studentInfo.country || 'Location not provided'}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-700">
                    {studentInfo.registration_date ? formatDate(studentInfo.registration_date) : 'Not provided'}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-700">
                    Academic Level: {studentInfo.academic_level || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status & Registration */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Status & Registration</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600">Current Status</p>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full mt-1 ${getStatusColor(studentInfo.current_status)}`}>
                    {studentInfo.current_status}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-slate-600">Registration Date</p>
                  <p className="text-slate-900 font-medium">
                    {formatDate(studentInfo.registration_date)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600">Seller Referral Code</p>
                  <p className="text-slate-900 font-medium font-mono">
                    {studentInfo.seller_referral_code || 'None'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600">Referred by</p>
                  <p className="text-slate-900 font-medium">
                    {studentInfo.seller_name || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Fees & Activities */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Fees Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Fees Overview</h3>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm text-slate-600">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(studentInfo.total_fees_paid)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-600">Fees Count</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {studentInfo.fees_count}
                    </p>
                  </div>
                </div>
              </div>

              {feeHistory.length > 0 ? (
                <div className="space-y-4">
                  {feeHistory.map((fee) => (
                    <div key={fee.payment_id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-900">{fee.fee_name}</h4>
                            <p className="text-sm text-slate-600">
                              {fee.fee_type} • {fee.currency}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(fee.amount_paid)}
                          </p>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(fee.payment_status)}`}>
                            {fee.payment_status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>Paid on {formatDate(fee.payment_date)}</span>
                          </div>
                          {fee.stripe_payment_intent && (
                            <span className="font-mono text-xs">
                              ID: {fee.stripe_payment_intent.slice(-8)}
                            </span>
                          )}
                        </div>
                        {fee.notes && (
                          <p className="text-sm text-slate-600 mt-2">{fee.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-slate-900 mb-2">No fees paid yet</h4>
                  <p className="text-slate-500">This student hasn't paid any fees yet.</p>
                </div>
              )}
            </div>

            {/* Academic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Academic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Scholarship */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Award className="h-5 w-5 text-yellow-600" />
                    <h4 className="font-medium text-slate-900">Scholarship</h4>
                  </div>
                  <p className="text-slate-600">Information not available yet</p>
                </div>

                {/* University */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Building className="h-5 w-5 text-purple-600" />
                    <h4 className="font-medium text-slate-900">University</h4>
                  </div>
                  <p className="text-slate-600">Information not available yet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;
