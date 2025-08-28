import React from 'react';
import { LucideIcon, Edit, Eye, EyeOff, Building, Phone, Mail, Globe, MapPin } from 'lucide-react';
import { FieldSection, ProfileFormData } from '../../types/profileConfig';
import { getNestedValue } from '../../config/profileFields';
import FormField from './FormField';

interface FormSectionProps {
  config: FieldSection;
  data: ProfileFormData;
  isEditing: boolean;
  showSensitive?: boolean;
  onEdit?: () => void;
  onToggleSensitive?: () => void;
  onFieldChange?: (key: string, value: string) => void;
  getFieldRef?: (key: string) => React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  onImageUpload?: (file: File, type?: 'logo' | 'banner') => void;
  imageUploading?: boolean;
  imageUploadError?: string | null;
}

// Mapeamento de ícones para seções
const sectionIconMap: Record<string, LucideIcon> = {
  Building,
  Phone,
  Mail,
  Globe,
  MapPin
};

const FormSection: React.FC<FormSectionProps> = ({
  config,
  data,
  isEditing,
  showSensitive = false,
  onEdit,
  onToggleSensitive,
  onFieldChange,
  getFieldRef,
  onImageUpload,
  imageUploading = false,
  imageUploadError
}) => {
  const SectionIcon = config.icon ? sectionIconMap[config.icon] : null;
  
  // Agrupar campos por grupo
  const groupedFields = config.fields.reduce((groups, field) => {
    const group = field.group || 'default';
    if (!groups[group]) groups[group] = [];
    groups[group].push(field);
    return groups;
  }, {} as Record<string, typeof config.fields>);

  // Verificar se a seção tem campos sensíveis
  const hasSensitiveFields = config.fields.some(field => field.sensitive);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900 flex items-center">
          {SectionIcon && <SectionIcon className="h-5 w-5 mr-3" />}
          {config.title}
        </h3>
        <div className="flex items-center gap-3">
          {/* Botão para mostrar/ocultar informações sensíveis */}
          {!isEditing && hasSensitiveFields && onToggleSensitive && (
            <button
              onClick={onToggleSensitive}
              className="text-slate-500 hover:text-slate-700 flex items-center text-sm"
            >
              {showSensitive ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show
                </>
              )}
            </button>
          )}
          
          {/* Botão de edição */}
          {/* {!isEditing && onEdit && (
            <button
              onClick={onEdit}
              className="text-[#05294E] hover:text-[#05294E]/80 font-medium text-sm flex items-center"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
          )} */}
        </div>
      </div>

      {/* Renderizar campos agrupados */}
      <div className="space-y-6">
        {Object.entries(groupedFields).map(([groupKey, fields]) => (
          <div key={groupKey}>
            {/* Layout responsivo baseado na configuração de colunas */}
            <div className={`${
              config.columns === 2 && fields.length > 1 
                ? 'grid grid-cols-1 md:grid-cols-2 gap-6' 
                : 'space-y-6'
            }`}>
              {fields.map((field) => {
                const fieldValue = getNestedValue(data, field.key);
                const fieldRef = getFieldRef ? getFieldRef(field.key) : undefined;
                
                return (
                  <FormField
                    key={field.key}
                    config={field}
                    value={fieldValue}
                    isEditing={isEditing}
                    showSensitive={showSensitive}
                    onChange={onFieldChange ? (value) => onFieldChange(field.key, value) : undefined}
                    onImageUpload={onImageUpload}
                    imageUploading={imageUploading}
                    imageUploadError={imageUploadError}
                    ref={fieldRef}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FormSection;
