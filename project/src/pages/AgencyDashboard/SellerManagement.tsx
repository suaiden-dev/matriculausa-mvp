import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Users, UserPlus, UserCheck, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import SellerRegistrationsManagerSimple from '../../components/SellerRegistrationsManagerSimple';
import { toast } from 'react-hot-toast';
import DirectSalesLink from './DirectSalesLink';

interface Seller {
  id: string;
  user_id: string;
  email: string | null;
  full_name?: string | null;
  role: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller';
  created_at: string | null;
  phone?: string | null;
  country?: string | null;
  isSeller: boolean;
  hasInactiveAffiliateCode?: boolean;
}

const SellerManagement: React.FC = () => {
  const location = useLocation();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [demotingUser, setDemotingUser] = useState<string | null>(null);
  const [showLinkGenerator, setShowLinkGenerator] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sellerToDeactivate, setSellerToDeactivate] = useState<{ id: string; name: string } | null>(null);
  const [sellerToRemove, setSellerToRemove] = useState<{ id: string; name: string } | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [localModifications, setLocalModifications] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [deactivatedSellers, setDeactivatedSellers] = useState<Set<string>>(new Set());
  const [showDeactivatedSellers, setShowDeactivatedSellers] = useState(false);
  const [deactivatedSellersList, setDeactivatedSellersList] = useState<Seller[]>([]);
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [showLinkedStudents, setShowLinkedStudents] = useState(false);
  const { user: currentUser } = useAuth();
  

  // Detect tab parameter from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab === 'registration') setShowLinkGenerator(true);
    if (tab === 'pending') setShowPending(true);
  }, [location.search]);



     // Pagination constants
  const USERS_PER_PAGE = 20;

  const loadSellers = async (forceRefresh = false) => {
    if (!currentUser?.id) {
      return;
    }
    try {
      // If not forcing refresh and we have local modifications, skip
      if (!forceRefresh && localModifications.size > 0) {
        return;
      }
      
      // If not forcing refresh and we already have sellers, skip
      if (!forceRefresh && sellers.length > 0) {
        return;
      }
      
      setLoading(true);
      setIsRefreshing(true);

      // Use RPC function to get sellers filtered by affiliate admin
      const { data: sellersData, error: sellersError } = await supabase
        .rpc('get_admin_sellers_analytics_fixed', { 
          admin_user_id: currentUser?.id 
        });

      if (sellersError) {
        console.error('❌ Error loading sellers:', sellersError);
        throw new Error(`Failed to load sellers: ${sellersError.message}`);
      }

      // Process seller data from RPC response
      const processedUsers = (sellersData || []).map((seller: any) => ({
        id: seller.seller_id,
        user_id: seller.seller_id, // RPC returns seller_id as the main ID
        email: seller.seller_email || null,
        full_name: seller.seller_name || null,
        role: 'seller' as const,
        created_at: seller.created_at || null,
        phone: null, // Not available in RPC response
        country: null, // Not available in RPC response
        isSeller: true,
        hasInactiveAffiliateCode: false,
        referral_code: seller.referral_code,
        students_count: seller.students_count,
        total_revenue: seller.total_revenue
      }));

      // Filter out deactivated sellers from database results
      const activeSellersFromDB = processedUsers.filter((seller: any) => 
        !deactivatedSellers.has(seller.id)
      );

      // Set sellers in local state
      setSellers(activeSellersFromDB);
    } catch (error: any) {
      console.error('❌ Error loading sellers:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

        // Load deactivated sellers from localStorage on component mount
      useEffect(() => {
        // Clear old localStorage data to prevent showing stale deactivated sellers
        localStorage.removeItem('deactivatedSellers');
        setDeactivatedSellers(new Set());
      }, []);


  // Load sellers when user is loaded
  useEffect(() => {
    // Only load if we haven't loaded data yet and haven't initialized
    if (currentUser?.id && !dataLoadedRef.current && !isInitialized.current) {
      isInitialized.current = true;
      loadSellers(false);
      dataLoadedRef.current = true;
    }
  }, [currentUser?.id]); // Run when user is loaded

  // Add a cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
  
    };
  }, []);

  // Add a ref to track if we've already loaded data
  const dataLoadedRef = React.useRef(false);

  // Add a flag to prevent multiple API calls
  const isInitialized = React.useRef(false);

  // Debug: Log when component re-renders (only in development)
  if (process.env.NODE_ENV === 'development') {

  }


  // Function to load deactivated sellers
  const loadDeactivatedSellers = async () => {
    try {
      // Use RPC function to get deactivated sellers filtered by affiliate admin
      const { data: deactivatedData, error } = await supabase
        .rpc('get_admin_deactivated_sellers', { 
          admin_user_id: currentUser?.id 
        });

      if (error) {
        console.error('Error loading deactivated sellers:', error);
        return;
      }

      const processedDeactivated = (deactivatedData || []).map((seller: any) => ({
        id: seller.seller_id,
        user_id: seller.seller_id, // RPC returns seller_id as the main ID
        email: seller.seller_email || null,
        full_name: seller.seller_name || null,
        role: 'student' as const,
        created_at: seller.created_at || null,
        phone: null, // Not available in RPC response
        country: null, // Not available in RPC response
        isSeller: false,
        hasInactiveAffiliateCode: false,
        referral_code: seller.referral_code,
        students_count: seller.students_count,
        total_revenue: seller.total_revenue
      }));

      setDeactivatedSellersList(processedDeactivated);
    } catch (error) {
      console.error('Error loading deactivated sellers:', error);
    }
  };

  // Function to check if seller has linked students
  const checkSellerHasStudents = async (sellerId: string) => {
    try {
      // Get the seller's referral code directly from sellers table
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('referral_code')
        .eq('id', sellerId)
        .single();

      if (sellerError || !sellerData) {
        console.error('Error fetching seller:', sellerError);
        return { hasStudents: false, students: [] };
      }

      // Check if any students are using this referral code
      const { data: students, error: studentsError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email, created_at')
        .eq('seller_referral_code', sellerData.referral_code)
        .eq('role', 'student');

      if (studentsError) {
        console.error('Error checking linked students:', studentsError);
        return { hasStudents: false, students: [] };
      }

      return {
        hasStudents: (students || []).length > 0,
        students: students || []
      };
    } catch (error) {
      console.error('Error checking seller students:', error);
      return { hasStudents: false, students: [] };
    }
  };

  // Function to reactivate a seller
  const reactivateSeller = async (sellerId: string, userName: string) => {
    try {
      setDemotingUser(sellerId);
      console.log('🔄 Starting reactivation for seller:', sellerId, userName);

      // Step 1: Get the user_id from the seller
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('user_id')
        .eq('id', sellerId)
        .single();

      if (sellerError || !sellerData) {
        console.error('Error fetching seller data:', sellerError);
        throw new Error(`Failed to fetch seller data: ${sellerError?.message || 'Seller not found'}`);
      }

      console.log('✅ Seller data fetched:', sellerData);

      // Step 2: Reactivate the seller by updating is_active to true
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ is_active: true })
        .eq('id', sellerId);

      if (updateError) {
        console.error('Error reactivating seller:', updateError);
        throw new Error(`Failed to reactivate seller: ${updateError.message}`);
      }

      console.log('✅ Seller reactivated in database');

      // Step 3: Update user role back to seller using RPC function to avoid RLS recursion
      const { data: roleUpdateResult, error: roleUpdateError } = await supabase
        .rpc('update_user_role_safe', { 
          target_user_id: sellerData.user_id, 
          new_role: 'seller' 
        });

      if (roleUpdateError) {
        console.error('Error updating user role:', roleUpdateError);
        throw new Error(`Failed to update user role: ${roleUpdateError.message}`);
      }

      if (!roleUpdateResult) {
        throw new Error('Failed to update user role - insufficient permissions');
      }

      console.log('✅ User role updated to seller');

      // Step 4: Remove from deactivated list FIRST
      setDeactivatedSellersList(prev => prev.filter(seller => seller.id !== sellerId));
      setDeactivatedSellers(prev => {
        const newSet = new Set(prev);
        newSet.delete(sellerId);
        return newSet;
      });

      console.log('✅ Removed from deactivated lists');

      // Step 5: Clear local modifications to ensure fresh data load
      setLocalModifications(new Set());

      // Step 6: Refresh sellers data to show updated list
      console.log('🔄 Refreshing sellers list...');
      await loadSellers(true);

      console.log('✅ Seller reactivation completed successfully');
      setSuccessMessage(`${userName} was reactivated successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error: any) {
      console.error('❌ Error reactivating seller:', error);
      setErrorMessage(`Error reactivating seller: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setDemotingUser(null);
    }
  };

    const deactivateSeller = async (sellerId: string, userName: string) => {
    try {
      setDemotingUser(sellerId);
      console.log('🔄 Starting deactivation for seller:', userName);

      // Step 1: Deactivate the seller using the new SQL function that bypasses RLS
      const { data: deactivateResult, error: updateError } = await supabase
        .rpc('deactivate_seller_by_admin', { 
          seller_id: sellerId, 
          admin_user_id: currentUser?.id 
        });

      if (updateError) {
        console.error('❌ Error calling deactivate_seller_by_admin:', updateError);
        throw new Error(`Failed to deactivate seller in database: ${updateError.message}`);
      }

      if (!deactivateResult) {
        console.error('❌ deactivate_seller_by_admin returned false');
        throw new Error('Failed to deactivate seller - function returned false');
      }

      // Step 2: User role already updated by the SQL function

      // Step 3: Update local state immediately - remove seller from list
      setSellers(prevSellers => prevSellers.filter(seller => seller.id !== sellerId));

      // Step 4: Track this modification to prevent reloading
      setLocalModifications(prev => new Set(prev).add(sellerId));
      setDeactivatedSellers(prev => new Set(prev).add(sellerId));
      
      // Step 5: Persist deactivated sellers to localStorage
      const storedDeactivated = JSON.parse(localStorage.getItem('deactivatedSellers') || '[]');
      if (!storedDeactivated.includes(sellerId)) {
        storedDeactivated.push(sellerId);
        localStorage.setItem('deactivatedSellers', JSON.stringify(storedDeactivated));
      }
      
      // Step 6: Close modal and clear state
      setShowConfirmModal(false);
      setSellerToDeactivate(null);
      
      // Step 7: Show success message
      setSuccessMessage(`${userName} was deactivated successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);

      console.log('✅ Seller deactivation completed successfully');
    } catch (error: any) {
      console.error('❌ Error during seller deactivation:', error);
      setErrorMessage(`Error deactivating seller: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setDemotingUser(null);
    }
  };

     // Function to completely remove a seller (hard delete)
  const removeSeller = async (sellerId: string, userName: string) => {
    try {
      setDemotingUser(sellerId);
      console.log('🗑️ Starting complete removal for seller:', sellerId, userName);

      // Step 1: Check if seller has linked students
      const { hasStudents, students } = await checkSellerHasStudents(sellerId);
      
      if (hasStudents) {
        console.log('❌ Cannot remove seller - has linked students:', students);
        setErrorMessage(
          `Cannot remove ${userName}. This seller has ${students.length} linked student(s). ` +
          `Please reassign the students to another seller first, or deactivate instead of removing.`
        );
        setTimeout(() => setErrorMessage(''), 8000);
        setShowRemoveModal(false);
        setSellerToRemove(null);
        return;
      }

      // Step 2: Completely remove from sellers table (hard delete)
      const { error: deleteError } = await supabase
        .from('sellers')
        .delete()
        .eq('id', sellerId);

      if (deleteError) {
        console.error('❌ Error deleting seller:', deleteError);
        throw new Error(`Failed to delete seller: ${deleteError.message}`);
      }

      // Step 3: Get the user_id from the seller before updating role
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('user_id')
        .eq('id', sellerId)
        .single();

      if (sellerError || !sellerData) {
        console.error('❌ Error fetching seller user_id:', sellerError);
        console.warn('⚠️ Seller deleted but could not fetch user_id for role update');
      } else {
        // Step 4: Update user role to 'student' using RPC function to avoid RLS recursion
        const { data: roleUpdateResult, error: roleUpdateError } = await supabase
          .rpc('update_user_role_safe', {
            target_user_id: sellerData.user_id,
            new_role: 'student'
          });

        if (roleUpdateError) {
          console.error('❌ Error updating user role:', roleUpdateError);
          console.warn('⚠️ Seller deleted but role update failed');
        } else if (!roleUpdateResult) {
          console.warn('⚠️ Seller deleted but role update failed - insufficient permissions');
        }
      }

      // Step 4: Update local state
      setSellers(prevSellers => prevSellers.filter(seller => seller.id !== sellerId));
      
      // Step 5: Remove from deactivated sellers set
      setDeactivatedSellers(prev => {
        const newSet = new Set(prev);
        newSet.delete(sellerId);
        return newSet;
      });

      // Step 6: Remove from localStorage
      const storedDeactivated = JSON.parse(localStorage.getItem('deactivatedSellers') || '[]');
      const updatedStored = storedDeactivated.filter((id: string) => id !== sellerId);
      localStorage.setItem('deactivatedSellers', JSON.stringify(updatedStored));

      // Step 7: Close modal
      setShowRemoveModal(false);
      setSellerToRemove(null);
      
      // Step 8: Show success message
      setSuccessMessage(`${userName} was completely removed from the system!`);
      setTimeout(() => setSuccessMessage(''), 3000);

      console.log('✅ Seller removal completed successfully');
    } catch (error: any) {
      console.error('❌ Error during seller removal:', error);
      setErrorMessage(`Error removing seller: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setDemotingUser(null);
    }
  };

  // Function to open confirmation modal
  const openDeactivateModal = (sellerId: string, sellerName: string) => {
    setSellerToDeactivate({ id: sellerId, name: sellerName });
    setShowConfirmModal(true);
  };

  // Function to open removal modal
  const openRemoveModal = async (sellerId: string, sellerName: string) => {
    setSellerToRemove({ id: sellerId, name: sellerName });
    
    // Check if seller has linked students
    const { hasStudents, students } = await checkSellerHasStudents(sellerId);
    
    if (hasStudents) {
      setLinkedStudents(students);
      setShowLinkedStudents(true);
      setShowRemoveModal(false); // Don't show remove modal
    } else {
      setShowRemoveModal(true);
    }
  };

     // Function to confirm deactivation
  const confirmDeactivation = () => {
    if (sellerToDeactivate) {
      deactivateSeller(sellerToDeactivate.id, sellerToDeactivate.name);
    }
  };

     // Filter sellers based on search
  const filteredSellers = sellers.filter(seller => {
    const matchesSearch = 
      (seller.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (seller.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

     // Pagination calculations
  const totalSellers = filteredSellers.length;
  const totalPages = Math.ceil(totalSellers / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const paginatedSellers = filteredSellers.slice(startIndex, endIndex);

     // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPaginationInfo = () => {
    if (totalSellers === 0) return 'No sellers found';
    const start = startIndex + 1;
    const end = Math.min(endIndex, totalSellers);
    return `Showing ${start}-${end} of ${totalSellers} sellers`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };



  // Debug log for render
  

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <React.Fragment>
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Seller Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your sales team and track their performance.</p>
        </div>
        <button
          onClick={() => setShowLinkGenerator(!showLinkGenerator)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#05294E] text-white rounded-xl text-sm font-semibold hover:bg-[#041f3a] transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Seller
        </button>
      </div>

      {/* Direct Sales Link */}
      <DirectSalesLink />

      {/* Invite Seller Panel (expandable) */}
      {showLinkGenerator && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Invite New Seller</h2>
            <button
              onClick={() => { setShowLinkGenerator(false); setInviteEmail(''); setInviteError(''); }}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="p-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inviteEmail.trim()) return;
                setInviteLoading(true);
                setInviteError('');
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const { data, error } = await supabase.functions.invoke('invite-seller', {
                    body: { 
                      email: inviteEmail.trim(),
                      redirectTo: `${window.location.origin}/seller/accept-invite`
                    },
                    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
                  });
                   if (error) throw error;
                   if (data?.error) throw new Error(data.error);
                   setInviteEmail('');
                   toast.success('Convite enviado com sucesso! O vendedor receberá um e-mail para concluir o cadastro.');
                   loadSellers(true);
                } catch (err: any) {
                  setInviteError(err.message || 'Failed to send invite. Please try again.');
                } finally {
                  setInviteLoading(false);
                }
              }}
              className="space-y-4 max-w-md"
            >
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="seller@example.com"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 focus:border-[#05294E]"
                />
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                  <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                  How the invitation works
                </h4>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">1.</span>
                    <span>An invitation link is automatically sent to the email address above.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">2.</span>
                    <span>The seller clicks the link to complete registration (sets their full name, password, and phone number).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">3.</span>
                    <span>The account is activated instantly, associating them automatically with your agency.</span>
                  </li>
                </ul>
              </div>

              {inviteError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {inviteError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowLinkGenerator(false); setInviteEmail(''); setInviteError(''); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#05294E] text-white rounded-xl text-sm font-semibold hover:bg-[#041f3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviteLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                      Sending...
                    </>
                  ) : (
                    'Send Invite'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search sellers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 focus:border-[#05294E]"
            />
          </div>
          <div className="flex items-center gap-2">

            <button
              onClick={() => {
                setShowDeactivatedSellers(!showDeactivatedSellers);
                if (!showDeactivatedSellers) loadDeactivatedSellers();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                showDeactivatedSellers ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {showDeactivatedSellers ? 'Hide Deactivated' : 'Deactivated'}
              {deactivatedSellers.size > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-200 text-orange-800 rounded-full">
                  {deactivatedSellers.size}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setLocalModifications(new Set());
                setDeactivatedSellers(new Set());
                localStorage.removeItem('deactivatedSellers');
                loadSellers(true);
              }}
              disabled={isRefreshing}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              title="Refresh"
            >
              {isRefreshing
                ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600" />
                : <RefreshCw className="w-4 h-4" />
              }
            </button>
          </div>
        </div>

        {/* Active Sellers Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Seller</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedSellers.map((seller) => (
                <tr key={seller.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#05294E] to-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">
                          {(seller.full_name?.charAt(0) || seller.email?.charAt(0) || '?').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{seller.full_name || 'Name not provided'}</p>
                        <p className="text-xs text-slate-400">{seller.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(seller.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openDeactivateModal(seller.id, seller.full_name || seller.email || 'Seller')}
                        disabled={demotingUser === seller.id}
                        className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        {demotingUser === seller.id ? 'Deactivating...' : 'Deactivate'}
                      </button>
                      <button
                        onClick={() => openRemoveModal(seller.id, seller.full_name || seller.email || 'Seller')}
                        disabled={demotingUser === seller.id}
                        className="text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {paginatedSellers.length === 0 && filteredSellers.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium mb-1">No sellers yet</p>
            <p className="text-sm text-slate-400 mb-4">Add your first seller to start tracking performance.</p>
            <button
              onClick={() => setShowLinkGenerator(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#05294E] text-white rounded-xl text-sm font-semibold hover:bg-[#041f3a] transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add First Seller
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">{getPaginationInfo()}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500 px-2">{currentPage} / {totalPages}</span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deactivated Sellers (expandable) */}
      {showDeactivatedSellers && (
        <div className="bg-white rounded-2xl shadow-sm border border-orange-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-orange-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Deactivated Sellers</h3>
              <p className="text-xs text-slate-500 mt-0.5">{deactivatedSellersList.length} seller(s) deactivated</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Seller</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {deactivatedSellersList.map((seller) => (
                  <tr key={seller.id} className="hover:bg-orange-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-slate-500">
                            {(seller.full_name?.charAt(0) || seller.email?.charAt(0) || 'S').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{seller.full_name || 'Unknown'}</p>
                          <p className="text-xs text-slate-400">{seller.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        Deactivated
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(seller.created_at)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => reactivateSeller(seller.id, seller.full_name || seller.email || 'Seller')}
                        disabled={demotingUser === seller.id}
                        className="text-xs px-3 py-1.5 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                      >
                        {demotingUser === seller.id ? 'Reactivating...' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Registrations (expandable) */}
      {showPending && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Pending Registrations</h2>
            <button onClick={() => setShowPending(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
          </div>
          <div className="p-6">
            <SellerRegistrationsManagerSimple onRefresh={() => loadSellers(true)} />
          </div>
        </div>
      )}

    </div>{/* end space-y-6 */}

       {showConfirmModal && sellerToDeactivate && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white p-4 rounded-lg shadow-xl max-w-sm w-full">
             <h3 className="text-lg font-medium text-gray-900 mb-3">Deactivate Seller?</h3>
             <p className="text-gray-600 mb-4">
               This will deactivate "{sellerToDeactivate.name}"
             </p>
             <div className="flex justify-end space-x-2">
               <button
                 onClick={() => setShowConfirmModal(false)}
                 className="px-3 py-2 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
               >
                 Cancel
               </button>
               <button
                 onClick={confirmDeactivation}
                 className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
               >
                 Deactivate
               </button>
             </div>
           </div>
         </div>
       )}

       {showRemoveModal && sellerToRemove && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white p-4 rounded-lg shadow-xl max-w-sm w-full">
             <h3 className="text-lg font-medium text-gray-900 mb-3">Remove Seller?</h3>
             <p className="text-gray-600 mb-4">
               This will permanently delete "{sellerToRemove.name}"
             </p>
             <div className="flex justify-end space-x-2">
               <button
                 onClick={() => setShowRemoveModal(false)}
                 className="px-3 py-2 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
               >
                 Cancel
               </button>
               <button
                 onClick={() => removeSeller(sellerToRemove.id, sellerToRemove.name)}
                 className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
               >
                 Remove
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Linked Students Warning Modal */}
       {showLinkedStudents && sellerToRemove && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
             <div className="flex items-center mb-4">
               <div className="flex-shrink-0">
                 <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                   <span className="text-orange-600 text-sm font-medium">⚠️</span>
                 </div>
               </div>
               <div className="ml-3">
                 <h3 className="text-lg font-medium text-gray-900">Cannot Remove Seller</h3>
                 <p className="text-sm text-gray-600">
                   This seller has linked students and cannot be removed.
                 </p>
               </div>
             </div>
             
             <div className="mb-4">
               <p className="text-sm text-gray-700 mb-3">
                 <strong>{sellerToRemove.name}</strong> has <strong>{linkedStudents.length} linked student(s)</strong> 
                 who used their referral code. Removing this seller would break the tracking system.
               </p>
               
               <div className="bg-gray-50 rounded-lg p-4">
                 <h4 className="text-sm font-medium text-gray-900 mb-2">Linked Students:</h4>
                 <div className="space-y-2 max-h-40 overflow-y-auto">
                   {linkedStudents.map((student, index) => (
                     <div key={student.user_id || index} className="flex items-center justify-between text-sm">
                       <div>
                         <span className="font-medium text-gray-900">
                           {student.full_name || 'Unknown Name'}
                         </span>
                         <span className="text-gray-500 ml-2">
                           ({student.email})
                         </span>
                       </div>
                       <span className="text-gray-400 text-xs">
                         {new Date(student.created_at).toLocaleDateString()}
                       </span>
                     </div>
                   ))}
                 </div>
               </div>
             </div>

             <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
               <div className="flex">
                 <div className="flex-shrink-0">
                   <span className="text-blue-400">💡</span>
                 </div>
                 <div className="ml-3">
                   <h4 className="text-sm font-medium text-blue-800">Recommended Actions:</h4>
                   <ul className="text-sm text-blue-700 mt-1 space-y-1">
                     <li>• <strong>Deactivate</strong> the seller instead of removing</li>
                     <li>• <strong>Reassign</strong> students to another seller first</li>
                     <li>• <strong>Wait</strong> until students complete their process</li>
                   </ul>
                 </div>
               </div>
             </div>

             <div className="flex justify-end space-x-3">
               <button
                 onClick={() => {
                   setShowLinkedStudents(false);
                   setSellerToRemove(null);
                   setLinkedStudents([]);
                 }}
                 className="px-4 py-2 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
               >
                 Close
               </button>
               <button
                 onClick={() => {
                   setShowLinkedStudents(false);
                   setSellerToRemove(null);
                   setLinkedStudents([]);
                   // Open deactivate modal instead
                   if (sellerToRemove) {
                     openDeactivateModal(sellerToRemove.id, sellerToRemove.name);
                   }
                 }}
                 className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
               >
                 Deactivate Instead
               </button>
             </div>
           </div>
         </div>
       )}

      {successMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 py-2 rounded text-sm shadow-lg z-50">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-3 py-2 rounded text-sm shadow-lg z-50">
          {errorMessage}
        </div>
      )}
    </React.Fragment>
  );
};

export default SellerManagement;
