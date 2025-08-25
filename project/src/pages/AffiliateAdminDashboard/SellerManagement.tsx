import React, { useState, useEffect, useCallback } from 'react';
import { Search, Users, UserPlus, Check, X, AlertTriangle, Crown, ChevronLeft, ChevronRight, Settings, UserCheck } from 'lucide-react';
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
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [demotingUser, setDemotingUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'management' | 'registration' | 'pending'>('management');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sellerToDeactivate, setSellerToDeactivate] = useState<{ id: string; name: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [localModifications, setLocalModifications] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deactivatedSellers, setDeactivatedSellers] = useState<Set<string>>(new Set());
  const { user: currentUser } = useAuth();

     // Pagination constants
  const USERS_PER_PAGE = 20;

  useEffect(() => {
    console.log('🔄 useEffect triggered - calling loadSellers');
    loadSellers(false); // Don't force refresh on mount
  }, []);

  const loadSellers = useCallback(async (forceRefresh = false) => {
    try {
      console.log('🔄 loadSellers called - fetching sellers from database', { forceRefresh });
      
      // If not forcing refresh and we have local modifications, skip
      if (!forceRefresh && localModifications.size > 0) {
        console.log('⚠️ Skipping loadSellers due to local modifications');
        return;
      }
      
      setLoading(true);
      setIsRefreshing(true);

      // Fetch all active sellers
      const { data: sellersData, error: sellersError } = await supabase
        .from('sellers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (sellersError) {
        console.error('❌ Error loading sellers:', sellersError);
        throw new Error(`Failed to load sellers: ${sellersError.message}`);
      }

      console.log('📊 Sellers data from database:', sellersData?.length || 0, 'sellers');

      // Process seller data
      const processedUsers = (sellersData || []).map((seller: any) => ({
        id: seller.id,
        user_id: seller.user_id,
        email: seller.email || null,
        full_name: seller.name || null,
        role: 'seller' as const,
        created_at: seller.created_at || null,
        phone: seller.phone || null,
        country: seller.territory || null,
        isSeller: true,
        hasInactiveAffiliateCode: false
      }));

             // Filter out deactivated sellers from database results
       const activeSellersFromDB = processedUsers.filter(seller => 
         !deactivatedSellers.has(seller.id)
       );
       
       console.log('🔄 Filtered sellers from database:', {
         total: processedUsers.length,
         active: activeSellersFromDB.length,
         deactivated: deactivatedSellers.size
       });

       // Set sellers in local state
       setSellers(activeSellersFromDB);
      
      console.log('✅ Sellers state updated with', processedUsers.length, 'sellers');
    } catch (error: any) {
      console.error('❌ Error loading sellers:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [localModifications, deactivatedSellers]); // Include dependencies to prevent stale closures

    const deactivateSeller = async (sellerId: string, userName: string) => {
    try {
      setDemotingUser(sellerId);
      console.log('🔄 Starting deactivation for seller:', sellerId, userName);

      // Step 1: Deactivate the seller in the sellers table (soft delete)
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ is_active: false })
        .eq('id', sellerId);

      if (updateError) {
        console.error('❌ Error updating sellers table:', updateError);
        throw new Error(`Failed to deactivate seller in database: ${updateError.message}`);
      }

      console.log('✅ Seller deactivated in database successfully');

      // Step 2: Update local state immediately - remove seller from list
      setSellers(prevSellers => {
        const updatedSellers = prevSellers.filter(seller => seller.id !== sellerId);
        console.log('🔄 Updated local state:', {
          before: prevSellers.length,
          after: updatedSellers.length,
          removed: sellerId
        });
        return updatedSellers;
      });

      // Step 3: Track this modification to prevent reloading
      setLocalModifications(prev => new Set(prev).add(sellerId));
      setDeactivatedSellers(prev => new Set(prev).add(sellerId));
      console.log('✅ Added seller to local modifications and deactivated sellers:', sellerId);
      
      // Step 4: Close modal and clear state
      setShowConfirmModal(false);
      setSellerToDeactivate(null);
      
      // Step 5: Show success message
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

     // Function to open confirmation modal
  const openDeactivateModal = (sellerId: string, sellerName: string) => {
    setSellerToDeactivate({ id: sellerId, name: sellerName });
    setShowConfirmModal(true);
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
  console.log('🔄 SellerManagement render - sellers count:', sellers.length, 'loading:', loading, 'local modifications:', localModifications.size, 'deactivated sellers:', deactivatedSellers.size);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-slate-600">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('management')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'management'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Manage Sellers
            </button>
            <button
              onClick={() => setActiveTab('registration')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'registration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Generate Registration Links
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserCheck className="w-4 h-4 inline mr-2" />
              Pending Registrations
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'management' && (
            <>
                             {/* Header Stats */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <div className="flex items-center">
                     <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                       <Users className="h-6 w-6 text-blue-600" />
                     </div>
                     <div className="ml-4">
                       <p className="text-sm font-medium text-slate-500">Total Sellers</p>
                       <p className="text-2xl font-bold text-slate-900">{sellers.length}</p>
                     </div>
                   </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <div className="flex items-center">
                     <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                       <UserPlus className="h-6 w-6 text-green-600" />
                     </div>
                     <div className="ml-4">
                       <p className="text-sm font-medium text-slate-500">Active Sellers</p>
                       <p className="text-2xl font-bold text-slate-900">
                         {sellers.filter(s => s.isSeller).length}
                       </p>
                     </div>
                   </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <div className="flex items-center">
                     <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                       <Settings className="h-6 w-6 text-orange-600" />
                     </div>
                     <div className="ml-4">
                       <p className="text-sm font-medium text-slate-500">Management</p>
                       <p className="text-2xl font-bold text-slate-900">Active</p>
                     </div>
                   </div>
                 </div>
               </div>

                             {/* Search */}
               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                 <div className="flex flex-col sm:flex-row gap-4">
                   <div className="flex-1">
                     <div className="relative">
                       <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                       <input
                         type="text"
                         placeholder="Search sellers by name or email..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                       />
                     </div>
                   </div>
                 </div>
               </div>

                             {/* Sellers Table */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="px-6 py-4 border-b border-slate-200">
                                        <div className="flex justify-between items-center">
                       <div>
                         <h2 className="text-xl font-bold text-slate-900">My Sellers</h2>
                         <p className="text-slate-600 text-sm">Sellers registered through your codes</p>
                       </div>
                                                <div className="flex items-center space-x-4">
                           {deactivatedSellers.size > 0 && (
                             <div className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded-md">
                               {deactivatedSellers.size} seller{deactivatedSellers.size > 1 ? 's' : ''} deactivated this session
                             </div>
                           )}
                           <button
                             onClick={() => {
                               console.log('🔄 Manual refresh requested');
                               setLocalModifications(new Set()); // Clear modifications
                               setDeactivatedSellers(new Set()); // Clear deactivated sellers
                               loadSellers(true); // Force refresh
                             }}
                             disabled={isRefreshing}
                             className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                             {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
                           </button>
                           <div className="text-sm text-slate-500">
                             {getPaginationInfo()}
                           </div>
                         </div>
                     </div>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="min-w-full divide-y divide-slate-200">
                     <thead className="bg-slate-50">
                       <tr>
                         <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                           Seller
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                           Status
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                           Registered on
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                           Actions
                         </th>
                       </tr>
                     </thead>
                                         <tbody className="bg-white divide-y divide-slate-200">
                       {paginatedSellers.map((seller) => (
                         <tr key={seller.id} className="hover:bg-slate-50">
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex items-center">
                               <div className="flex-shrink-0 h-10 w-10">
                                 <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                   <span className="text-sm font-medium text-green-700">
                                     {seller.full_name?.charAt(0) || seller.email?.charAt(0) || '?'}
                                   </span>
                                 </div>
                               </div>
                               <div className="ml-4">
                                 <div className="text-sm font-medium text-slate-900">
                                   {seller.full_name || 'Name not provided'}
                                 </div>
                                 <div className="text-sm text-slate-500">{seller.email}</div>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                             Active Seller
                           </span>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                             {formatDate(seller.created_at)}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                             <button
                               onClick={() => openDeactivateModal(seller.id, seller.full_name || seller.email || 'Seller')}
                               disabled={demotingUser === seller.id}
                               className="text-red-600 hover:text-red-900 disabled:opacity-50"
                             >
                               {demotingUser === seller.id ? 'Deactivating...' : 'Deactivate'}
                             </button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
                </div>

                                 {paginatedSellers.length === 0 && filteredSellers.length === 0 && (
                   <div className="text-center py-12">
                     <UserPlus className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                           <h3 className="text-lg font-medium text-slate-900 mb-2">No sellers found</h3>
                      <p className="text-slate-500">You don't have any sellers registered yet. Use the "Generate Registration Links" tab to create registration codes.</p>
                   </div>
                 )}

                                 {/* Pagination */}
                 {totalPages > 1 && (
                   <div className="px-6 py-4 border-t border-slate-200">
                     {/* Page information centered */}
                     <div className="flex items-center justify-center mb-4">
                       <div className="text-sm text-slate-500">
                         Page {currentPage} of {totalPages}
                       </div>
                     </div>
                     
                     {/* Navigation controls centered */}
                     <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </button>
                      
                                             {/* Page numbers */}
                       <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNumber;
                          if (totalPages <= 5) {
                            pageNumber = i + 1;
                          } else if (currentPage <= 3) {
                            pageNumber = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + i;
                          } else {
                            pageNumber = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => goToPage(pageNumber)}
                              className={`inline-flex items-center px-3 py-1 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                currentPage === pageNumber
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}
                        
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="px-2 text-slate-500">...</span>
                            <button
                              onClick={() => goToPage(totalPages)}
                              className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>
                      
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
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
            <SellerRegistrationsManager />
          )}
        </div>
      </div>

             {/* Confirmation Modal */}
       {showConfirmModal && sellerToDeactivate && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
             <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
             <h3 className="text-lg font-medium text-slate-900 mb-2">Confirm Deactivation</h3>
             <p className="text-slate-600 mb-4">
               Are you sure you want to deactivate the seller "{sellerToDeactivate.name}"?
               This action cannot be undone.
             </p>
             <div className="flex justify-end space-x-2">
               <button
                 onClick={() => setShowConfirmModal(false)}
                 className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
               >
                 Cancel
               </button>
               <button
                 onClick={confirmDeactivation}
                 className="px-4 py-2 border border-red-600 rounded-md text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
               >
                 Deactivate
               </button>
             </div>
           </div>
         </div>
       )}

             {/* Success/Error Messages */}
      {successMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default SellerManagement;
