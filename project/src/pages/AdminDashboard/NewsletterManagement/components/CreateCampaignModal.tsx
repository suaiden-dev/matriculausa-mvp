import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Plus, X, RefreshCw, CheckCircle, Users, Target, Clock, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabase';
import { ApplicationFlowStageSelector } from './ApplicationFlowStageSelector';
import { CampaignFormFields, CampaignFormData } from './CampaignFormFields';
import { ApplicationFlowStageKey } from '../../../../utils/applicationFlowStages';

type CampaignType = 'application_flow_stage' | 'all_users' | 'registered_no_payment' | 'paid_no_application';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [campaignType, setCampaignType] = useState<CampaignType>('application_flow_stage');
  const [selectedStage, setSelectedStage] = useState<ApplicationFlowStageKey | null>(null);
  const [stageStatus, setStageStatus] = useState<string>(''); // Campo opcional para application_flow_stage
  const [daysSinceTrigger, setDaysSinceTrigger] = useState<number>(2); // Campo para registered_no_payment e paid_no_application
  const [isActive, setIsActive] = useState<boolean>(true); // Campo is_active
  const [sendOnce, setSendOnce] = useState<boolean>(false); // Campo send_once - enviar apenas uma vez
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    email_subject_template: '',
    email_body_template: '',
    cooldown_days: 7
  });
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    // Reset form
    setCampaignType('application_flow_stage');
    setSelectedStage(null);
    setStageStatus('');
    setDaysSinceTrigger(2);
    setIsActive(true);
    setSendOnce(false);
    setFormData({
      name: '',
      description: '',
      email_subject_template: '',
      email_body_template: '',
      cooldown_days: 7
    });
    onClose();
  };

  const generateCampaignKey = (): string => {
    if (campaignType === 'all_users') {
      return `all_users_${Date.now()}`;
    }
    if (campaignType === 'registered_no_payment') {
      return `registered_no_payment_${daysSinceTrigger}d`;
    }
    if (campaignType === 'paid_no_application') {
      return `paid_no_application_${daysSinceTrigger}d`;
    }
    if (selectedStage) {
      return `app_flow_stage_${selectedStage}`;
    }
    return `campaign_${Date.now()}`;
  };

  const validateForm = (): boolean => {
    if (campaignType === 'application_flow_stage' && !selectedStage) {
      toast.error('Please select an application flow stage');
      return false;
    }

    if ((campaignType === 'registered_no_payment' || campaignType === 'paid_no_application') && daysSinceTrigger < 0) {
      toast.error('Days since trigger cannot be negative');
      return false;
    }

    if (!formData.name.trim()) {
      toast.error('Campaign name is required');
      return false;
    }

    if (!formData.email_subject_template.trim()) {
      toast.error('Email subject template is required');
      return false;
    }

    if (!formData.email_body_template.trim()) {
      toast.error('Email body template is required');
      return false;
    }

    if (formData.cooldown_days < 0) {
      toast.error('Cooldown days cannot be negative');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const campaignKey = generateCampaignKey();

      // Construir trigger_conditions baseado no tipo de campanha
      const triggerConditions = campaignType === 'all_users' 
        ? {
            type: 'all_users' as const
          }
        : campaignType === 'registered_no_payment'
        ? {
            type: 'registered_no_payment' as const,
            days: daysSinceTrigger
          }
        : campaignType === 'paid_no_application'
        ? {
            type: 'paid_no_application' as const,
            days: daysSinceTrigger
          }
        : {
            type: 'application_flow_stage' as const,
            stage: selectedStage!,
            ...(stageStatus && { stage_status: stageStatus })
          };

      const { error } = await supabase
        .from('newsletter_campaigns')
        .insert({
          campaign_key: campaignKey,
          name: formData.name,
          description: formData.description || null,
          email_subject_template: formData.email_subject_template,
          email_body_template: formData.email_body_template,
          cooldown_days: formData.cooldown_days,
          trigger_conditions: triggerConditions,
          is_active: isActive,
          send_once: sendOnce
        });

      if (error) throw error;

      toast.success('Campaign created successfully');
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Error creating campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={handleClose} />
        <Dialog.Panel className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto p-6 z-50 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-6 h-6 text-[#05294E]" />
              Create New Campaign
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Campaign Type Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Campaign Type *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCampaignType('application_flow_stage');
                    setSelectedStage(null);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    campaignType === 'application_flow_stage'
                      ? 'border-[#05294E] bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        campaignType === 'application_flow_stage'
                          ? 'bg-[#05294E] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Target className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900">Targeted Campaign</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        Send to users in a specific application flow stage
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCampaignType('all_users');
                    setSelectedStage(null);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    campaignType === 'all_users'
                      ? 'border-[#05294E] bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        campaignType === 'all_users'
                          ? 'bg-[#05294E] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900">Broadcast Campaign</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        Send to all users (respects rate limits and cooldowns)
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCampaignType('registered_no_payment');
                    setSelectedStage(null);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    campaignType === 'registered_no_payment'
                      ? 'border-[#05294E] bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        campaignType === 'registered_no_payment'
                          ? 'bg-[#05294E] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900">Registered Without Payment</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        Send to users who registered but haven't paid yet
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCampaignType('paid_no_application');
                    setSelectedStage(null);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    campaignType === 'paid_no_application'
                      ? 'border-[#05294E] bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        campaignType === 'paid_no_application'
                          ? 'bg-[#05294E] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900">Paid Without Application</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        Send to users who paid but haven't applied yet
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Application Flow Stage Selector - Only show for targeted campaigns */}
            {campaignType === 'application_flow_stage' && (
              <>
                <ApplicationFlowStageSelector
                  selectedStage={selectedStage}
                  onStageSelect={setSelectedStage}
                  excludeStages={['transfer_form']}
                />
                
                {/* Stage Status (Optional) */}
                {selectedStage && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Stage Status (Optional)
                    </label>
                    <select
                      value={stageStatus}
                      onChange={(e) => setStageStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    >
                      <option value="">Any Status (Default)</option>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                      <option value="skipped">Skipped</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Filter by specific stage status. Leave empty to target any status in this stage.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Days Since Trigger - Only show for registered_no_payment and paid_no_application */}
            {(campaignType === 'registered_no_payment' || campaignType === 'paid_no_application') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Days Since {campaignType === 'registered_no_payment' ? 'Registration' : 'Payment'} *
                </label>
                <input
                  type="number"
                  min="0"
                  value={daysSinceTrigger}
                  onChange={(e) => setDaysSinceTrigger(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                  placeholder="2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Minimum number of days since {campaignType === 'registered_no_payment' ? 'registration' : 'payment'} before sending this campaign. Use 0 to send immediately.
                </p>
              </div>
            )}

            {/* Form Fields */}
            <CampaignFormFields
              formData={formData}
              onChange={setFormData}
            />

            {/* Is Active Toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-[#05294E] border-gray-300 rounded focus:ring-[#05294E]"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">Active Campaign</span>
                  <p className="text-xs text-slate-500 mt-1">
                    Only active campaigns will be processed and sent to users
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                saving || 
                (campaignType === 'application_flow_stage' && !selectedStage) || 
                ((campaignType === 'registered_no_payment' || campaignType === 'paid_no_application') && daysSinceTrigger < 0) ||
                !formData.name || 
                !formData.email_subject_template || 
                !formData.email_body_template
              }
              className="px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#041d35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create Campaign
                </>
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

