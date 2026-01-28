import React, { useState, useEffect } from 'react';
import { 
  Star, 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Save,
  Building,
  DollarSign,
  Globe,
  BookOpen
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Scholarship } from '../../types';

interface FeaturedScholarship extends Scholarship {
  featured_order: number | null;
  university_name?: string;
  university_location?: string;
  university_logo_url?: string;
}

const FeaturedScholarshipsManagement: React.FC = () => {
  const [scholarships, setScholarships] = useState<FeaturedScholarship[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const scholarshipsPerPage = 10;
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableScholarships, setAvailableScholarships] = useState<FeaturedScholarship[]>([]);
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string>('');

  // Load scholarships
  useEffect(() => {
    fetchScholarships();
  }, []);

  const fetchScholarships = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scholarships')
        .select(`
          *,
          universities (id, name, location, logo_url, university_fees_page_url)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process data to include university information
      const processedData = (data || []).map(scholarship => ({
        ...scholarship,
        university_name: scholarship.universities?.name,
        university_location: scholarship.universities?.location,
        university_logo_url: scholarship.universities?.logo_url,
        featured_order: scholarship.featured_order // Use the actual value from database
      }));

      setScholarships(processedData);
    } catch (error) {
      console.error('Error loading scholarships:', error);
      setMessage({ type: 'error', text: 'Error loading scholarships' });
    } finally {
      setLoading(false);
    }
  };

  // Filter scholarships
  const filteredScholarships = scholarships.filter(scholarship => {
    const matchesSearch = 
      scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scholarship.university_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scholarship.field_of_study?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'featured' && scholarship.is_highlighted) ||
      (statusFilter === 'not-featured' && !scholarship.is_highlighted);
    
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredScholarships.length / scholarshipsPerPage);
  const paginatedScholarships = filteredScholarships.slice(
    (currentPage - 1) * scholarshipsPerPage,
    currentPage * scholarshipsPerPage
  );

  // Featured scholarships
  const featuredScholarships = scholarships.filter(s => s.is_highlighted).sort((a, b) => 
    (a.featured_order || 0) - (b.featured_order || 0)
  );

  // Scholarships available to add to featured
  const availableForHighlight = scholarships.filter(s => !s.is_highlighted);

  // Mark/unmark as featured
  const toggleFeatured = async (scholarshipId: string, currentFeatured: boolean) => {
    try {
      if (currentFeatured) {
        // Unmark as featured
        const { error } = await supabase
          .from('scholarships')
          .update({ 
            is_highlighted: false, 
            featured_order: null 
          })
          .eq('id', scholarshipId);

        if (error) throw error;
      } else {
        // Check if we already have 6 featured scholarships
        const featuredCount = featuredScholarships.length;
        if (featuredCount >= 6) {
          setMessage({ 
            type: 'error', 
            text: 'Maximum of 6 featured scholarships reached. Unmark one before adding another.' 
          });
          return;
        }

        // Mark as featured and set order
        const nextOrder = featuredCount + 1;
        const { error } = await supabase
          .from('scholarships')
          .update({ 
            is_highlighted: true, 
            featured_order: nextOrder 
          })
          .eq('id', scholarshipId);

        if (error) throw error;
      }

      // Reload data
      await fetchScholarships();
      setMessage({ 
        type: 'success', 
        text: currentFeatured ? 'Scholarship removed from featured' : 'Scholarship added to featured' 
      });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating featured status:', error);
      setMessage({ type: 'error', text: 'Error updating scholarship featured status' });
    }
  };

  // Reorder featured scholarships
  const reorderFeatured = async (scholarshipId: string, direction: 'up' | 'down') => {
    try {
      setSaving(true);
      
      // Get fresh featured scholarships list (like universities does)
      const currentFeaturedScholarships = scholarships.filter(s => s.is_highlighted).sort((a, b) => 
        (a.featured_order || 0) - (b.featured_order || 0)
      );
      
      const currentIndex = currentFeaturedScholarships.findIndex(s => s.id === scholarshipId);
      
      if (currentIndex === -1) {
        return;
      }

      const newOrder = [...currentFeaturedScholarships];
      if (direction === 'up' && currentIndex > 0) {
        // Move up
        [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
      } else if (direction === 'down' && currentIndex < newOrder.length - 1) {
        // Move down
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
      } else {
        return; // Cannot move
      }

      // Two-step strategy to avoid constraint conflicts (like universities)
      // Step 1: Temporarily un-feature all scholarships (one by one like universities)
      for (const scholarship of currentFeaturedScholarships) {
        const { error } = await supabase
          .from('scholarships')
          .update({ 
            is_highlighted: false, 
            featured_order: null 
          })
          .eq('id', scholarship.id);
        
        if (error) {
          throw error;
        }
      }

      // Step 2: Re-add them with new order
      for (let i = 0; i < newOrder.length; i++) {
        const { error } = await supabase
          .from('scholarships')
          .update({ 
            is_highlighted: true, 
            featured_order: i + 1 
          })
          .eq('id', newOrder[i].id);

        if (error) {
          throw error;
        }
      }
      
      // Reload data
      await fetchScholarships();
      setMessage({ type: 'success', text: 'Featured order updated' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error reordering:', error);
      setMessage({ type: 'error', text: 'Error reordering featured items' });
    } finally {
      setSaving(false);
    }
  };

  // Add scholarship to featured via modal
  const addToFeatured = async () => {
    if (!selectedScholarshipId) return;

    try {
      setSaving(true);
      const featuredCount = featuredScholarships.length;
      if (featuredCount >= 6) {
        setMessage({ 
          type: 'error', 
          text: 'Maximum of 6 featured scholarships reached' 
        });
        return;
      }

      const nextOrder = featuredCount + 1;
      const { error } = await supabase
        .from('scholarships')
        .update({ 
          is_highlighted: true, 
          featured_order: nextOrder 
        })
        .eq('id', selectedScholarshipId);

      if (error) throw error;

      await fetchScholarships();
      setShowAddModal(false);
      setSelectedScholarshipId('');
      setMessage({ type: 'success', text: 'Scholarship added to featured' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error adding to featured:', error);
      setMessage({ type: 'error', text: 'Error adding to featured' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getLevelColor = (level: string) => {
    const colors: { [key: string]: string } = {
      'Undergraduate': 'bg-blue-100 text-blue-800',
      'Graduate': 'bg-purple-100 text-purple-800',
      'Master': 'bg-green-100 text-green-800',
      'PhD': 'bg-red-100 text-red-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Manage Featured Scholarships
        </h1>
        <p className="text-gray-600">
          Configure which scholarships appear in the "Weekly Highlights" section of the main page
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Featured</p>
              <p className="text-2xl font-bold text-gray-900">{featuredScholarships.length}/6</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <GraduationCap className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Scholarships</p>
              <p className="text-2xl font-bold text-gray-900">{scholarships.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Universities</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(scholarships.map(s => s.university_id)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-emerald-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Average Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {scholarships.length > 0 
                  ? formatCurrency(scholarships.reduce((acc, s) => acc + (s.amount || 0), 0) / scholarships.length)
                  : '$0'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, university or field of study..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Filter scholarships by status"
            >
              <option value="all">All Scholarships</option>
              <option value="featured">Featured</option>
              <option value="not-featured">Not Featured</option>
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={featuredScholarships.length >= 6}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Featured
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Featured Scholarships */}
      {featuredScholarships.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Featured Scholarships ({featuredScholarships.length}/6)
          </h2>
          <div className="space-y-4">
            {featuredScholarships.map((scholarship, index) => (
              <div key={scholarship.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-600 font-semibold">#{index + 1}</span>
                    <Star className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{scholarship.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {scholarship.university_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {scholarship.field_of_study}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(scholarship.amount || 0)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => reorderFeatured(scholarship.id, 'up')}
                    disabled={index === 0 || saving}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                    title="Move up"
                    aria-label="Move scholarship up in featured order"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => reorderFeatured(scholarship.id, 'down')}
                    disabled={index === featuredScholarships.length - 1 || saving}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                    title="Move down"
                    aria-label="Move scholarship down in featured order"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleFeatured(scholarship.id, true)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Scholarships List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {statusFilter === 'featured' ? 'Featured Scholarships' : 
             statusFilter === 'not-featured' ? 'Non-Featured Scholarships' : 
             'All Scholarships'}
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredScholarships.length} scholarship(s) found
          </p>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading scholarships...</p>
          </div>
        ) : filteredScholarships.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No scholarships found with current filters.
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {paginatedScholarships.map((scholarship) => (
                <div key={scholarship.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {scholarship.university_logo_url && (
                          <img
                            src={scholarship.university_logo_url}
                            alt={`${scholarship.university_name} logo`}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {scholarship.title}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              <span>{scholarship.university_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              <span>{scholarship.field_of_study}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              <span>{formatCurrency(scholarship.annual_value_with_scholarship || 0)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              <span>{scholarship.level}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(scholarship.level)}`}>
                              {scholarship.level}
                            </span>
                            {scholarship.is_exclusive && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Exclusive
                              </span>
                            )}
                            {scholarship.is_highlighted && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                ★ Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => toggleFeatured(scholarship.id, !!scholarship.is_highlighted)}
                        disabled={!scholarship.is_highlighted && featuredScholarships.length >= 6}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          scholarship.is_highlighted
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400'
                        }`}
                      >
                        {scholarship.is_highlighted ? '★ Featured' : '☆ Mark'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 py-6">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 disabled:bg-gray-200 disabled:text-gray-400"
                >
                  Previous
                </button>
                <span className="px-2 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 disabled:bg-gray-200 disabled:text-gray-400"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add to Featured Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Scholarship to Featured
              </h3>
              <p className="text-gray-600 mt-1">
                Select a scholarship to add to featured ({featuredScholarships.length}/6)
              </p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Scholarship
                </label>
                <select
                  value={selectedScholarshipId}
                  onChange={(e) => setSelectedScholarshipId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Select scholarship to add to featured"
                >
                  <option value="">Select a scholarship...</option>
                  {availableForHighlight.map((scholarship) => (
                    <option key={scholarship.id} value={scholarship.id}>
                      {scholarship.title} - {scholarship.university_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedScholarshipId('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={addToFeatured}
                  disabled={!selectedScholarshipId || saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {saving ? 'Adding...' : 'Add to Featured'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeaturedScholarshipsManagement;
