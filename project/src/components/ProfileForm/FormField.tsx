import React, { forwardRef } from 'react';
import { LucideIcon, Phone, Mail, Globe, MapPin, Building, Eye, EyeOff } from 'lucide-react';
import { FieldConfig } from '../../types/profileConfig';
import { maskSensitiveValue } from '../../config/profileFields';

interface FormFieldProps {
  config: FieldConfig;
  value: string;
  isEditing: boolean;
  showSensitive?: boolean;
  onChange?: (value: string) => void;
}

// Mapeamento de ícones
const iconMap: Record<string, LucideIcon> = {
  Phone,
  Mail,
  Globe,
  MapPin,
  Building
};

const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(
  ({ config, value, isEditing, showSensitive = false, onChange }, ref) => {
    const Icon = config.icon ? iconMap[config.icon] : null;

    if (isEditing) {
      const commonProps = {
        defaultValue: value,
        onChange: onChange ? (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value) : undefined,
        className: "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200",
        placeholder: config.placeholder
      };

      return (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {config.label}
            {config.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {config.type === 'textarea' ? (
            <textarea
              ref={ref as React.RefObject<HTMLTextAreaElement>}
              rows={4}
              {...commonProps}
            />
          ) : (
            <input
              ref={ref as React.RefObject<HTMLInputElement>}
              type={config.type}
              {...commonProps}
            />
          )}
        </div>
      );
    }

    // Modo de visualização
    const displayValue = config.sensitive && !showSensitive 
      ? maskSensitiveValue(value, config.type)
      : value || 'Not provided';

    // Debug para ver o valor recebido
    if (config.key === 'location') {
      console.log('Location field - value:', value, 'displayValue:', displayValue);
    }

    return (
      <div>
        <label className="text-sm font-medium text-slate-500 flex items-center">
          {Icon && <Icon className="h-4 w-4 mr-2" />}
          {config.label}
        </label>
        {config.type === 'url' && value ? (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[#05294E] hover:underline flex items-center mt-1"
          >
            {value}
            <Globe className="h-4 w-4 ml-2" />
          </a>
        ) : (
          <p className={`mt-1 ${!value ? 'text-slate-400' : 'text-slate-900'}`}>
            {displayValue}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

export default FormField;
