import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, 
  Building, 
  MapPin, 
  Globe, 
  Mail, 
  Phone, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Edit,
  Save,
  X,
  Plus,
  FileText,
  Users,
  BookOpen,
  Shield,
  Settings,
  Star,
  Info,
  ExternalLink
} from 'lucide-react';

interface DocumentRequest {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  attachment_url?: string;
  status: string;
  created_at: string;
  created_by?: string;
  applicable_student_types?: string[];
}

interface University {
  id: string;
  user_id: string;
  name: string;
  location?: string;
  website?: string;
  description?: string;
  is_approved: boolean;
  created_at: string;
  contact?: {
    email?: string;
    phone?: string;
    admissionsEmail?: string;
    fax?: string;
  };
  user_email?: string;
  responsible_name?: string;
  user_profile?: {
    full_name?: string;
    phone?: string;
    status?: string;
  };
  programs?: string[];
}

const UniversityDetails: React.FC = () => {
  const { universityId } = useParams<{ universityId: string }>();
  const navigate = useNavigate();
  const [university, setUniversity] = useState<University | null>(null);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<DocumentRequest | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<DocumentRequest | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Estado para edição da universidade
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    website: '',
    description: '',
    is_approved: false
  });

  // Estado para novo document request
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    attachment: null as File | null,
    applicable_student_types: ['all']
  });

  // Estado para edição de document request
  const [editRequest, setEditRequest] = useState({
    title: '',
    description: '',
    attachment: null as File | null,
    applicable_student_types: ['all']
  });

  const STUDENT_TYPE_OPTIONS = [
    { value: 'initial', label: 'Initial (F-1 Visa Required)' },
    { value: 'change_of_status', label: 'Change of Status (From Other Visa)' },
    { value: 'transfer', label: 'Transfer (Current F-1 Student)' },
    { value: 'all', label: 'All Student Types' },
  ];

  useEffect(() => {
    if (universityId) {
      fetchUniversityDetails();
      fetchDocumentRequests();
    }
  }, [universityId]);

  const fetchUniversityDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching university with ID:', universityId);
      
      // Buscar dados da universidade
      const { data: universityData, error: universityError } = await supabase
        .from('universities')
        .select('*')
        .eq('id', universityId)
        .single();

      if (universityError) {
        console.error('University query error:', universityError);
        setError('Failed to fetch university details');
        return;
      }

      console.log('University data:', universityData);

      // Buscar dados do perfil do usuário se existe user_id
      let userProfileData = null;
      if (universityData?.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', universityData.user_id)
          .single();

        if (!profileError && profileData) {
          userProfileData = profileData;
        }
      }

      // Combinar os dados
      const combinedData = {
        ...universityData,
        user_profile: userProfileData
      };

      setUniversity(combinedData);
      setEditForm({
        name: combinedData.name || '',
        location: combinedData.location || '',
        website: combinedData.website || '',
        description: combinedData.description || '',
        is_approved: combinedData.is_approved || false
      });
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError('Unexpected error: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('document_requests')
        .select('*')
        .eq('is_global', true)
        .eq('university_id', universityId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching document requests:', error);
        return;
      }

      setDocumentRequests(data || []);
    } catch (err) {
      console.error('Unexpected error fetching document requests:', err);
    }
  };

  const handleSaveUniversity = async () => {
    if (!university) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('universities')
        .update({
          name: editForm.name,
          location: editForm.location,
          website: editForm.website,
          description: editForm.description,
          is_approved: editForm.is_approved
        })
        .eq('id', university.id);

      if (error) {
        setError('Failed to update university');
        return;
      }

      setUniversity({ ...university, ...editForm });
      setIsEditing(false);
    } catch (err: any) {
      setError('Unexpected error: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleNewRequest = async () => {
    if (!university?.id || !newRequest.title) {
      setError('Title is required');
      return;
    }
    
    setCreating(true);
    setError(null);
    
    try {
      let attachment_url: string | undefined = undefined;
      
      if (newRequest.attachment) {
        const { data, error } = await supabase.storage
          .from('document-attachments')
          .upload(`global/${Date.now()}_${newRequest.attachment.name}`, newRequest.attachment);
        
        if (error) {
          setError('Failed to upload attachment: ' + error.message);
          setCreating(false);
          return;
        }
        attachment_url = data?.path;
      }

      const payload = {
        title: newRequest.title,
        description: newRequest.description,
        university_id: university.id,
        is_global: true,
        created_by: university.user_id, // Admin criando em nome da universidade
        scholarship_application_id: null,
        applicable_student_types: newRequest.applicable_student_types,
        attachment_url
      };

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        setError('Authentication required. Please log in again.');
        setCreating(false);
        return;
      }

      const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/create-document-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        setError('Failed to create request: ' + (result.error || 'Unknown error'));
        setCreating(false);
        return;
      }

      setShowNewRequestModal(false);
      setNewRequest({ title: '', description: '', attachment: null, applicable_student_types: ['all'] });
      fetchDocumentRequests(); // Recarregar lista

    } catch (e: any) {
      setError('Unexpected error: ' + (e.message || e));
    } finally {
      setCreating(false);
    }
  };

  const handleEditRequest = async () => {
    if (!editingRequest?.id || !editRequest.title) {
      setError('Title is required');
      return;
    }
    
    setEditing(true);
    setError(null);
    
    try {
      let attachment_url: string | undefined = editingRequest.attachment_url;
      
      if (editRequest.attachment) {
        const { data, error } = await supabase.storage
          .from('document-attachments')
          .upload(`global/${Date.now()}_${editRequest.attachment.name}`, editRequest.attachment);
        
        if (error) {
          setError('Failed to upload attachment: ' + error.message);
          setEditing(false);
          return;
        }
        attachment_url = data?.path;
      }

      // Atualizar diretamente via Supabase client
      const { error: updateError } = await supabase
        .from('document_requests')
        .update({
          title: editRequest.title,
          description: editRequest.description,
          attachment_url,
          applicable_student_types: editRequest.applicable_student_types
        })
        .eq('id', editingRequest.id);

      if (updateError) {
        setError('Failed to update request: ' + updateError.message);
        setEditing(false);
        return;
      }

      setShowEditRequestModal(false);
      setEditingRequest(null);
      setEditRequest({ title: '', description: '', attachment: null, applicable_student_types: ['all'] });
      fetchDocumentRequests(); // Recarregar lista

    } catch (e: any) {
      setError('Unexpected error: ' + (e.message || e));
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!deletingRequest?.id) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      // Primeiro, deletar todos os uploads relacionados ao request
      const { error: deleteUploadsError } = await supabase
        .from('document_request_uploads')
        .delete()
        .eq('document_request_id', deletingRequest.id);

      if (deleteUploadsError) {
        console.error('Error deleting uploads:', deleteUploadsError);
        // Continuar mesmo se houver erro nos uploads
      }

      // Depois, deletar o document request
      const { error: deleteRequestError } = await supabase
        .from('document_requests')
        .delete()
        .eq('id', deletingRequest.id);

      if (deleteRequestError) {
        setError('Failed to delete request: ' + deleteRequestError.message);
        setDeleting(false);
        return;
      }

      setShowDeleteConfirmModal(false);
      setDeletingRequest(null);
      fetchDocumentRequests(); // Recarregar lista

    } catch (e: any) {
      setError('Unexpected error: ' + (e.message || e));
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (request: DocumentRequest) => {
    setEditingRequest(request);
    setEditRequest({
      title: request.title || '',
      description: request.description || '',
      attachment: null,
      applicable_student_types: request.applicable_student_types || ['all']
    });
    setShowEditRequestModal(true);
  };

  const openDeleteModal = (request: DocumentRequest) => {
    setDeletingRequest(request);
    setShowDeleteConfirmModal(true);
  };

  if (loading && !university) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <svg className="animate-spin h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Loading university details...</span>
        </div>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">University not found</h3>
          <p className="text-slate-500 mb-6">The university you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/admin/dashboard/universities')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Universities
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header + Filters Section */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + note + counter */}
            <div className="py-6 px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => navigate('/admin/dashboard/universities')}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">Back to Universities</span>
                  </button>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-2">
                      {university.name}
                    </h1>
                    <p className="mt-2 text-sm sm:text-base text-slate-600">
                      Manage university information and global document requests
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        university.is_approved 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {university.is_approved ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approved
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 mr-2" />
                            Pending
                          </>
                        )}
                      </span>
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Created {new Date(university.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Edit className="h-4 w-4" />
                    Edit University
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveUniversity}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
                    >
                      <Save className="h-4 w-4" />
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({
                          name: university.name || '',
                          location: university.location || '',
                          website: university.website || '',
                          description: university.description || '',
                          is_approved: university.is_approved || false
                        });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-sm"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Sidebar - University Info */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Basic Information Card */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  University Details
                </h2>
              </div>
              <div className="p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">University Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Enter university name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="City, State, Country"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                      <input
                        type="url"
                        value={editForm.website}
                        onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="https://example.edu"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Brief description of the university"
                      />
                    </div>
                    <div className="pt-3 border-t">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={editForm.is_approved}
                          onChange={(e) => setEditForm(prev => ({ ...prev, is_approved: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Mark as Approved University</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Location</p>
                        <p className="text-sm text-gray-600">{university.location || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    {university.website && (
                      <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Website</p>
                          <a 
                            href={university.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                          >
                            {university.website.replace(/^https?:\/\//, '')}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {university.contact?.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Contact Email</p>
                          <p className="text-sm text-gray-600">{university.contact.email}</p>
                        </div>
                      </div>
                    )}
                    
                    {university.contact?.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Phone</p>
                          <p className="text-sm text-gray-600">{university.contact.phone}</p>
                        </div>
                      </div>
                    )}
                    
                    {university.description && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium text-gray-900 mb-2">About</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{university.description}</p>
                      </div>
                    )}

                    {university.programs && university.programs.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-gray-400" />
                          Programs Offered
                        </p>
                        <div className="space-y-2">
                          {university.programs.map((program, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg px-3 py-2">
                              <p className="text-sm text-gray-700">{program}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Account Information Card */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  Account Details
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Responsible Person</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {university.responsible_name || university.user_profile?.full_name || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Account Email</p>
                  <p className="text-sm text-gray-600 mt-1">{university.user_email || 'Not available'}</p>
                </div>
                {university.user_profile?.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-900">Account Phone</p>
                    <p className="text-sm text-gray-600 mt-1">{university.user_profile.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium mt-1 ${
                    university.user_profile?.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {university.user_profile?.status || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Document Requests */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Global Document Requests
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Create and manage document requests that apply to all students from this university
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNewRequestModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    New Request
                  </button>
                </div>
              </div>

              <div className="p-6">
                {documentRequests.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Document Requests</h3>
                    <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                      Get started by creating your first global document request for this university.
                    </p>
                    <button
                      onClick={() => setShowNewRequestModal(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Create First Request
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documentRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-shadow relative">
                        {/* Admin Action Buttons - Top Right Corner */}
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(request)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Request"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(request)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Request"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-start justify-between mb-3 pr-20">
                          <h4 className="text-lg font-medium text-gray-900">{request.title}</h4>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            request.status === 'open' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {request.status === 'open' ? 'Active' : 'Closed'}
                          </span>
                        </div>
                        
                        {request.description && (
                          <p className="text-gray-600 mb-4 leading-relaxed">{request.description}</p>
                        )}

                        {/* Template Section */}
                        {request.attachment_url ? (
                          <div className="mb-4">
                            <button
                              onClick={() => {
                                const url = request.attachment_url?.startsWith('http') 
                                  ? request.attachment_url 
                                  : `https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/${request.attachment_url}`;
                                window.open(url, '_blank');
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center space-x-2"
                            >
                              <FileText className="h-4 w-4" />
                              <span>View Template</span>
                            </button>
                          </div>
                        ) : (
                          <div className="mb-4">
                            <button
                              onClick={() => openEditModal(request)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center space-x-2"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Add Template</span>
                            </button>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Created {new Date(request.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            {request.applicable_student_types && request.applicable_student_types.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                Applies to: {
                                  request.applicable_student_types.includes('all') || request.applicable_student_types.length === 3 
                                    ? 'All students' 
                                    : request.applicable_student_types.map(type => {
                                        switch(type) {
                                          case 'initial': return 'Initial';
                                          case 'transfer': return 'Transfer';
                                          case 'change_of_status': return 'Change of Status';
                                          default: return type;
                                        }
                                      }).join(', ')
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Request Modal */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-slate-200 max-h-[90vh] overflow-auto">
            <h3 className="font-bold text-lg mb-6 text-slate-900">New Global Document Request</h3>
            
            {error && (
              <div className="text-red-500 mb-4 text-center font-semibold">{error}</div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  placeholder="Enter document title"
                  value={newRequest.title}
                  onChange={e => setNewRequest(r => ({ ...r, title: e.target.value }))}
                  disabled={creating}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base min-h-[60px] resize-vertical"
                  placeholder="Describe the document or instructions (optional)"
                  value={newRequest.description}
                  onChange={e => setNewRequest(r => ({ ...r, description: e.target.value }))}
                  disabled={creating}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Attachment</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition font-medium text-blue-700">
                    <FileText className="h-5 w-5" />
                    <span>{newRequest.attachment ? 'Change file' : 'Select file'}</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={e => setNewRequest(r => ({ ...r, attachment: e.target.files ? e.target.files[0] : null }))}
                      disabled={creating}
                    />
                  </label>
                  {newRequest.attachment && (
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">
                      {newRequest.attachment?.name}
                    </span>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Applicable Student Types <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  {STUDENT_TYPE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          opt.value === 'all'
                            ? newRequest.applicable_student_types.length === STUDENT_TYPE_OPTIONS.length - 1
                            : newRequest.applicable_student_types.includes(opt.value)
                        }
                        onChange={e => {
                          if (opt.value === 'all') {
                            if (e.target.checked) {
                              setNewRequest(r => ({ 
                                ...r, 
                                applicable_student_types: STUDENT_TYPE_OPTIONS.filter(o => o.value !== 'all').map(o => o.value) 
                              }));
                            } else {
                              setNewRequest(r => ({ ...r, applicable_student_types: [] }));
                            }
                          } else {
                            setNewRequest(r => {
                              let updated = r.applicable_student_types.includes(opt.value)
                                ? r.applicable_student_types.filter(v => v !== opt.value)
                                : [...r.applicable_student_types, opt.value];
                              return { ...r, applicable_student_types: updated };
                            });
                          }
                        }}
                        disabled={creating}
                        className="accent-blue-600"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6 justify-center">
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2" 
                onClick={handleNewRequest} 
                disabled={creating || !newRequest.title}
              >
                {creating ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                <span>{creating ? 'Creating...' : 'Create'}</span>
              </button>
              <button 
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold transition" 
                onClick={() => setShowNewRequestModal(false)} 
                disabled={creating}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {showEditRequestModal && editingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-slate-200 max-h-[90vh] overflow-auto">
            <h3 className="font-bold text-lg mb-6 text-slate-900">Edit Global Document Request</h3>
            
            {error && (
              <div className="text-red-500 mb-4 text-center font-semibold">{error}</div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  placeholder="Enter document title"
                  value={editRequest.title}
                  onChange={e => setEditRequest(r => ({ ...r, title: e.target.value }))}
                  disabled={editing}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base min-h-[60px] resize-vertical"
                  placeholder="Describe the document or instructions (optional)"
                  value={editRequest.description}
                  onChange={e => setEditRequest(r => ({ ...r, description: e.target.value }))}
                  disabled={editing}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Template Attachment</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition font-medium text-blue-700">
                    <FileText className="h-5 w-5" />
                    <span>{editRequest.attachment ? 'Change file' : 'Select file'}</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={e => setEditRequest(r => ({ ...r, attachment: e.target.files ? e.target.files[0] : null }))}
                      disabled={editing}
                    />
                  </label>
                  {editRequest.attachment && (
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">
                      {editRequest.attachment?.name}
                    </span>
                  )}
                </div>
                {editingRequest.attachment_url && !editRequest.attachment && (
                  <p className="text-xs text-slate-500 mt-1">
                    Current template: {editingRequest.attachment_url.split('/').pop()}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Applicable Student Types <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  {STUDENT_TYPE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          opt.value === 'all'
                            ? editRequest.applicable_student_types.length === STUDENT_TYPE_OPTIONS.length - 1
                            : editRequest.applicable_student_types.includes(opt.value)
                        }
                        onChange={e => {
                          if (opt.value === 'all') {
                            if (e.target.checked) {
                              setEditRequest(r => ({ 
                                ...r, 
                                applicable_student_types: STUDENT_TYPE_OPTIONS.filter(o => o.value !== 'all').map(o => o.value) 
                              }));
                            } else {
                              setEditRequest(r => ({ ...r, applicable_student_types: [] }));
                            }
                          } else {
                            setEditRequest(r => {
                              let updated = r.applicable_student_types.includes(opt.value)
                                ? r.applicable_student_types.filter(v => v !== opt.value)
                                : [...r.applicable_student_types, opt.value];
                              return { ...r, applicable_student_types: updated };
                            });
                          }
                        }}
                        disabled={editing}
                        className="accent-blue-600"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6 justify-center">
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2" 
                onClick={handleEditRequest} 
                disabled={editing || !editRequest.title}
              >
                {editing ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                <span>{editing ? 'Updating...' : 'Update'}</span>
              </button>
              <button 
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold transition" 
                onClick={() => {
                  setShowEditRequestModal(false);
                  setEditingRequest(null);
                  setEditRequest({ title: '', description: '', attachment: null, applicable_student_types: ['all'] });
                }} 
                disabled={editing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && deletingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Document Request</h3>
                <p className="text-sm text-slate-600 mt-1">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-6">
              Are you sure you want to delete the document request "{deletingRequest.title}"? This will permanently remove the request and all associated uploads from the system.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeletingRequest(null);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRequest}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {deleting && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityDetails;