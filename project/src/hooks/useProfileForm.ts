import { useState, useRef, useCallback, useEffect } from 'react';
import { ProfileFormData } from '../types/profileConfig';
import { profileFieldsConfig, getNestedValue, setNestedValue } from '../config/profileFields';
import { supabase } from '../lib/supabase';

interface UseProfileFormProps {
  university: any;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useProfileForm = ({ university, onSuccess, onError }: UseProfileFormProps) => {
  // Estados
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);

  // Inicializar dados do formulário
  const initializeFormData = useCallback((): ProfileFormData => ({
    name: university?.name || '',
    description: university?.description || '',
    website: university?.website || '',
    location: university?.location || '',
    image_url: university?.image_url || '',
    banner_url: university?.banner_url || '',
    contact: {
      phone: university?.contact?.phone || '',
      email: university?.contact?.email || '',
      admissionsEmail: university?.contact?.admissionsEmail || '',
      fax: university?.contact?.fax || ''
    },
    programs: university?.programs || [],
    university_fees_page_url: university?.university_fees_page_url || ''
  }), [university]);

  const [formData, setFormData] = useState<ProfileFormData>(initializeFormData());

  // Sincronizar dados quando university muda
  useEffect(() => {
    if (university) {
      setFormData(initializeFormData());
    }
  }, [university, initializeFormData]);

  // Criar refs dinamicamente para todos os campos
  const fieldRefs = useRef<Record<string, React.RefObject<HTMLInputElement | HTMLTextAreaElement>>>({});
  
  const getFieldRef = useCallback((fieldKey: string) => {
    if (!fieldRefs.current[fieldKey]) {
      fieldRefs.current[fieldKey] = { current: null };
    }
    return fieldRefs.current[fieldKey];
  }, []);

  // Resetar dados do formulário
  const resetFormData = useCallback(() => {
    setFormData(initializeFormData());
  }, [initializeFormData]);

  // Verificar se há alterações
  const hasChanges = useCallback(() => {
    const current = formData;
    const original = initializeFormData();
    
    return JSON.stringify(current) !== JSON.stringify(original);
  }, [formData, initializeFormData]);

  // Obter valores atuais dos inputs
  const getCurrentFormData = useCallback((): ProfileFormData => {
    const currentData = { ...formData };
    
    // Obter valores dos campos configurados
    profileFieldsConfig.forEach(section => {
      section.fields.forEach(field => {
        const ref = fieldRefs.current[field.key];
        if (ref?.current) {
          const value = ref.current.value || '';
          setNestedValue(currentData, field.key, value);
        }
      });
    });
    
    return currentData;
  }, [formData]);

  // Validar formulário
  const validateForm = useCallback((data: ProfileFormData): string | null => {
    if (!data.name.trim()) {
      return 'University name is required';
    }
    return null;
  }, []);

  // Salvar alterações
  const handleSave = useCallback(async () => {
    if (!university) return;

    const currentData = getCurrentFormData();
    const validationError = validateForm(currentData);
    
    if (validationError) {
      onError?.(validationError);
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        name: currentData.name.trim(),
        description: currentData.description.trim() || null,
        website: currentData.website.trim() || null,
        location: currentData.location.trim() || null,
        contact: currentData.contact,
        programs: currentData.programs,
        university_fees_page_url: currentData.university_fees_page_url?.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('universities')
        .update(updateData)
        .eq('id', university.id);

      if (error) throw error;

      setFormData(currentData);
      setIsEditing(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('Error updating profile:', error);
      onError?.('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [university, getCurrentFormData, validateForm, onSuccess, onError]);

  // Cancelar edição
  const handleCancel = useCallback(() => {
    if (isEditing && hasChanges()) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      );
      if (!confirmDiscard) return;
    }

    resetFormData();
    setIsEditing(false);
  }, [isEditing, hasChanges, resetFormData]);

  // Atualizar campo específico
  const updateField = useCallback((fieldKey: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev };
      
      // Tratamento especial para arrays (como programs)
      if (fieldKey === 'programs') {
        try {
          updated.programs = JSON.parse(value);
        } catch {
          updated.programs = [];
        }
      } else {
        setNestedValue(updated, fieldKey, value);
      }
      
      return updated;
    });
  }, []);

  // Atualizar imagem diretamente
  const updateImage = useCallback((imageUrl: string, field: 'image_url' | 'banner_url' = 'image_url') => {
    setFormData(prev => ({
      ...prev,
      [field]: imageUrl
    }));
  }, []);

  return {
    // Estados
    formData,
    isEditing,
    saving,
    showSensitiveInfo,
    
    // Ações
    setIsEditing,
    setShowSensitiveInfo,
    handleSave,
    handleCancel,
    updateField,
    updateImage,
    resetFormData,
    
    // Utilidades
    getFieldRef,
    hasChanges,
    getCurrentFormData
  };
};
