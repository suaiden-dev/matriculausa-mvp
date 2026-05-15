import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { channelManager } from '../../lib/supabaseChannelManager';
import {
    Globe,
    Files,
    ExternalLink,
    Clock,
    User,
    CheckCircle
} from 'lucide-react';

interface GlobalDocumentUpload {
    id: string;
    document_request_id: string;
    uploaded_by: string;
    status: string;
    uploaded_at: string;
    document_requests?: {
        id: string;
        title: string;
        is_global: boolean;
    };
    user_profiles?: {
        id: string;
        user_id: string;
        full_name: string;
        email: string;
    };
}

const PendingGlobalDocumentsOverview: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [uploads, setUploads] = useState<GlobalDocumentUpload[]>([]);

    useEffect(() => {
        fetchPendingGlobalUploads();
    }, []);

    const fetchPendingGlobalUploads = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('document_request_uploads')
                .select(`
                    id,
                    document_request_id,
                    uploaded_by,
                    status,
                    uploaded_at,
                    document_requests!inner (
                        id,
                        title,
                        is_global
                    ),
                    user_profiles (
                        id,
                        user_id,
                        full_name,
                        email
                    )
                `)
                .in('status', ['pending', 'under_review'])
                .eq('is_admin_upload', false)
                .order('uploaded_at', { ascending: false });

            if (error) {
                console.error('[PendingGlobalDocumentsOverview] Error fetching:', error);
                return;
            }

            setUploads((data || []) as GlobalDocumentUpload[]);
        } catch (err) {
            console.error('[PendingGlobalDocumentsOverview] Unexpected error:', err);
        } finally {
            setLoading(false);
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

    const getProfileLink = (profileData: any, fallbackId: string) => {
        const id = profileData?.id || fallbackId;
        return `/admin/dashboard/students/${id}?tab=documents&section=global-documents`;
    };

    // Real-time subscription
    useEffect(() => {
        const channelName = 'admin-pending-global-documents';

        channelManager.subscribe(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'document_request_uploads'
                },
                (payload: any) => {
                    const newStatus = payload.new?.status;
                    const oldStatus = payload.old?.status;
                    if (
                        newStatus === 'pending' ||
                        newStatus === 'under_review' ||
                        oldStatus === 'pending' ||
                        oldStatus === 'under_review'
                    ) {
                        fetchPendingGlobalUploads();
                    }
                }
            );

        return () => {
            channelManager.unsubscribe(channelName);
        };
    }, []);

    // Group by student
    const groups = Array.from(
        uploads
            .reduce((acc, upload) => {
                const userId = upload.uploaded_by;
                if (!acc.has(userId)) {
                    acc.set(userId, {
                        user_id: userId,
                        user_profiles: upload.user_profiles,
                        count: 0,
                        last_uploaded: upload.uploaded_at,
                        requestTitles: [] as string[]
                    });
                }
                const group = acc.get(userId)!;
                group.count += 1;
                if (new Date(upload.uploaded_at) > new Date(group.last_uploaded)) {
                    group.last_uploaded = upload.uploaded_at;
                }
                const title = (upload.document_requests as any)?.title || 'Global Document';
                if (!group.requestTitles.includes(title)) {
                    group.requestTitles.push(title);
                }
                return acc;
            }, new Map<string, any>())
            .values()
    ).sort((a, b) => new Date(b.last_uploaded).getTime() - new Date(a.last_uploaded).getTime());

    const totalCount = groups.length;
    const totalItems = uploads.length;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="border-b border-slate-200">
                <div className="p-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                            <Globe className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-bold text-slate-900">Pending Document Requests Review</h3>
                                {totalItems > 0 && (
                                    <span className="bg-teal-100 text-teal-600 py-0.5 px-2 rounded-full text-xs font-bold">
                                        {totalItems}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-600">Document requests awaiting your approval</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {loading ? (
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
                        <p className="text-slate-500 text-sm">No pending document requests to review.</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                        {groups.map((group) => (
                            <div key={group.user_id} className="p-4 border border-slate-100 rounded-xl hover:border-teal-100 hover:bg-teal-50/30 transition-all group">
                                <div className="flex items-center justify-between gap-4">
                                    {/* Student info */}
                                    <div className="flex items-center space-x-4 flex-shrink-0">
                                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
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

                                    {/* Request title badges */}
                                    <div className="flex-1 flex flex-wrap gap-2 justify-start">
                                        {group.requestTitles.length > 0 && (
                                            <div className="flex items-center bg-teal-50 text-teal-700 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider">
                                                <Files className="h-3 w-3 mr-1" />
                                                {group.requestTitles.join(', ')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Count + Review button */}
                                    <div className="flex items-center space-x-4 flex-shrink-0">
                                        <span className="flex items-center justify-center bg-teal-100 text-teal-700 font-bold text-xs h-6 min-w-[24px] px-1.5 rounded-full">
                                            {group.count}
                                        </span>
                                        <Link
                                            to={getProfileLink(group.user_profiles, group.user_id)}
                                            className="px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 rounded-lg group-hover:bg-teal-100 transition-colors flex items-center"
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

export default PendingGlobalDocumentsOverview;
