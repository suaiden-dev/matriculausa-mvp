import React, { useState, useEffect } from 'react';
import {
  Mail,
  Users,
  Send,
  XCircle,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Search,
  RefreshCw,
  Activity,
  Edit,
  X,
  Plus
} from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import RefreshButton from '../../components/RefreshButton';
import { CreateCampaignModal } from './NewsletterManagement/components/CreateCampaignModal';
import { CampaignsList, Campaign } from './NewsletterManagement/components/CampaignsList';

// Campaign interface moved to CampaignsList component

interface SentEmail {
  id: string;
  user_id: string;
  campaign_id: string;
  email_address: string;
  subject: string;
  sent_at: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  metadata: any;
  created_at: string;
  campaign?: Campaign;
  user_name?: string;
}

interface UserPreference {
  id: string;
  user_id: string;
  email_opt_out: boolean;
  opt_out_reason: string | null;
  opt_out_at: string | null;
  last_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

interface NewsletterStats {
  totalEmails: number;
  sentEmails: number;
  failedEmails: number;
  bouncedEmails: number;
  successRate: number;
  totalOptOuts: number;
  activeCampaigns: number;
  totalCampaigns: number;
  emailsLast7Days: number;
  emailsLast30Days: number;
}


const NewsletterManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'emails' | 'preferences'>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<NewsletterStats | null>(null);
  
  // Campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    description: string;
    email_subject_template: string;
    email_body_template: string;
    cooldown_days: number;
  }>({
    name: '',
    description: '',
    email_subject_template: '',
    email_body_template: '',
    cooldown_days: 7
  });
  
  // Emails state
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailFilters, setEmailFilters] = useState({
    search: '',
    campaign: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [emailPage, setEmailPage] = useState(1);
  const emailsPerPage = 20;
  
  // Preferences state
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [preferenceSearch, setPreferenceSearch] = useState('');

  // Estado para controlar animação do botão refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estado para modal de criação de campanha
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Estado para processamento manual
  const [processingManually, setProcessingManually] = useState(false);


  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'emails') {
      fetchSentEmails();
    } else if (activeTab === 'preferences') {
      fetchPreferences();
    } else if (activeTab === 'overview') {
      // Carregar emails recentes para o overview
      fetchRecentEmails();
    }
  }, [activeTab, emailFilters, emailPage]);

  // Estado para emails recentes no overview
  const [recentEmails, setRecentEmails] = useState<SentEmail[]>([]);
  const [loadingRecentEmails, setLoadingRecentEmails] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchCampaigns()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // Função para forçar recarregamento quando necessário
  const forceRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      // Recarregar todos os dados
      await Promise.all([
        fetchStats(),
        fetchCampaigns(),
        activeTab === 'emails' ? fetchSentEmails() : Promise.resolve(),
        activeTab === 'preferences' ? fetchPreferences() : Promise.resolve(),
        activeTab === 'overview' ? fetchRecentEmails() : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Error refreshing data');
    } finally {
      // Pequeno delay para garantir que a animação seja visível
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  };

  const fetchStats = async () => {
    try {
      // Total de emails
      const { count: totalEmails } = await supabase
        .from('newsletter_sent_emails')
        .select('*', { count: 'exact', head: true });

      // Emails por status
      const { data: emailsByStatus } = await supabase
        .from('newsletter_sent_emails')
        .select('status');

      const sentEmails = emailsByStatus?.filter(e => e.status === 'sent').length || 0;
      const failedEmails = emailsByStatus?.filter(e => e.status === 'failed').length || 0;
      const bouncedEmails = emailsByStatus?.filter(e => e.status === 'bounced').length || 0;
      const successRate = totalEmails ? ((sentEmails / totalEmails) * 100) : 0;

      // Opt-outs
      const { count: optOuts } = await supabase
        .from('newsletter_user_preferences')
        .select('*', { count: 'exact', head: true })
        .eq('email_opt_out', true);

      // Campanhas
      const { data: allCampaigns } = await supabase
        .from('newsletter_campaigns')
        .select('is_active');
      
      const activeCampaigns = allCampaigns?.filter(c => c.is_active).length || 0;
      const totalCampaigns = allCampaigns?.length || 0;

      // Emails últimos 7 e 30 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: emails7Days } = await supabase
        .from('newsletter_sent_emails')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', sevenDaysAgo.toISOString());

      const { count: emails30Days } = await supabase
        .from('newsletter_sent_emails')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', thirtyDaysAgo.toISOString());

      setStats({
        totalEmails: totalEmails || 0,
        sentEmails,
        failedEmails,
        bouncedEmails,
        successRate: Math.round(successRate * 100) / 100,
        totalOptOuts: optOuts || 0,
        activeCampaigns,
        totalCampaigns,
        emailsLast7Days: emails7Days || 0,
        emailsLast30Days: emails30Days || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      const { data, error } = await supabase
        .from('newsletter_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns((data || []) as Campaign[]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Error loading campaigns');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const fetchRecentEmails = async (limit: number = 5) => {
    try {
      setLoadingRecentEmails(true);
      const { data, error } = await supabase
        .from('newsletter_sent_emails')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Buscar nomes dos usuários e dados das campanhas
      if (data) {
        const userIds = [...new Set(data.map(e => e.user_id))];
        const campaignIds = [...new Set(data.map(e => e.campaign_id))];

        // Buscar perfis de usuários
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        // Buscar campanhas
        const { data: campaignData } = await supabase
          .from('newsletter_campaigns')
          .select('id, name, campaign_key')
          .in('id', campaignIds);

        const emailsWithNames = data.map(email => {
          const profile = userProfiles?.find(p => p.user_id === email.user_id);
          const campaign = campaignData?.find(c => c.id === email.campaign_id);
          return {
            ...email,
            user_name: profile?.full_name || email.metadata?.full_name || 'N/A',
            user_email: profile?.email || email.email_address,
            campaign: campaign || null
          };
        });

        setRecentEmails(emailsWithNames);
      } else {
        setRecentEmails([]);
      }
    } catch (error) {
      console.error('Error fetching recent emails:', error);
    } finally {
      setLoadingRecentEmails(false);
    }
  };

  const fetchSentEmails = async () => {
    try {
      setLoadingEmails(true);
      let query = supabase
        .from('newsletter_sent_emails')
        .select('*')
        .order('sent_at', { ascending: false })
        .range((emailPage - 1) * emailsPerPage, emailPage * emailsPerPage - 1);

      // Aplicar filtros
      if (emailFilters.campaign) {
        query = query.eq('campaign_id', emailFilters.campaign);
      }
      if (emailFilters.status) {
        query = query.eq('status', emailFilters.status);
      }
      if (emailFilters.dateFrom) {
        query = query.gte('sent_at', emailFilters.dateFrom);
      }
      if (emailFilters.dateTo) {
        query = query.lte('sent_at', emailFilters.dateTo + 'T23:59:59');
      }
      if (emailFilters.search) {
        query = query.or(`email_address.ilike.%${emailFilters.search}%,subject.ilike.%${emailFilters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar nomes dos usuários e dados das campanhas
      if (data) {
        const userIds = [...new Set(data.map(e => e.user_id))];
        const campaignIds = [...new Set(data.map(e => e.campaign_id))];

        // Buscar perfis de usuários
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        // Buscar campanhas
        const { data: campaignData } = await supabase
          .from('newsletter_campaigns')
          .select('id, name, campaign_key')
          .in('id', campaignIds);

        const emailsWithNames = data.map(email => {
          const profile = userProfiles?.find(p => p.user_id === email.user_id);
          const campaign = campaignData?.find(c => c.id === email.campaign_id);
          return {
            ...email,
            user_name: profile?.full_name || email.metadata?.full_name || 'N/A',
            user_email: profile?.email || email.email_address,
            campaign: campaign || null
          };
        });

        setSentEmails(emailsWithNames);
      } else {
        setSentEmails([]);
      }
    } catch (error) {
      console.error('Error fetching sent emails:', error);
      toast.error('Error loading sent emails');
    } finally {
      setLoadingEmails(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      setLoadingPreferences(true);
      let query = supabase
        .from('newsletter_user_preferences')
        .select('*')
        .order('opt_out_at', { ascending: false });

      if (preferenceSearch) {
        // Buscar por email do usuário
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('user_id, email, full_name')
          .ilike('email', `%${preferenceSearch}%`);

        if (userProfiles && userProfiles.length > 0) {
          const userIds = userProfiles.map(p => p.user_id);
          query = query.in('user_id', userIds);
        } else {
          setPreferences([]);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar dados dos usuários
      if (data) {
        const userIds = data.map(p => p.user_id);
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        const preferencesWithNames = data.map(pref => {
          const profile = userProfiles?.find(p => p.user_id === pref.user_id);
          return {
            ...pref,
            user_email: profile?.email || 'N/A',
            user_name: profile?.full_name || 'N/A'
          };
        });

        setPreferences(preferencesWithNames);
      } else {
        setPreferences([]);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Error loading preferences');
    } finally {
      setLoadingPreferences(false);
    }
  };

  const toggleCampaign = async (campaignId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('newsletter_campaigns')
        .update({ is_active: !currentStatus })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success(`Campaign ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      await fetchCampaigns();
      await fetchStats();
    } catch (error) {
      console.error('Error toggling campaign:', error);
      toast.error('Error changing campaign status');
    }
  };

  const openEditModal = (campaign: Campaign | any) => {
    setEditingCampaign(campaign);
    setEditFormData({
      name: campaign.name,
      description: campaign.description || '',
      email_subject_template: campaign.email_subject_template,
      email_body_template: campaign.email_body_template,
      cooldown_days: campaign.cooldown_days
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCampaign(null);
    setEditFormData({
      name: '',
      description: '',
      email_subject_template: '',
      email_body_template: '',
      cooldown_days: 7
    });
  };

  const saveCampaign = async () => {
    if (!editingCampaign) return;

    try {
      setSavingCampaign(true);
      const { error } = await supabase
        .from('newsletter_campaigns')
        .update({
          name: editFormData.name,
          description: editFormData.description || null,
          email_subject_template: editFormData.email_subject_template,
          email_body_template: editFormData.email_body_template,
          cooldown_days: editFormData.cooldown_days
        })
        .eq('id', editingCampaign.id);

      if (error) throw error;

      toast.success('Campaign updated successfully');
      await fetchCampaigns();
      closeEditModal();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Error updating campaign');
    } finally {
      setSavingCampaign(false);
    }
  };

  const processCampaignsManually = async () => {
    try {
      setProcessingManually(true);
      toast.loading('Processing campaigns...', { id: 'processing' });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-newsletter-campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to process campaigns');
      }

      const result = await response.json();
      const totalSent = result.total?.sent || result.sent || 0;
      const totalFailed = result.total?.failed || result.failed || 0;
      
      toast.success(`Campaigns processed! Sent: ${totalSent}, Failed: ${totalFailed}`, { id: 'processing' });
      
      // Recarregar dados após um pequeno delay para garantir que os dados foram salvos
      setTimeout(async () => {
        await Promise.all([
          fetchStats(),
          fetchCampaigns(),
          fetchRecentEmails()
        ]);
      }, 1000);
    } catch (error: any) {
      console.error('Error processing campaigns:', error);
      toast.error(error.message || 'Error processing campaigns', { id: 'processing' });
    } finally {
      setProcessingManually(false);
    }
  };


  const reactivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('newsletter_user_preferences')
        .update({
          email_opt_out: false,
          opt_out_reason: null,
          opt_out_at: null
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('User reactivated successfully');
      await fetchPreferences();
      await fetchStats();
    } catch (error) {
      console.error('Error reactivating user:', error);
      toast.error('Error reactivating user');
    }
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
    c.campaign_key.toLowerCase().includes(campaignSearch.toLowerCase())
  );

  const filteredPreferences = preferences.filter(p =>
    !preferenceSearch ||
    p.user_email?.toLowerCase().includes(preferenceSearch.toLowerCase()) ||
    p.user_name?.toLowerCase().includes(preferenceSearch.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'bounced': return 'text-orange-600 bg-orange-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Sent';
      case 'failed': return 'Failed';
      case 'bounced': return 'Bounced';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Mail className="w-8 h-8 text-[#05294E]" />
            Newsletter Management
          </h1>
          <p className="text-slate-600 mt-2">
            Manage campaigns, view statistics and control user preferences
          </p>
        </div>
        <RefreshButton
          onClick={forceRefreshAll}
          isRefreshing={isRefreshing}
          title="Refresh all data"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'campaigns', label: 'Campaigns', icon: Send },
            { id: 'emails', label: 'Sent Emails', icon: Mail },
            { id: 'preferences', label: 'Preferences', icon: Users }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#05294E] border-b-2 border-[#05294E]'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading && activeTab === 'overview' ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-[#05294E]" />
        </div>
      ) : activeTab === 'overview' && stats ? (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">Total Emails</h3>
                <Mail className="w-5 h-5 text-[#05294E]" />
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.totalEmails.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">
                {stats.emailsLast30Days} in the last 30 days
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">Success Rate</h3>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.successRate}%</p>
              <p className="text-xs text-slate-500 mt-1">
                {stats.sentEmails} sent, {stats.failedEmails} failed
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">Active Campaigns</h3>
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.activeCampaigns}</p>
              <p className="text-xs text-slate-500 mt-1">
                of {stats.totalCampaigns} total campaigns
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">Opt-outs</h3>
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.totalOptOuts}</p>
              <p className="text-xs text-slate-500 mt-1">
                Users who unsubscribed
              </p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Send className="w-5 h-5 text-[#05294E]" />
                  <div>
                    <p className="font-medium text-slate-800">Emails sent (7 days)</p>
                    <p className="text-sm text-slate-600">{stats.emailsLast7Days} emails</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-600">Last 7 days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Sent Emails */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#05294E]" />
                  Recent Sent Emails
                </h2>
                <button
                  onClick={() => setActiveTab('emails')}
                  className="text-sm text-[#05294E] hover:text-[#041d35] font-medium"
                >
                  View All →
                </button>
              </div>
            </div>
            {loadingRecentEmails ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-[#05294E]" />
              </div>
            ) : recentEmails.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Recipient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Campaign</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {recentEmails.map(email => (
                      <tr key={email.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {email.sent_at ? new Date(email.sent_at).toLocaleString('en-US') : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-800">{email.user_name || 'N/A'}</p>
                            <p className="text-sm text-slate-500">{email.email_address}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 max-w-md truncate">
                          {email.subject}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {(email.campaign as any)?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                            {getStatusLabel(email.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                No emails sent yet
              </div>
            )}
          </div>

        </div>
      ) : activeTab === 'campaigns' ? (
        <div className="space-y-6">
          {/* Search and Create Button */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              />
            </div>
            <button
              onClick={processCampaignsManually}
              disabled={processingManually}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Process campaigns manually (for testing)"
            >
              {processingManually ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Process Now
                </>
              )}
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#041d35] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          </div>

          {/* Campaigns List */}
          <CampaignsList
            campaigns={filteredCampaigns}
            loading={loadingCampaigns}
            onEdit={openEditModal}
            onToggle={toggleCampaign}
          />
        </div>
      ) : activeTab === 'emails' ? (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Email or subject..."
                  value={emailFilters.search}
                  onChange={(e) => setEmailFilters({ ...emailFilters, search: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campaign</label>
                <select
                  value={emailFilters.campaign}
                  onChange={(e) => {
                    setEmailFilters({ ...emailFilters, campaign: e.target.value });
                    setEmailPage(1);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                >
                  <option value="">All</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={emailFilters.status}
                  onChange={(e) => {
                    setEmailFilters({ ...emailFilters, status: e.target.value });
                    setEmailPage(1);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                >
                  <option value="">All</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                  <option value="bounced">Bounced</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                <input
                  type="date"
                  value={emailFilters.dateFrom}
                  onChange={(e) => {
                    setEmailFilters({ ...emailFilters, dateFrom: e.target.value });
                    setEmailPage(1);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                <input
                  type="date"
                  value={emailFilters.dateTo}
                  onChange={(e) => {
                    setEmailFilters({ ...emailFilters, dateTo: e.target.value });
                    setEmailPage(1);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Emails Table */}
          {loadingEmails ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-[#05294E]" />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Recipient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Campaign</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sentEmails.map(email => (
                      <tr key={email.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {email.sent_at ? new Date(email.sent_at).toLocaleString('en-US') : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-800">{email.user_name || 'N/A'}</p>
                            <p className="text-sm text-slate-500">{email.email_address}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 max-w-md truncate">
                          {email.subject}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {(email.campaign as any)?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                            {getStatusLabel(email.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sentEmails.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No emails found
                </div>
              )}
              {/* Pagination */}
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => setEmailPage(p => Math.max(1, p - 1))}
                  disabled={emailPage === 1}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">Page {emailPage}</span>
                <button
                  onClick={() => setEmailPage(p => p + 1)}
                  disabled={sentEmails.length < emailsPerPage}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'preferences' ? (
        <div className="space-y-6">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={preferenceSearch}
                onChange={(e) => setPreferenceSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              />
            </div>
          </div>

          {/* Preferences List */}
          {loadingPreferences ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-[#05294E]" />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Last Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Opt-out At</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredPreferences.map(pref => (
                      <tr key={pref.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-800">{pref.user_name || 'N/A'}</p>
                            <p className="text-sm text-slate-500">{pref.user_email || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            pref.email_opt_out
                              ? 'bg-red-50 text-red-700'
                              : 'bg-green-50 text-green-700'
                          }`}>
                            {pref.email_opt_out ? (
                              <>
                                <XCircle className="w-3 h-3" />
                                Opt-out
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {pref.last_email_sent_at
                            ? new Date(pref.last_email_sent_at).toLocaleString('en-US')
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {pref.opt_out_at
                            ? new Date(pref.opt_out_at).toLocaleString('en-US')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                          {pref.opt_out_reason || '-'}
                        </td>
                        <td className="px-6 py-4">
                          {pref.email_opt_out && (
                            <button
                              onClick={() => reactivateUser(pref.user_id)}
                              className="text-sm text-[#05294E] hover:text-[#041d35] font-medium"
                            >
                              Reactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredPreferences.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  {preferenceSearch ? 'No results found' : 'No preferences found'}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchCampaigns();
          fetchStats();
        }}
      />

      {/* Edit Campaign Modal */}
      {isEditModalOpen && editingCampaign && (
        <Dialog open={isEditModalOpen} onClose={closeEditModal} className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-30" onClick={closeEditModal} />
            <Dialog.Panel className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto p-6 z-50 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Edit className="w-6 h-6 text-[#05294E]" />
                  Edit Campaign
                </Dialog.Title>
                <button
                  onClick={closeEditModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Campaign Key (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Campaign Key (read-only)
                  </label>
                  <input
                    type="text"
                    value={editingCampaign.campaign_key}
                    disabled
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    placeholder="Enter campaign name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent resize-none"
                    placeholder="Enter campaign description"
                  />
                </div>

                {/* Email Subject Template */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Subject Template *
                  </label>
                  <input
                    type="text"
                    value={editFormData.email_subject_template}
                    onChange={(e) => setEditFormData({ ...editFormData, email_subject_template: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    placeholder="Enter email subject template"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    You can use placeholders like {'{{full_name}}'}
                  </p>
                </div>

                {/* Email Body Template */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Body Template (HTML) *
                  </label>
                  <textarea
                    value={editFormData.email_body_template}
                    onChange={(e) => setEditFormData({ ...editFormData, email_body_template: e.target.value })}
                    rows={12}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent resize-none font-mono text-sm"
                    placeholder="Enter HTML email body template"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    HTML format. You can use placeholders like {'{{full_name}}'}, {'{{unsubscribe_url}}'}, etc.
                  </p>
                </div>

                {/* Cooldown Days */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cooldown Days *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.cooldown_days}
                    onChange={(e) => setEditFormData({ ...editFormData, cooldown_days: parseInt(e.target.value) || 7 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    placeholder="7"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Number of days before a user can receive this campaign email again
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
                <button
                  onClick={closeEditModal}
                  disabled={savingCampaign}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCampaign}
                  disabled={savingCampaign || !editFormData.name || !editFormData.email_subject_template || !editFormData.email_body_template}
                  className="px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#041d35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingCampaign ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default NewsletterManagement;

