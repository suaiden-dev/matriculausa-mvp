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
import { useEnvironment } from '../../hooks/useEnvironment';


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
        scholarship_applications?: Array<{
            id: string;
            status: string;
        }>;
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
        scholarship_applications?: Array<{
            id: string;
            status: string;
        }>;
    };
    document_requests?: {
        title: string;
    };
}

const PendingDocumentsOverview: React.FC = () => {
    const { isDevelopment } = useEnvironment();
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
          user_profiles:user_id (
            full_name, 
            email, 
            id, 
            user_id,
            scholarship_applications(id, status)
          )
        `)
                .eq('status', 'pending')
                .order('uploaded_at', { ascending: false })
                .limit(10); // Limite inicial

            if (!error && data) {
                // Filtrar usuários de teste e usuários com status 'enrolled'
                const filteredData = data.filter(doc => {
                    // Filtrar emails de teste (exceto em desenvolvimento)
                    if (!isDevelopment && doc.user_profiles?.email?.toLowerCase().includes('@uorak.com')) {
                        return false;
                    }
                    
                    // Filtrar usuários que já estão enrolled
                    const hasEnrolledApplication = doc.user_profiles?.scholarship_applications?.some(
                        (app: { id: string; status: string }) => app.status === 'enrolled'
                    );
                    
                    return !hasEnrolledApplication;
                });
                
                setStudentDocuments(filteredData as StudentDocument[]);
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
          user_profiles:uploaded_by (
            full_name, 
            email, 
            id, 
            user_id,
            scholarship_applications(id, status)
          ),
          document_requests:document_request_id (title)
        `)
                .in('status', ['pending', 'under_review'])
                .order('uploaded_at', { ascending: false })
                .limit(10);

            if (!error && data) {
                // Filtrar usuários de teste e usuários com status 'enrolled'
                const filteredData = data.filter(req => {
                    // Filtrar emails de teste (exceto em desenvolvimento)
                    if (!isDevelopment && req.user_profiles?.email?.toLowerCase().includes('@uorak.com')) {
                        return false;
                    }
                    
                    // Filtrar usuários que já estão enrolled
                    const hasEnrolledApplication = req.user_profiles?.scholarship_applications?.some(
                        (app: { id: string; status: string }) => app.status === 'enrolled'
                    );
                    
                    return !hasEnrolledApplication;
                });
                
                setDocumentRequests(filteredData as DocumentRequestUpload[]);
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

    const unifiedGroups = Array.from(
        [...studentDocuments.map(d => ({ ...d, source: 'student' })), 
         ...documentRequests.map(r => ({ ...r, source: 'request', user_id: r.uploaded_by }))]
        .reduce((acc, item: any) => {
            const userId = item.user_id;
            if (!acc.has(userId)) {
                acc.set(userId, {
                    user_profiles: item.user_profiles,
                    user_id: userId,
                    count: 0,
                    last_uploaded: item.uploaded_at,
                    studentDocs: [] as string[],
                    requestDocs: [] as string[]
                });
            }
            const group = acc.get(userId)!;
            group.count += 1;
            if (new Date(item.uploaded_at) > new Date(group.last_uploaded)) {
                group.last_uploaded = item.uploaded_at;
            }
            
            if (item.source === 'student') {
                if (!group.studentDocs.includes(item.type)) {
                    group.studentDocs.push(item.type);
                }
            } else {
                const title = item.document_requests?.title || 'Document Request';
                if (!group.requestDocs.includes(title)) {
                    group.requestDocs.push(title);
                }
            }
            return acc;
        }, new Map<string, any>()).values()
    ).sort((a, b) => new Date(b.last_uploaded).getTime() - new Date(a.last_uploaded).getTime());

    const isLoading = loading.studentDocuments || loading.documentRequests;
    const totalCount = unifiedGroups.length;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="border-b border-slate-200">
                <div className="p-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <Files className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-bold text-slate-900">Pending Documents Review</h3>
                                {(studentDocuments.length + documentRequests.length) > 0 && (
                                    <span className="bg-indigo-100 text-indigo-600 py-0.5 px-2 rounded-full text-xs font-bold">
                                        {studentDocuments.length + documentRequests.length}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-600">Documents awaiting your approval</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6">
                {isLoading ? (
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
                ) : totalCount === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                        <h3 className="text-slate-900 font-medium mb-1">All caught up!</h3>
                        <p className="text-slate-500 text-sm">No pending documents to review.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {unifiedGroups.map((group) => (
                            <div key={group.user_id} className="p-4 border border-slate-100 rounded-xl hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group">
                                <div className="flex items-center justify-between gap-4">
                                    {/* Informações do usuário */}
                                    <div className="flex items-center space-x-4 flex-shrink-0">
                                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900">
                                                {group.user_profiles?.full_name || 'Unknown Student'}
                                            </h4>
                                            <div className="flex items-center text-xs text-slate-500 mt-0.5">
                                                <Clock className="h-3 w-3 mr-1" />
                                                <span>Last upload: {formatDate(group.last_uploaded)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Badges de documentos - agora na mesma linha */}
                                    <div className="flex-1 flex flex-wrap gap-2 justify-start">
                                        {group.studentDocs.length > 0 && (
                                            <div className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider">
                                                <FileText className="h-3 w-3 mr-1" />
                                                Student Docs: {group.studentDocs.map((t: string) => t.replace(/_/g, ' ')).join(', ')}
                                            </div>
                                        )}
                                        {group.requestDocs.length > 0 && (
                                            <div className="flex items-center bg-purple-50 text-purple-700 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider">
                                                <Files className="h-3 w-3 mr-1" />
                                                Requests: {group.requestDocs.join(', ')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Contador e botão Review */}
                                    <div className="flex items-center space-x-4 flex-shrink-0">
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
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default PendingDocumentsOverview;
