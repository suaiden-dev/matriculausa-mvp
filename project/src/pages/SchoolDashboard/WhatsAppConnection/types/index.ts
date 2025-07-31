export interface WhatsAppConnection {
  id: string;
  university_id: string;
  ai_configuration_id?: string;
  phone_number: string;
  connection_status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connected_at?: string;
  disconnected_at?: string | null;
  instance_name: string;
  created_at: string;
  updated_at: string;
}

export interface ChatwootPayload {
  user_name: string;
  user_id: string;
  instance_name: string;
  email: string;
  password: string;
  plan: string;
  agents_count: number;
  agent_id?: string;
}

export interface QRCodePayload {
  instance_name: string;
  university_id: string;
  university_name: string;
  user_email: string;
  user_id: string;
  agent_id?: string;
  timestamp: string;
  user_metadata: any;
  university_metadata: any;
}

export interface ValidationResult {
  state: string | null;
  number: string | null;
  inboxPayloads: Array<{
    state: string;
    inbox_id?: string;
    user_id?: string;
  }>;
}