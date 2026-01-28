import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAffiliateAdminId } from '../../hooks/useAffiliateAdminId';

interface UtmAttribution {
  id: string;
  user_id: string | null;
  email: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_page: string | null;
  last_touch_page: string | null;
  referrer: string | null;
  client_name: string | null;
  client_email: string | null;
  captured_at: string;
  created_at: string;
  user_profile?: {
    full_name: string;
    email: string;
  };
}

const UtmTracking: React.FC = () => {
  const { affiliateAdminId, loading: adminLoading } = useAffiliateAdminId();
  const [attributions, setAttributions] = useState<UtmAttribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    client_name: '',
    client_email: ''
  });

  const [stats, setStats] = useState({
    total: 0,
    bySource: {} as Record<string, number>,
    byMedium: {} as Record<string, number>,
    organic: 0,
    paid: 0
  });

  useEffect(() => {
    if (affiliateAdminId) {
      loadUtmAttributions();
    }
  }, [filters, affiliateAdminId]);

  const loadUtmAttributions = async () => {
    if (!affiliateAdminId) {
      setError('Affiliate admin not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch sellers for this affiliate admin
      const { data: sellers, error: sellersError } = await supabase
        .from('sellers')
        .select('referral_code')
        .eq('affiliate_admin_id', affiliateAdminId)
        .eq('is_active', true);

      if (sellersError) {
        throw new Error(`Error fetching sellers: ${sellersError.message}`);
      }

      if (!sellers || sellers.length === 0) {
        setAttributions([]);
        setStats({
          total: 0,
          bySource: {},
          byMedium: {},
          organic: 0,
          paid: 0
        });
        setLoading(false);
        return;
      }

      // 2. Get referral codes from sellers
      const referralCodes = sellers.map(s => s.referral_code.toUpperCase());

      // 3. Fetch user_ids from profiles that used these referral codes
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, seller_referral_code')
        .in('seller_referral_code', referralCodes);

      if (profilesError) {
        throw new Error(`Error fetching profiles: ${profilesError.message}`);
      }

      const userIds = userProfiles?.map(p => p.user_id).filter(Boolean) || [];

      // 4. If no users, no UTM data
      if (userIds.length === 0) {
        setAttributions([]);
        setStats({
          total: 0,
          bySource: {},
          byMedium: {},
          organic: 0,
          paid: 0
        });
        setLoading(false);
        return;
      }

      // 5. Fetch UTM data only from users related to this admin's sellers
      let query = supabase
        .from('utm_attributions')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(1000);

      // Apply additional filters
      if (filters.utm_source) {
        query = query.eq('utm_source', filters.utm_source);
      }
      if (filters.utm_medium) {
        query = query.eq('utm_medium', filters.utm_medium);
      }
      if (filters.utm_campaign) {
        query = query.ilike('utm_campaign', `%${filters.utm_campaign}%`);
      }
      if (filters.client_name) {
        query = query.ilike('client_name', `%${filters.client_name}%`);
      }
      if (filters.client_email) {
        query = query.ilike('client_email', `%${filters.client_email}%`);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      // Fetch user profile information when user_id is available
      const attributionsWithProfiles = await Promise.all(
        (data || []).map(async (attribution) => {
          if (attribution.user_id) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('full_name, email')
              .eq('user_id', attribution.user_id)
              .single();

            return {
              ...attribution,
              user_profile: profile || undefined
            };
          }
          return attribution;
        })
      );

      setAttributions(attributionsWithProfiles);

      // Calculate statistics
      const total = attributionsWithProfiles.length;
      const bySource: Record<string, number> = {};
      const byMedium: Record<string, number> = {};
      let organic = 0;
      let paid = 0;

      attributionsWithProfiles.forEach((attr) => {
        // By source
        if (attr.utm_source) {
          bySource[attr.utm_source] = (bySource[attr.utm_source] || 0) + 1;
        }

        // By medium
        if (attr.utm_medium) {
          byMedium[attr.utm_medium] = (byMedium[attr.utm_medium] || 0) + 1;
        }

        // Organic vs Paid
        if (attr.utm_medium === 'organic') {
          organic++;
        } else if (attr.utm_medium && attr.utm_medium !== 'organic') {
          paid++;
        }
      });

      setStats({
        total,
        bySource,
        byMedium,
        organic,
        paid
      });

    } catch (err: any) {
      console.error('Error loading UTM attributions:', err);
      setError(err.message || 'Error loading tracking data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US');
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      client_name: '',
      client_email: ''
    });
  };

  if (adminLoading || (loading && attributions.length === 0)) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!affiliateAdminId) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Error: Affiliate admin not found. Please contact support.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">UTM Tracking</h1>
        <p className="text-slate-600">View and analyze marketing link tracking data</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-slate-600 mb-1">Total Records</div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-slate-600 mb-1">Organic Traffic</div>
          <div className="text-2xl font-bold text-green-600">{stats.organic}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-slate-600 mb-1">Paid Traffic</div>
          <div className="text-2xl font-bold text-blue-600">{stats.paid}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-slate-600 mb-1">With Client</div>
          <div className="text-2xl font-bold text-purple-600">
            {attributions.filter(a => a.client_name || a.client_email).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear Filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Source
            </label>
            <input
              type="text"
              value={filters.utm_source}
              onChange={(e) => handleFilterChange('utm_source', e.target.value)}
              placeholder="Ex: brant"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Medium
            </label>
            <input
              type="text"
              value={filters.utm_medium}
              onChange={(e) => handleFilterChange('utm_medium', e.target.value)}
              placeholder="Ex: cpc, organic"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Campaign
            </label>
            <input
              type="text"
              value={filters.utm_campaign}
              onChange={(e) => handleFilterChange('utm_campaign', e.target.value)}
              placeholder="Campaign name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Client Name
            </label>
            <input
              type="text"
              value={filters.client_name}
              onChange={(e) => handleFilterChange('client_name', e.target.value)}
              placeholder="Client name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Client Email
            </label>
            <input
              type="text"
              value={filters.client_email}
              onChange={(e) => handleFilterChange('client_email', e.target.value)}
              placeholder="Client email"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Medium
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Client Who Shared
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Landing Page
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {attributions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-slate-500">
                    No records found
                  </td>
                </tr>
              ) : (
                attributions.map((attr) => (
                  <tr key={attr.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatDate(attr.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {attr.user_profile ? (
                        <div>
                          <div className="font-medium">{attr.user_profile.full_name}</div>
                          <div className="text-slate-500 text-xs">{attr.user_profile.email}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-slate-400">Not registered</div>
                          {attr.email && (
                            <div className="text-slate-500 text-xs">{attr.email}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {attr.utm_source || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {attr.utm_medium ? (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          attr.utm_medium === 'organic' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {attr.utm_medium}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {attr.utm_campaign || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {attr.client_name || attr.client_email ? (
                        <div>
                          {attr.client_name && (
                            <div className="font-medium">{attr.client_name}</div>
                          )}
                          {attr.client_email && (
                            <div className="text-slate-500 text-xs">{attr.client_email}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {attr.landing_page ? (
                        <div className="max-w-xs truncate" title={attr.landing_page}>
                          {attr.landing_page}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {attributions.length > 0 && (
        <div className="mt-4 text-sm text-slate-600">
          Showing {attributions.length} record(s)
        </div>
      )}
    </div>
  );
};

export default UtmTracking;

