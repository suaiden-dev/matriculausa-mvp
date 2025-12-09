import React from 'react';

export interface CampaignFormData {
  name: string;
  description: string;
  email_subject_template: string;
  email_body_template: string;
  cooldown_days: number;
}

interface CampaignFormFieldsProps {
  formData: CampaignFormData;
  onChange: (data: CampaignFormData) => void;
  showCampaignKey?: boolean;
  campaignKey?: string;
}

export const CampaignFormFields: React.FC<CampaignFormFieldsProps> = ({
  formData,
  onChange,
  showCampaignKey = false,
  campaignKey = ''
}) => {
  const handleChange = (field: keyof CampaignFormData, value: string | number) => {
    onChange({
      ...formData,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      {/* Campaign Key (read-only) */}
      {showCampaignKey && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Campaign Key (read-only)
          </label>
          <input
            type="text"
            value={campaignKey}
            disabled
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
          />
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Campaign Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
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
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
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
          value={formData.email_subject_template}
          onChange={(e) => handleChange('email_subject_template', e.target.value)}
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
          value={formData.email_body_template}
          onChange={(e) => handleChange('email_body_template', e.target.value)}
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
          min="0"
          value={formData.cooldown_days}
          onChange={(e) => handleChange('cooldown_days', parseInt(e.target.value) || 0)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
          placeholder="7"
        />
        <p className="text-xs text-slate-500 mt-1">
          Number of days before a user can receive this campaign email again. Use 0 for testing (no cooldown).
        </p>
      </div>
    </div>
  );
};



