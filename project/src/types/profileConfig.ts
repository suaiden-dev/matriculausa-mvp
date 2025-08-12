// Tipos para configuração de campos do perfil da universidade

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'textarea';
  placeholder?: string;
  required?: boolean;
  icon?: string;
  sensitive?: boolean; // Para campos que devem ser mascarados
  validation?: (value: string) => string | null;
  group?: string; // Para agrupar campos relacionados
}

export interface FieldSection {
  title: string;
  icon?: string;
  fields: FieldConfig[];
  columns?: number; // Para layout responsivo
}

export interface ProfileFormData {
  name: string;
  description: string;
  website: string;
  location: string;
  contact: {
    phone: string;
    email: string;
    admissionsEmail: string;
    fax: string;
  };
  programs: string[];
}
