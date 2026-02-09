export interface EligibleUser {
  user_id: string;
  email: string;
  full_name: string;
  user_profile_id: string;
  affiliate_code?: string;
}

export interface Campaign {
  id: string;
  campaign_key: string;
  name: string;
  email_subject_template: string;
  email_body_template: string;
  cooldown_days: number;
  send_once?: boolean;
  trigger_conditions?: {
    type?: 'registered_no_payment' | 'paid_no_application' | 'application_flow_stage' | 'all_users';
    days?: number;
    stage?: string;
    stage_status?: string;
  };
}
