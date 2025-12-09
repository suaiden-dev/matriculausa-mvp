import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Plus, X, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabase';
import { ApplicationFlowStageSelector } from './ApplicationFlowStageSelector';
import { CampaignFormFields, CampaignFormData } from './CampaignFormFields';
import { ApplicationFlowStageKey } from '../../../../utils/applicationFlowStages';

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
  const [selectedStage, setSelectedStage] = useState<ApplicationFlowStageKey | null>(null);
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
    setSelectedStage(null);
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
    if (selectedStage) {
      return `app_flow_stage_${selectedStage}`;
    }
    return `campaign_${Date.now()}`;
  };

  const validateForm = (): boolean => {
    if (!selectedStage) {
      toast.error('Please select an application flow stage');
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

      // Construir trigger_conditions para application flow stage
      const triggerConditions = {
        type: 'application_flow_stage',
        stage: selectedStage
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
          is_active: true
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
            {/* Application Flow Stage Selector */}
            <ApplicationFlowStageSelector
              selectedStage={selectedStage}
              onStageSelect={setSelectedStage}
              excludeStages={['transfer_form']}
            />

            {/* Form Fields */}
            <CampaignFormFields
              formData={formData}
              onChange={setFormData}
            />
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
              disabled={saving || !selectedStage || !formData.name || !formData.email_subject_template || !formData.email_body_template}
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

