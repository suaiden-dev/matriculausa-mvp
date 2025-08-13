import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Building, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface University {
  id: string;
  name: string;
  location: string;
  logo_url: string;
  is_approved: boolean;
  is_featured: boolean;
  featured_order: number | null;
}

const FeaturedUniversitiesManagement: React.FC = () => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load universities
  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('universities')
        .select('id, name, location, logo_url, is_approved, is_featured, featured_order')
        .eq('is_approved', true)
        .order('name');

      if (error) throw error;
      setUniversities(data || []);
    } catch (error) {
      console.error('Error loading universities:', error);
      setMessage({ type: 'error', text: 'Error loading universities' });
    } finally {
      setLoading(false);
    }
  };

  // Filter universities
  const filteredUniversities = universities.filter(university => {
    const matchesSearch = university.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         university.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'featured' && university.is_featured) ||
      (statusFilter === 'not-featured' && !university.is_featured);
    
    return matchesSearch && matchesStatus;
  });

  // Mark/unmark as featured
  const toggleFeatured = async (universityId: string, currentFeatured: boolean) => {
    try {
      if (currentFeatured) {
        // Unmark as featured
        const { error } = await supabase
          .from('universities')
          .update({ 
            is_featured: false, 
            featured_order: null 
          })
          .eq('id', universityId);

        if (error) throw error;
      } else {
        // Check if we already have 6 featured universities
        const featuredCount = universities.filter(u => u.is_featured).length;
        if (featuredCount >= 6) {
          setMessage({ 
            type: 'error', 
            text: 'Maximum of 6 featured universities reached. Unmark one before adding another.' 
          });
          return;
        }

        // Mark as featured and set order
        const nextOrder = featuredCount + 1;
        const { error } = await supabase
          .from('universities')
          .update({ 
            is_featured: true, 
            featured_order: nextOrder 
          })
          .eq('id', universityId);

        if (error) throw error;
      }

      // Reload data
      await fetchUniversities();
      setMessage({ 
        type: 'success', 
        text: currentFeatured ? 'University removed from featured' : 'University added to featured' 
      });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating featured status:', error);
      setMessage({ type: 'error', text: 'Error updating university featured status' });
    }
  };

  // Reorder featured universities
  const reorderFeatured = async (universityId: string, direction: 'up' | 'down') => {
    try {
      setSaving(true);
      const featuredUniversities = universities.filter(u => u.is_featured).sort((a, b) => 
        (a.featured_order || 0) - (b.featured_order || 0)
      );
      
      const currentIndex = featuredUniversities.findIndex(u => u.id === universityId);
      if (currentIndex === -1) return;

      const newOrder = [...featuredUniversities];
      if (direction === 'up' && currentIndex > 0) {
        // Move up
        [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
      } else if (direction === 'down' && currentIndex < newOrder.length - 1) {
        // Move down
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
      } else {
        return; // Cannot move
      }

      // Update order in database
      for (let i = 0; i < newOrder.length; i++) {
        const { error } = await supabase
          .from('universities')
          .update({ featured_order: i + 1 })
          .eq('id', newOrder[i].id);

        if (error) throw error;
      }

      // Reload data
      await fetchUniversities();
      setMessage({ type: 'success', text: 'Featured order updated' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error reordering:', error);
      setMessage({ type: 'error', text: 'Error reordering featured items' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Manage Featured Universities
        </h1>
        <p className="text-gray-600">
          Configure which universities appear in the "Featured Universities" section of the main page
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Featured</p>
              <p className="text-2xl font-bold text-gray-900">
                {universities.filter(u => u.is_featured).length}/6
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Universities</p>
              <p className="text-2xl font-bold text-gray-900">{universities.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {universities.filter(u => u.is_approved).length}
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
                placeholder="Search by university name or location..."
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
              aria-label="Filter universities by status"
            >
              <option value="all">All Universities</option>
              <option value="featured">Featured</option>
              <option value="not-featured">Not Featured</option>
            </select>
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

      {/* Featured Universities */}
      {universities.filter(u => u.is_featured).length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Featured Universities ({universities.filter(u => u.is_featured).length}/6)
          </h2>
          <div className="space-y-4">
            {universities
              .filter(u => u.is_featured)
              .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0))
              .map((university, index) => (
              <div key={university.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-600 font-semibold">#{index + 1}</span>
                    <Star className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{university.name}</h3>
                    <p className="text-sm text-gray-600">{university.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => reorderFeatured(university.id, 'up')}
                    disabled={index === 0 || saving}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                    title="Move up"
                    aria-label="Move university up in featured order"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => reorderFeatured(university.id, 'down')}
                    disabled={index === universities.filter(u => u.is_featured).length - 1 || saving}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                    title="Move down"
                    aria-label="Move university down in featured order"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleFeatured(university.id, true)}
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

      {/* All Universities List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {statusFilter === 'featured' ? 'Featured Universities' : 
             statusFilter === 'not-featured' ? 'Non-Featured Universities' : 
             'All Universities'}
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredUniversities.length} university(ies) found
          </p>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading universities...</p>
          </div>
        ) : filteredUniversities.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No universities found with current filters.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredUniversities.map((university) => (
              <div key={university.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {university.logo_url && (
                        <img
                          src={university.logo_url}
                          alt={`${university.name} logo`}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {university.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {university.location}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            university.is_approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {university.is_approved ? 'Approved' : 'Pending'}
                          </span>
                          {university.is_featured && (
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
                      onClick={() => toggleFeatured(university.id, !!university.is_featured)}
                      disabled={!university.is_featured && universities.filter(u => u.is_featured).length >= 6}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        university.is_featured
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400'
                      }`}
                    >
                      {university.is_featured ? '★ Featured' : '☆ Mark'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedUniversitiesManagement;
