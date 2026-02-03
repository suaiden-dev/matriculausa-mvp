import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, User, Clock, ArrowUpRight } from 'lucide-react';

interface PendingConversation {
    id: string;
    conversation_id?: string;
    sender_name: string;
    sender_role: string;
    message: string;
    created_at: string;
}

interface PendingConversationsOverviewProps {
    conversations: PendingConversation[];
    loading?: boolean;
}

const PendingConversationsOverview: React.FC<PendingConversationsOverviewProps> = ({
    conversations,
    loading = false,
}) => {
    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                    <div className="animate-pulse space-y-4">
                        <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                        <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                    </div>
                </div>
                <div className="p-6 space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    const displayConversations = conversations.slice(0, 4);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Pending Conversations</h3>
                        <p className="text-slate-500 text-sm">
                            {conversations.length} unread message{conversations.length !== 1 ? 's' : ''} from users
                        </p>
                    </div>
                    <Link
                        to="/admin/dashboard/users?tab=messages"
                        className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center"
                    >
                        View All
                        <ArrowUpRight className="h-4 w-4 ml-1" />
                    </Link>
                </div>
            </div>

            <div className="p-6">
                {conversations.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <MessageSquare className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">All caught up!</h3>
                        <p className="text-slate-500">No pending conversations</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayConversations.map((conversation) => (
                            <Link
                                key={conversation.id}
                                to={`/admin/dashboard/users?tab=messages${conversation.conversation_id ? `&conversation=${conversation.conversation_id}` : ''}`}
                                className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all duration-300 group block"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                                            <User className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 text-sm truncate group-hover:text-purple-600 transition-colors">
                                                {conversation.sender_name}
                                            </h4>
                                            <p className="text-xs text-slate-500 capitalize">
                                                {conversation.sender_role}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                        <Clock className="h-3 w-3 mr-1" />
                                        New
                                    </span>
                                </div>

                                <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                                    {conversation.message}
                                </p>

                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span>
                                        {new Date(conversation.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                    <span className="flex items-center text-purple-600 group-hover:text-purple-700 font-medium">
                                        Open Chat
                                        <ArrowUpRight className="h-3 w-3 ml-1" />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingConversationsOverview;
