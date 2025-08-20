import { FieldSection } from '../types/profileConfig';

// Configuração centralizada dos campos do perfil
export const profileFieldsConfig: FieldSection[] = [
  {
    title: 'Basic Information',
    icon: 'Building',
    fields: [
      {
        key: 'image_url',
        label: 'University Logo',
        type: 'image',
        placeholder: 'Upload university logo'
      },
      {
        key: 'banner_url',
        label: 'University Banner',
        type: 'image',
        placeholder: 'Upload university banner image for hero section'
      },
      {
        key: 'name',
        label: 'University Name',
        type: 'text',
        required: true,
        placeholder: 'Enter university name'
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Describe your university...'
      },
      {
        key: 'website',
        label: 'Website',
        type: 'url',
        placeholder: 'https://university.edu',
        group: 'location-info'
      },
      {
        key: 'location',
        label: 'Location',
        type: 'text',
        placeholder: 'City, State',
        group: 'location-info'
      }
    ],
    columns: 2
  },
  {
    title: 'Contact Information',
    icon: 'Phone',
    fields: [
      {
        key: 'contact.phone',
        label: 'Phone',
        type: 'tel',
        placeholder: '+1 (555) 123-4567',
        sensitive: true,
        icon: 'Phone',
        group: 'general-contact'
      },
      {
        key: 'contact.email',
        label: 'General Email',
        type: 'email',
        placeholder: 'info@university.edu',
        sensitive: true,
        icon: 'Mail',
        group: 'general-contact'
      },
      {
        key: 'contact.admissionsEmail',
        label: 'Admissions Email',
        type: 'email',
        placeholder: 'admissions@university.edu',
        sensitive: true,
        icon: 'Mail',
        group: 'admissions-contact'
      },
      {
        key: 'contact.fax',
        label: 'Fax',
        type: 'tel',
        placeholder: '+1 (555) 123-4568',
        sensitive: true,
        group: 'admissions-contact'
      }
    ],
    columns: 2
  }
];

// Função para obter valor aninhado usando dot notation
export const getNestedValue = (obj: any, path: string): string => {
  return path.split('.').reduce((current, key) => current?.[key], obj) || '';
};

// Função para definir valor aninhado usando dot notation
export const setNestedValue = (obj: any, path: string, value: string): any => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const nested = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  
  if (lastKey) {
    nested[lastKey] = value;
  }
  
  return obj;
};

// Função para mascarar valores sensíveis
export const maskSensitiveValue = (value: string, type: string): string => {
  if (!value) return 'Not provided';
  
  switch (type) {
    case 'email':
      return value.replace(/(.{2}).*@(.*)/, '$1•••••••••@$2');
    case 'tel':
      return '•••••••••••';
    default:
      return '•••••••••••';
  }
};
