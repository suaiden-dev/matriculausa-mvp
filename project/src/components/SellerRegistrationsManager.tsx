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

interface SellerRegistrationsManagerProps {
  onRefresh?: () => void;
}

const SellerRegistrationsManager: React.FC<SellerRegistrationsManagerProps> = ({ onRefresh }) => {
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
    if (user && !hasLoaded) {
      loadRegistrations();
    }
  }, [user?.id, hasLoaded]); // Depender apenas do ID do usuário e da flag de carregamento

  const loadRegistrations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      
      // Load registrations that used codes created by this admin
      // First get the codes created by this admin
      const { data: adminCodes, error: codesError } = await supabase
        .from('seller_registration_codes')
        .select('code')
        .eq('admin_id', user.id)
        .eq('is_active', true);


      if (codesError) {
        console.error('Error loading admin codes:', codesError);
        setError('Error loading admin codes');
        return;
      }

      if (!adminCodes || adminCodes.length === 0) {
        setRegistrations([]);
        setHasLoaded(true);
        return;
      }

      const codes = adminCodes.map(c => c.code);
      
      // Get all users who have used these codes (including those who were rejected)
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          full_name,
          email,
          phone,
          created_at,
          role,
          seller_referral_code
        `)
        .in('seller_referral_code', codes)
        .eq('role', 'student')
        .order('created_at', { ascending: false });


      if (usersError) {
        console.error('Error loading users:', usersError);
        setError('Error loading users');
        return;
      }

      // Get approved sellers for this admin
      // First get the affiliate_admin record for this user
      const { data: affiliateAdmin, error: adminError } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', user.id)
        .single();


      if (adminError) {
        console.error('Error fetching affiliate admin:', adminError);
        // Don't fail completely, just log the error
      }

      let sellers = [];
      if (affiliateAdmin) {
        const { data: sellersData, error: sellersError } = await supabase
          .from('sellers')
          .select(`
            user_id,
            name,
            email,
            created_at
          `)
          .eq('affiliate_admin_id', affiliateAdmin.id)
          .order('created_at', { ascending: false });


        if (sellersError) {
          console.error('Error loading sellers:', sellersError);
          // Don't fail completely, just log the error
        } else {
          sellers = sellersData || [];
        }
      }

      // Get registration history for this admin
      const { data: history, error: historyError } = await supabase
        .from('seller_registration_history')
        .select(`
          user_id,
          status,
          action_taken_at,
          notes,
          registration_code
        `)
        .eq('admin_id', user.id)
        .order('action_taken_at', { ascending: false });


      if (historyError) {
        console.error('Error loading registration history:', historyError);
        // Don't fail completely, just log the error
      }

      // Create maps for approved sellers and history
      const approvedSellers = new Map();
      (sellers || []).forEach(seller => {
        approvedSellers.set(seller.user_id, seller);
      });

      const registrationHistory = new Map();
      (history || []).forEach(record => {
        // Only keep the most recent record for each user
        if (!registrationHistory.has(record.user_id)) {
          registrationHistory.set(record.user_id, record);
        }
      });

      // Get user profiles for rejected users from history
      // Only show rejected users who are NOT currently using any registration code
      const rejectedUserIds = (history || [])
        .filter(record => record.status === 'rejected')
        .map(record => record.user_id);

      let rejectedUsers = [];
      if (rejectedUserIds.length > 0) {
        const { data: rejectedUsersData, error: rejectedError } = await supabase
          .from('user_profiles')
          .select(`
            user_id,
            full_name,
            email,
            phone,
            created_at,
            role,
            seller_referral_code
          `)
          .in('user_id', rejectedUserIds);

        if (rejectedError) {
          console.error('Error loading rejected users:', rejectedError);
        } else {
          // Only show users who are NOT currently using a registration code
          // (i.e., their seller_referral_code is null)
          rejectedUsers = (rejectedUsersData || []).filter(user => !user.seller_referral_code);
        }
      }

      // Transform current pending users into registration format
      const currentRegistrations = (users || []).map(user => {
        const isApproved = approvedSellers.has(user.user_id);
        const status = isApproved ? 'approved' : 'pending';
        
        
        return {
          id: user.user_id,
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          status: status,
          created_at: user.created_at,
          registration_code: user.seller_referral_code || 'Unknown',
          approved_at: isApproved ? approvedSellers.get(user.user_id)?.created_at : null
        };
      });

      // Transform rejected users into registration format
      const rejectedRegistrations = rejectedUsers.map(user => {
        const historyRecord = registrationHistory.get(user.user_id);
        return {
          id: user.user_id,
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          status: 'rejected',
          created_at: user.created_at,
          registration_code: historyRecord?.registration_code || 'Unknown',
          approved_at: historyRecord?.action_taken_at || null
        };
      });

      // Combine all registrations
      const registrations = [...currentRegistrations, ...rejectedRegistrations];


      setRegistrations(registrations);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error loading registrations:', err);
      setError('Error loading registrations');
    } finally {
      setLoading(false);
    }
  };

  const approveRegistration = async (userId: string) => {
    try {
      // 1. Get the user profile to obtain details
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw profileError;
      }

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // 2. Update the user's role from student to seller
      // Update user role to 'seller' using RPC function to avoid RLS recursion
      const { data: roleUpdateResult, error: roleUpdateError } = await supabase
        .rpc('update_user_role_safe', {
          target_user_id: userId,
          new_role: 'seller'
        });

      if (roleUpdateError) {
        console.error('Error updating user role:', roleUpdateError);
        throw roleUpdateError;
      }

      if (!roleUpdateResult) {
        throw new Error('Failed to update user role - insufficient permissions');
      }

      // 3. Get affiliate_admin_id from affiliate_admins table
      const { data: affiliateAdmin, error: adminError } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (adminError) {
        console.error('Error fetching affiliate admin:', adminError);
        throw adminError;
      }

      if (!affiliateAdmin) {
        throw new Error('Affiliate admin not found');
      }

      // 4. Check if seller already exists (ignore 406 errors)
      const { data: existingSeller, error: checkError } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 errors

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is expected if seller doesn't exist
        console.warn('Error checking existing seller:', checkError);
      }

      if (!existingSeller) {
        // 5. Create seller record in sellers table
        const { error: sellerError } = await supabase
          .from('sellers')
          .insert({
            user_id: userId,
            affiliate_admin_id: affiliateAdmin.id,
            name: userProfile.full_name,
            email: userProfile.email,
            phone: userProfile.phone,
            territory: 'General',
            referral_code: `SELL${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            is_active: true,
            notes: 'Approved from registration'
          });

        if (sellerError) {
          console.error('Error creating seller record:', sellerError);
          throw sellerError;
        }
      }

      // 6. Record the approval in history
      const { error: historyError } = await supabase
        .from('seller_registration_history')
        .insert({
          user_id: userId,
          admin_id: user?.id,
          registration_code: userProfile.seller_referral_code || 'Unknown',
          status: 'approved',
          notes: 'Registration approved by admin'
        });

      if (historyError) {
        console.error('Error recording approval history:', historyError);
        // Don't fail completely, just log the error
      }

      // 7. Reload registrations and refresh parent component
      await loadRegistrations();
      if (onRefresh) {
        onRefresh(); // Refresh the parent component (SellerManagement)
      }
      setSuccess('Registration approved successfully!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      console.error('Error approving registration:', err);
      setError(err.message || 'Error approving registration');
      setTimeout(() => setError(''), 5000);
    }
  };

  const rejectRegistration = async (userId: string) => {
    try {
      // 1. Get the user's registration code before removing it
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('seller_referral_code')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw profileError;
      }

      const registrationCode = userProfile?.seller_referral_code || 'Unknown';

      // 2. Record the rejection in history
      const { error: historyError } = await supabase
        .from('seller_registration_history')
        .insert({
          user_id: userId,
          admin_id: user?.id,
          registration_code: registrationCode,
          status: 'rejected',
          notes: 'Registration rejected by admin'
        });

      if (historyError) {
        console.error('Error recording rejection history:', historyError);
        // Don't fail completely, just log the error
      }

      // 3. Remove the seller_referral_code to remove from pending list
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          seller_referral_code: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error rejecting registration:', updateError);
        throw updateError;
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

      {/* Statistics - Only Pending */}
      <div className="mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-xs">
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
