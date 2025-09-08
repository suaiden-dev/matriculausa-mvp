import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Users, UserPlus, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import SellerRegistrationLinkGenerator from '../../components/SellerRegistrationLinkGenerator';
import SellerRegistrationsManager from '../../components/SellerRegistrationsManager';

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
  const [activeTab, setActiveTab] = useState<'management' | 'registration' | 'pending'>('management');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sellerToDeactivate, setSellerToDeactivate] = useState<{ id: string; name: string } | null>(null);
  const [sellerToRemove, setSellerToRemove] = useState<{ id: string; name: string } | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [localModifications, setLocalModifications] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deactivatedSellers, setDeactivatedSellers] = useState<Set<string>>(new Set());
  const [showDeactivatedSellers, setShowDeactivatedSellers] = useState(false);
  const [deactivatedSellersList, setDeactivatedSellersList] = useState<Seller[]>([]);
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [showLinkedStudents, setShowLinkedStudents] = useState(false);
  const { user: currentUser } = useAuth();
  
  // Memoize the user to prevent unnecessary re-renders
  const memoizedUser = React.useMemo(() => currentUser, [currentUser?.id]);

  // Detect tab parameter from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab === 'registration' || tab === 'pending') {
      setActiveTab(tab);
    }
  }, [location.search]);



     // Pagination constants
  const USERS_PER_PAGE = 20;

  const loadSellers = async (forceRefresh = false) => {
    try {
      // If not forcing refresh and we have local modifications, skip
      if (!forceRefresh && localModifications.size > 0) {
        return;
      }
      
      // If not forcing refresh and we already have sellers, skip
      if (!forceRefresh && sellers.length > 0 && !forceRefresh) {
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
        created_at: seller.last_referral_date || null,
        phone: null, // Not available in RPC response
        country: null, // Not available in RPC response
        isSeller: true,
        hasInactiveAffiliateCode: false,
        referral_code: seller.referral_code,
        students_count: seller.students_count,
        total_revenue: seller.total_revenue
      }));

      // Filter out deactivated sellers from database results
      const activeSellersFromDB = processedUsers.filter(seller => 
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

  // Load sellers when component mounts or when activeTab changes to management
  useEffect(() => {
    if (activeTab === 'management') {
      loadSellers(true); // Force refresh when switching to management tab
    }
  }, [activeTab]);

  // Load sellers only once when component mounts
  useEffect(() => {
    // Only load if we haven't loaded data yet and haven't initialized
    if (!dataLoadedRef.current && !isInitialized.current) {
      isInitialized.current = true;
      loadSellers(false);
      dataLoadedRef.current = true;
    }
  }, []); // Empty dependency array to run only once

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

  // Prevent unnecessary re-renders by memoizing the component
  const memoizedSellers = React.useMemo(() => sellers, [sellers]);

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
        created_at: seller.last_referral_date || null,
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

      // Step 2: Reactivate the seller by updating is_active to true
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ is_active: true })
        .eq('id', sellerId);

      if (updateError) {
        console.error('Error reactivating seller:', updateError);
        throw new Error(`Failed to reactivate seller: ${updateError.message}`);
      }

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

      // Step 4: Remove from deactivated list
      setDeactivatedSellersList(prev => prev.filter(seller => seller.id !== sellerId));
      setDeactivatedSellers(prev => {
        const newSet = new Set(prev);
        newSet.delete(sellerId);
        return newSet;
      });

      // Step 5: Refresh sellers data to show updated list
      await loadSellers(true);

      setSuccessMessage(`${userName} was reactivated successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error: any) {
      console.error('Error reactivating seller:', error);
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
      {/* Tabs Navigation - Simplified */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-6 px-6">
          <button
            onClick={() => setActiveTab('management')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'management'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage Sellers
          </button>
          <button
            onClick={() => setActiveTab('registration')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'registration'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Generate Links
          </button>
          <button
                         onClick={() => setActiveTab('pending')}
             className={`py-3 px-1 border-b-2 font-medium text-sm ${
               activeTab === 'pending'
                 ? 'border-blue-500 text-blue-600'
                 : 'border-transparent text-gray-500 hover:text-gray-700'
             }`}
           >
             Pending
           </button>
         </nav>
       </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'management' && (
            <>
                             {/* Header Stats - Simplified */}
               <div className="flex items-center space-x-8 mb-6">
                 <div className="flex items-center space-x-2">
                   <Users className="h-5 w-5 text-gray-600" />
                   <span className="text-sm text-gray-600">{sellers.length} Active Sellers</span>
                 </div>
                 
                 {deactivatedSellers.size > 0 && (
                   <div className="flex items-center space-x-2">
                     <UserCheck className="h-5 w-5 text-orange-500" />
                     <span className="text-sm text-orange-600">{deactivatedSellers.size} deactivated</span>
                   </div>
                 )}
                 
                 <button
                   onClick={() => {
                     setShowDeactivatedSellers(!showDeactivatedSellers);
                     if (!showDeactivatedSellers) {
                       loadDeactivatedSellers();
                     }
                   }}
                   className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                 >
                   {showDeactivatedSellers ? 'Hide Deactivated' : 'Show Deactivated'}
                 </button>
               </div>

                             {/* Search - Simplified */}
               <div className="mb-6">
                 <div className="relative max-w-md">
                   <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                   <input
                     type="text"
                     placeholder="Search sellers..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   />
                 </div>
               </div>

                             {/* Sellers Table */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="px-6 py-4 border-b border-slate-200">
                   <div className="flex justify-between items-center">
                     <div>
                       <h2 className="text-lg font-semibold text-gray-900">Sellers</h2>
                     </div>
                     <div className="flex items-center space-x-3">
                       <button
                         onClick={() => {
                           setLocalModifications(new Set());
                           setDeactivatedSellers(new Set());
                           localStorage.removeItem('deactivatedSellers');
                           loadSellers(true);
                         }}
                         disabled={isRefreshing}
                         className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                       >
                         {isRefreshing ? 'Refreshing...' : 'Refresh'}
                       </button>
                       <div className="text-sm text-gray-500">
                         {getPaginationInfo()}
                       </div>
                     </div>
                   </div>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="min-w-full divide-y divide-slate-200">
                     <thead className="bg-gray-50">
                       <tr>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           Seller
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           Status
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           Date
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           Actions
                         </th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                       {paginatedSellers.map((seller) => (
                         <tr key={seller.id} className="hover:bg-gray-50">
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex items-center">
                               <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                 <span className="text-sm font-medium text-gray-700">
                                   {seller.full_name?.charAt(0) || seller.email?.charAt(0) || '?'}
                                 </span>
                               </div>
                               <div className="ml-3">
                                 <div className="text-sm font-medium text-gray-900">
                                   {seller.full_name || 'Name not provided'}
                                 </div>
                                 <div className="text-sm text-gray-500">{seller.email}</div>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                               Active
                             </span>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                             {formatDate(seller.created_at)}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                             <div className="flex space-x-2">
                               <button
                                 onClick={() => openDeactivateModal(seller.id, seller.full_name || seller.email || 'Seller')}
                                 disabled={demotingUser === seller.id}
                                 className="text-red-600 hover:text-red-900 disabled:opacity-50 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                               >
                                 {demotingUser === seller.id ? 'Deactivating...' : 'Deactivate'}
                               </button>
                               <button
                                 onClick={() => openRemoveModal(seller.id, seller.full_name || seller.email || 'Seller')}
                                 disabled={demotingUser === seller.id}
                                 className="text-gray-600 hover:text-gray-900 disabled:opacity-50 text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50"
                               >
                                 {demotingUser === seller.id ? 'Removing...' : 'Remove'}
                               </button>
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
                </div>

                {/* Deactivated Sellers Table */}
                {showDeactivatedSellers && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Deactivated Sellers</h3>
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Seller
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {deactivatedSellersList.map((seller) => (
                            <tr key={seller.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-600">
                                      {(seller.full_name || seller.email || 'S').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900">
                                      {seller.full_name || 'Unknown'}
                                    </div>
                                    <div className="text-sm text-gray-500">{seller.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                  Deactivated
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(seller.created_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => reactivateSeller(seller.id, seller.full_name || seller.email || 'Seller')}
                                  disabled={demotingUser === seller.id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 text-xs px-2 py-1 border border-green-200 rounded hover:bg-green-50"
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

                 {paginatedSellers.length === 0 && filteredSellers.length === 0 && (
                   <div className="text-center py-8">
                     <UserPlus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                     <p className="text-gray-500">No sellers found</p>
                   </div>
                 )}

                 {/* Pagination - Simplified */}
                 {totalPages > 1 && (
                   <div className="px-6 py-3 border-t border-gray-200">
                     <div className="flex items-center justify-center space-x-2">
                       <button
                         onClick={() => goToPage(currentPage - 1)}
                         disabled={currentPage === 1}
                         className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                       >
                         Previous
                       </button>
                       
                       <span className="text-sm text-gray-500 px-3">
                         {currentPage} of {totalPages}
                       </span>
                       
                       <button
                         onClick={() => goToPage(currentPage + 1)}
                         disabled={currentPage === totalPages}
                         className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                       >
                         Next
                       </button>
                     </div>
                   </div>
                 )}
              </div>
            </>
          )}

          {activeTab === 'registration' && (
            <SellerRegistrationLinkGenerator />
          )}

          {activeTab === 'pending' && (
            <SellerRegistrationsManager onRefresh={() => loadSellers(true)} />
          )}
        </div>
      </div>

             {/* Confirmation Modal - Simplified */}
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

             {/* Removal Confirmation Modal - Simplified */}
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

             {/* Success/Error Messages - Simplified */}
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
