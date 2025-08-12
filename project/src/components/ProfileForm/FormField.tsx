import React, { forwardRef } from 'react';
import { LucideIcon, Phone, Mail, Globe, MapPin, Building, Eye, EyeOff, Camera } from 'lucide-react';
import { FieldConfig } from '../../types/profileConfig';
import { maskSensitiveValue } from '../../config/profileFields';

interface FormFieldProps {
  config: FieldConfig;
  value: string;
  isEditing: boolean;
  showSensitive?: boolean;
  onChange?: (value: string) => void;
  onImageUpload?: (file: File) => void;
  imageUploading?: boolean;
  imageUploadError?: string | null;
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
  ({ config, value, isEditing, showSensitive = false, onChange, onImageUpload, imageUploading = false, imageUploadError }, ref) => {
    const Icon = config.icon ? iconMap[config.icon] : null;

    // Campo de upload de imagem
    if (config.type === 'image') {
      return (
        <div className="col-span-full">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {config.label}
          </label>
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-slate-200">
                {value ? (
                  <img src={value} alt="University Logo" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <Building className="h-8 w-8 text-slate-400" />
                )}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file && onImageUpload) {
                        onImageUpload(file);
                      }
                    };
                    input.click();
                  }}
                  disabled={imageUploading}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#05294E] text-white rounded-lg flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Change university logo"
                >
                  {imageUploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm text-slate-600">
                <p className="font-medium">{config.placeholder}</p>
                <p className="text-xs text-slate-500 mt-1">
                  JPG, PNG, WebP or GIF (max. 5MB)
                </p>
              </div>
              {imageUploadError && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                  {imageUploadError}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

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
