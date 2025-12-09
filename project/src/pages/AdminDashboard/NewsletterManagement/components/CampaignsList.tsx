import React from 'react';
import {
  CheckCircle,
  XCircle,
  Edit,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Target,
  Mail
} from 'lucide-react';
import { getStageMetadata } from '../../../../utils/applicationFlowStages';

export interface Campaign {
  id: string;
  campaign_key: string;
  name: string;
  description: string | null;
  email_subject_template: string;
  email_body_template: string;
  cooldown_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  trigger_conditions?: {
    type?: string;
    stage?: string;
    days?: number;
  } | null;
}

interface CampaignsListProps {
  campaigns: Campaign[];
  loading: boolean;
  onEdit: (campaign: Campaign) => void;
  onToggle: (campaignId: string, currentStatus: boolean) => void;
}

export const CampaignsList: React.FC<CampaignsListProps> = ({
  campaigns,
  loading,
  onEdit,
  onToggle
}) => {
  const getCampaignType = (campaign: Campaign): { type: string; label: string; icon: any } => {
    const triggerConditions = campaign.trigger_conditions || {};
    
    if (triggerConditions.type === 'application_flow_stage' && triggerConditions.stage) {
      const stageMetadata = getStageMetadata(triggerConditions.stage as any);
      return {
        type: 'application_flow_stage',
        label: stageMetadata?.label || triggerConditions.stage,
        icon: Target
      };
    }
    
    return {
      type: 'traditional',
      label: 'Traditional',
      icon: Mail
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-[#05294E]" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <p className="text-slate-500">No campaigns found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Cooldown</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {campaigns.map(campaign => {
              const campaignType = getCampaignType(campaign);
              const TypeIcon = campaignType.icon;

              return (
                <tr key={campaign.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-800">{campaign.name}</p>
                      {campaign.description && (
                        <p className="text-sm text-slate-500 mt-1">{campaign.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-700">{campaignType.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                      {campaign.campaign_key}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {campaign.cooldown_days} days
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      campaign.is_active
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {campaign.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onEdit(campaign)}
                        className="flex items-center gap-1 text-sm text-[#05294E] hover:text-[#041d35]"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => onToggle(campaign.id, campaign.is_active)}
                        className="flex items-center gap-2 text-sm text-[#05294E] hover:text-[#041d35]"
                      >
                        {campaign.is_active ? (
                          <>
                            <ToggleRight className="w-5 h-5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5" />
                            Activate
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};




