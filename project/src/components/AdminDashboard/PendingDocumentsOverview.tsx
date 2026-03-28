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
// import { useEnvironment } from '../../hooks/useEnvironment';


// Tipos para os documentos
interface LoadingState {
    studentDocuments: boolean;
    documentRequests: boolean;
    identityPhotos: boolean;
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

interface IdentityVerification {
    id: string;
    user_id: string;
    identity_photo_status: string;
    identity_photo_path: string;
    created_at: string;
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
}

const PendingDocumentsOverview: React.FC = () => {
    // const { isDevelopment } = useEnvironment();
    const [loading, setLoading] = useState<LoadingState>({ 
        studentDocuments: true, 
        documentRequests: true, 
        identityPhotos: true 
    });

    const [studentDocuments, setStudentDocuments] = useState<StudentDocument[]>([]);
    const [documentRequests, setDocumentRequests] = useState<DocumentRequestUpload[]>([]);
    const [identityPhotos, setIdentityPhotos] = useState<IdentityVerification[]>([]);
    
    // ... rest of state stays the same

    useEffect(() => {
        fetchAllPendingDocuments();
    }, []);

    const fetchAllPendingDocuments = async () => {
        try {
            setLoading({ 
                studentDocuments: true, 
                documentRequests: true, 
                identityPhotos: true 
            });
            
            // Batch loading usando RPC para evitar N+1 roundtrips e redundância de dados
            const { data, error } = await supabase.rpc('get_pending_documents_batch');

            if (error) {
                console.error('Error fetching pending documents batch:', error);
                return;
            }

            if (data) {
                setStudentDocuments(data.student_documents || []);
                setDocumentRequests(data.document_requests || []);
                setIdentityPhotos(data.identity_photos || []);
            }

        } catch (error) {
            console.error('Unexpected error in fetchAllPendingDocuments:', error);
        } finally {
            setLoading({ 
                studentDocuments: false, 
                documentRequests: false, 
                identityPhotos: false 
            });
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
            return `/admin/dashboard/students/${profileData.id}?tab=overview`;
        }
        // Caso contrário, fallback para o ID que temos na foreign key
        return `/admin/dashboard/students/${fallbackId}?tab=overview`;
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
                    table: 'student_documents'
                },
                () => {
                    // Recarregar documentos quando houver mudanças
                    fetchAllPendingDocuments();
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
                    // Só recarregar se o status for pending ou under_review ou mudou disso
                    const newStatus = payload.new?.status;
                    const oldStatus = payload.old?.status;

                    if (
                        newStatus === 'pending' ||
                        newStatus === 'under_review' ||
                        oldStatus === 'pending' || oldStatus === 'under_review'
                    ) {
                        fetchAllPendingDocuments();
                    }
                }
            )
            // Escutar mudanças em comprehensive_term_acceptance (identity photos)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'comprehensive_term_acceptance'
                },
                (payload: any) => {
                    // Recarregar se o status mudar para pending ou de pending para outra coisa
                    const newStatus = payload.new?.identity_photo_status;
                    const oldStatus = payload.old?.identity_photo_status;
                    
                    if (newStatus === 'pending' || oldStatus === 'pending') {
                        fetchAllPendingDocuments();
                    }
                }
            );

        // Cleanup: remover subscription quando componente desmontar
        return () => {
            channelManager.unsubscribe(channelName);
        };
    }, []); // Array vazio = executar apenas uma vez ao montar

    const unifiedGroups = Array.from(
        [
            ...studentDocuments.map(d => ({ ...d, source: 'student' })), 
            ...documentRequests.map(r => ({ ...r, source: 'request', user_id: r.uploaded_by })),
            ...identityPhotos.map(i => ({ ...i, source: 'identity', uploaded_at: i.created_at }))
        ]
        .reduce((acc, item: any) => {
            const userId = item.user_id;
            if (!acc.has(userId)) {
                acc.set(userId, {
                    user_profiles: item.user_profiles,
                    user_id: userId,
                    count: 0,
                    last_uploaded: item.uploaded_at,
                    studentDocs: [] as string[],
                    requestDocs: [] as string[],
                    hasIdentityPhoto: false
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
            } else if (item.source === 'request') {
                const title = item.document_requests?.title || 'Document Request';
                if (!group.requestDocs.includes(title)) {
                    group.requestDocs.push(title);
                }
            } else if (item.source === 'identity') {
                group.hasIdentityPhoto = true;
            }
            return acc;
        }, new Map<string, any>()).values()
    ).sort((a, b) => new Date(b.last_uploaded).getTime() - new Date(a.last_uploaded).getTime());

    const isLoading = loading.studentDocuments || loading.documentRequests || loading.identityPhotos;
    const totalCount = unifiedGroups.length;
    const totalItems = studentDocuments.length + documentRequests.length + identityPhotos.length;

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
                                {totalItems > 0 && (
                                    <span className="bg-indigo-100 text-indigo-600 py-0.5 px-2 rounded-full text-xs font-bold">
                                        {totalItems}
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
                    <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
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
                                        {group.hasIdentityPhoto && (
                                            <div className="flex items-center bg-amber-50 text-amber-700 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider">
                                                <User className="h-3 w-3 mr-1" />
                                                Identity Photo Verification
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
