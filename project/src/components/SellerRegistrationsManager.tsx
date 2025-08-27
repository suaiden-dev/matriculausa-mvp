import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Clock, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface SellerRegistration {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  registration_code: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

const SellerRegistrationsManager: React.FC = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<SellerRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<SellerRegistration | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load registrations apenas uma vez
  useEffect(() => {
    console.log('🔄 SellerRegistrationsManager useEffect triggered', { user: user?.id, hasLoaded });
    if (user && !hasLoaded) {
      console.log('🔄 Loading registrations for user:', user.id);
      loadRegistrations();
    }
  }, [user?.id, hasLoaded]); // Depender apenas do ID do usuário e da flag de carregamento

  const loadRegistrations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // For affiliate admins, load all pending registrations
      // regardless of the code used
      const { data, error } = await supabase
        .from('seller_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading registrations:', error);
        setError('Error loading registrations');
      } else {
        setRegistrations(data || []);
        setHasLoaded(true); // Marcar que os dados foram carregados
      }
    } catch (err) {
      console.error('Error loading registrations:', err);
      setError('Error loading registrations');
    } finally {
      setLoading(false);
    }
  };

  const approveRegistration = async (registrationId: string) => {
    try {
      // 1. Update status to approved
      const { error: updateError } = await supabase
        .from('seller_registrations')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Error approving registration:', updateError);
        throw updateError;
      }

      // 2. Get the registration to obtain email and user_id
      const { data: registration } = await supabase
        .from('seller_registrations')
        .select('email, full_name, user_id')
        .eq('id', registrationId)
        .single();

      if (registration && registration.user_id) {
        // 3. Update the user's role in the user_profiles table
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ role: 'seller' })
          .eq('user_id', registration.user_id);

        if (profileError) {
          console.error('Error updating user role:', profileError);
          // We won't fail here since the registration was already approved
        }
      }

      // 4. Reload registrations
      await loadRegistrations();
      setSuccess('Registration approved successfully!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      console.error('Error approving registration:', err);
      setError(err.message || 'Error approving registration');
      setTimeout(() => setError(''), 5000);
    }
  };

  const rejectRegistration = async (registrationId: string) => {
    try {
      // 1. Get the registration to obtain user_id before updating
      const { data: registration } = await supabase
        .from('seller_registrations')
        .select('user_id')
        .eq('id', registrationId)
        .single();

      if (!registration) {
        throw new Error('Registration not found');
      }

      // 2. Update status to rejected
      const { error: updateError } = await supabase
        .from('seller_registrations')
        .update({
          status: 'rejected'
        })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Error rejecting registration:', updateError);
        throw updateError;
      }

              // 3. If the user exists, revert the role to 'student'
      if (registration.user_id) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ role: 'student' })
          .eq('user_id', registration.user_id);

        if (profileError) {
          console.error('Error reverting user role:', profileError);
          // We won't fail here since the registration was already rejected
        }
      }

      // 4. Reload registrations
      await loadRegistrations();
      setSuccess('Registration rejected successfully!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      console.error('Error rejecting registration:', err);
      setError(err.message || 'Error rejecting registration');
      setTimeout(() => setError(''), 5000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <UserCheck className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <UserX className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const openDetailsModal = (registration: SellerRegistration) => {
    setSelectedRegistration(registration);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Manage Seller Registrations
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Approve or reject seller registration requests
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-gray-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-700">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {registrations.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <UserCheck className="w-5 h-5 text-gray-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-700">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {registrations.filter(r => r.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <UserX className="w-5 h-5 text-gray-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-700">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">
                {registrations.filter(r => r.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Registrations List */}
      {registrations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No seller registrations found.</p>
          <p className="text-sm mt-1">Registrations will appear here when sellers use their codes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((registration) => (
            <div
              key={registration.id}
              className="border border-gray-200 rounded-lg p-4 bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">
                      {registration.full_name}
                    </h4>
                    {getStatusBadge(registration.status)}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Email: {registration.email}</p>
                    {registration.phone && <p>Phone: {registration.phone}</p>}
                    <p>Code: <span className="font-mono">{registration.registration_code}</span></p>
                    <p>Registered on: {new Date(registration.created_at).toLocaleDateString('en-US')}</p>
                    {registration.approved_at && (
                      <p>
                        {registration.status === 'approved' ? 'Approved' : 'Rejected'} on: {' '}
                        {new Date(registration.approved_at).toLocaleDateString('en-US')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => openDetailsModal(registration)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {registration.status === 'pending' && (
                    <>
                      <button
                        onClick={() => approveRegistration(registration.id)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => rejectRegistration(registration.id)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Registration Details
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <p className="text-sm text-gray-900">{selectedRegistration.full_name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{selectedRegistration.email}</p>
              </div>
              
              {selectedRegistration.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{selectedRegistration.phone}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700">Registration Code</label>
                <p className="text-sm text-gray-900 font-mono">{selectedRegistration.registration_code}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">{getStatusBadge(selectedRegistration.status)}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Registration Date</label>
                <p className="text-sm text-gray-900">
                                      {new Date(selectedRegistration.created_at).toLocaleDateString('en-US')}
                </p>
              </div>
              
              {selectedRegistration.approved_at && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {selectedRegistration.status === 'approved' ? 'Approval Date' : 'Rejection Date'}
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedRegistration.approved_at).toLocaleDateString('en-US')}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerRegistrationsManager;
