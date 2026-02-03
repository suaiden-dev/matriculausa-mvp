import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { channelManager } from '../../lib/supabaseChannelManager';
import {
    FileText,
    Files,
    ExternalLink,
    Clock,
    User,
    CheckCircle
} from 'lucide-react';

// Tipos para os documentos
interface LoadingState {
    studentDocuments: boolean;
    documentRequests: boolean;
}

interface StudentDocument {
    id: string;
    user_id: string;
    type: string;
    status: string;
    uploaded_at: string;
    user_profiles?: {
        full_name: string;
        email: string;
        id: string; // profile_id
        user_id: string;
    };
}

interface DocumentRequestUpload {
    id: string;
    document_request_id: string;
    uploaded_by: string;
    status: string;
    uploaded_at: string;
    user_profiles?: {
        full_name: string;
        email: string;
        id: string;
        user_id: string;
    };
    document_requests?: {
        title: string;
    };
}

const PendingDocumentsOverview: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'student_documents' | 'document_requests'>('student_documents');
    const [loading, setLoading] = useState<LoadingState>({ studentDocuments: true, documentRequests: true });
    const [studentDocuments, setStudentDocuments] = useState<StudentDocument[]>([]);
    const [documentRequests, setDocumentRequests] = useState<DocumentRequestUpload[]>([]);

    useEffect(() => {
        fetchStudentDocuments();
        fetchDocumentRequests();
    }, []);

    const fetchStudentDocuments = async () => {
        try {
            setLoading(prev => ({ ...prev, studentDocuments: true }));
            // Buscar documentos de estudantes
            const { data, error } = await supabase
                .from('student_documents')
                .select(`
          *,
          user_profiles:user_id (full_name, email, id, user_id)
        `)
                .eq('status', 'pending')
                .order('uploaded_at', { ascending: false })
                .limit(10); // Limite inicial

            if (!error && data) {
                setStudentDocuments(data);
            }
        } catch (error) {
            console.error('Error fetching student documents:', error);
        } finally {
            setLoading(prev => ({ ...prev, studentDocuments: false }));
        }
    };

    const fetchDocumentRequests = async () => {
        try {
            setLoading(prev => ({ ...prev, documentRequests: true }));
            // Buscar uploads de requests pendentes
            const { data, error } = await supabase
                .from('document_request_uploads')
                .select(`
          *,
          user_profiles:uploaded_by (full_name, email, id, user_id),
          document_requests:document_request_id (title)
        `)
                .in('status', ['pending', 'under_review'])
                .order('uploaded_at', { ascending: false })
                .limit(10);

            if (!error && data) {
                setDocumentRequests(data);
            }
        } catch (error) {
            console.error('Error fetching document requests:', error);
        } finally {
            setLoading(prev => ({ ...prev, documentRequests: false }));
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Helper para obter o ID correto para o link (preferência pelo ID do profile)
    const getProfileLink = (profileData: any, fallbackId: string) => {
        // Se temos os dados do profile populados
        if (profileData && profileData.id) {
            return `/admin/dashboard/students/${profileData.id}?tab=documents`;
        }
        // Caso contrário, fallback para o ID que temos na foreign key
        return `/admin/dashboard/students/${fallbackId}?tab=documents`;
    };

    // Real-time subscriptions para atualizar automaticamente quando novos documentos chegam
    useEffect(() => {
        const channelName = 'admin-pending-documents';

        channelManager.subscribe(channelName)
            // Escutar mudanças em student_documents
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'student_documents',
                    filter: 'status=eq.pending'
                },
                () => {
                    // Recarregar documentos quando houver mudanças
                    fetchStudentDocuments();
                }
            )
            // Escutar mudanças em document_request_uploads
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'document_request_uploads'
                },
                (payload: any) => {
                    // Só recarregar se o status for pending ou under_review
                    const newStatus = payload.new?.status;
                    const oldStatus = payload.old?.status;

                    if (
                        newStatus === 'pending' ||
                        newStatus === 'under_review' ||
                        oldStatus === 'pending' ||
                        oldStatus === 'under_review'
                    ) {
                        fetchDocumentRequests();
                    }
                }
            );

        // Cleanup: remover subscription quando componente desmontar
        return () => {
            channelManager.unsubscribe(channelName);
        };
    }, []); // Array vazio = executar apenas uma vez ao montar

    // Grupar documentos por estudante
    const groupedStudentDocuments = Array.from(
        studentDocuments.reduce((acc, doc) => {
            const userId = doc.user_id;
            if (!acc.has(userId)) {
                acc.set(userId, {
                    user_profiles: doc.user_profiles,
                    user_id: userId,
                    count: 0,
                    last_uploaded: doc.uploaded_at,
                    types: [] as string[]
                });
            }
            const group = acc.get(userId)!;
            group.count += 1;
            if (new Date(doc.uploaded_at) > new Date(group.last_uploaded)) {
                group.last_uploaded = doc.uploaded_at;
            }
            if (!group.types.includes(doc.type)) {
                group.types.push(doc.type);
            }
            return acc;
        }, new Map<string, any>()).values()
    ).sort((a, b) => new Date(b.last_uploaded).getTime() - new Date(a.last_uploaded).getTime());

    // Grupar requests por estudante
    const groupedDocumentRequests = Array.from(
        documentRequests.reduce((acc, req) => {
            const userId = req.uploaded_by;
            if (!acc.has(userId)) {
                acc.set(userId, {
                    user_profiles: req.user_profiles,
                    user_id: userId,
                    count: 0,
                    last_uploaded: req.uploaded_at,
                    titles: [] as string[]
                });
            }
            const group = acc.get(userId)!;
            group.count += 1;
            if (new Date(req.uploaded_at) > new Date(group.last_uploaded)) {
                group.last_uploaded = req.uploaded_at;
            }
            const title = req.document_requests?.title || 'Document Request';
            if (!group.titles.includes(title)) {
                group.titles.push(title);
            }
            return acc;
        }, new Map<string, any>()).values()
    ).sort((a, b) => new Date(b.last_uploaded).getTime() - new Date(a.last_uploaded).getTime());

    const currentLoading = activeTab === 'student_documents' ? loading.studentDocuments : loading.documentRequests;
    const currentCount = activeTab === 'student_documents' ? groupedStudentDocuments.length : groupedDocumentRequests.length;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header com Abas */}
            <div className="border-b border-slate-200">
                <div className="p-6 pb-0">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <Files className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Pending Documents Review</h3>
                            <p className="text-sm text-slate-600">Documents awaiting your approval</p>
                        </div>
                    </div>

                    <div className="flex space-x-6">
                        <button
                            onClick={() => setActiveTab('student_documents')}
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center ${activeTab === 'student_documents'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Student Documents
                            {studentDocuments.length > 0 && (
                                <span className="ml-2 bg-indigo-100 text-indigo-600 py-0.5 px-2 rounded-full text-xs">
                                    {studentDocuments.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('document_requests')}
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center ${activeTab === 'document_requests'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Documents Requests
                            {documentRequests.length > 0 && (
                                <span className="ml-2 bg-indigo-100 text-indigo-600 py-0.5 px-2 rounded-full text-xs">
                                    {documentRequests.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6">
                {currentLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-32 bg-slate-200 rounded"></div>
                                        <div className="h-3 w-24 bg-slate-200 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : currentCount === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                        <h3 className="text-slate-900 font-medium mb-1">All caught up!</h3>
                        <p className="text-slate-500 text-sm">No pending documents to review in this category.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeTab === 'student_documents' ? (
                            // Lista de Student Documents Agrupados
                            groupedStudentDocuments.map((group) => (
                                <div key={group.user_id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900">
                                                {group.user_profiles?.full_name || 'Unknown Student'}
                                            </h4>
                                            <div className="flex items-center text-xs text-slate-500 mt-0.5">
                                                <Clock className="h-3 w-3 mr-1" />
                                                <span className="mr-3">Last: {formatDate(group.last_uploaded)}</span>
                                                <FileText className="h-3 w-3 mr-1" />
                                                <span className="text-slate-500">
                                                    <span className="font-medium text-slate-700 mr-1">Documents Pending:</span>
                                                    {group.types.map((t: string) => t.replace(/_/g, ' ')).join(', ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 font-bold text-xs h-6 min-w-[24px] px-1.5 rounded-full">
                                            {group.count}
                                        </span>
                                        <Link
                                            to={getProfileLink(group.user_profiles, group.user_id)}
                                            className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors flex items-center"
                                        >
                                            Review
                                            <ExternalLink className="h-3 w-3 ml-1" />
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Lista de Document Requests Agrupados
                            groupedDocumentRequests.map((group) => (
                                <div key={group.user_id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-500 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900">
                                                {group.user_profiles?.full_name || 'Unknown Student'}
                                            </h4>
                                            <div className="flex items-center text-xs text-slate-500 mt-0.5">
                                                <Clock className="h-3 w-3 mr-1" />
                                                <span className="mr-3">Last: {formatDate(group.last_uploaded)}</span>
                                                <FileText className="h-3 w-3 mr-1" />
                                                <span className="text-slate-500">
                                                    <span className="font-medium text-slate-700 mr-1">Documents Pending:</span>
                                                    {group.titles.join(', ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className="flex items-center justify-center bg-purple-100 text-purple-700 font-bold text-xs h-6 min-w-[24px] px-1.5 rounded-full">
                                            {group.count}
                                        </span>
                                        <Link
                                            to={getProfileLink(group.user_profiles, group.user_id)}
                                            className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors flex items-center"
                                        >
                                            Review
                                            <ExternalLink className="h-3 w-3 ml-1" />
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingDocumentsOverview;
