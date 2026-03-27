import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * useAdminStudentActions - Hook for administrative actions on students
 * Handles profile updates, payment marking, document approval/rejection, etc.
 */
export const useAdminStudentActions = () => {
  const [saving, setSaving] = useState(false);

  // Save student profile
  const saveProfile = useCallback(async (profileId: string, updates: any) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', profileId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error('Error saving profile:', err);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, []);

  // Mark fee as paid
  const markFeeAsPaid = useCallback(async (
    userId: string,
    feeType: 'selection_process' | 'application' | 'scholarship' | 'i20_control' | 'placement' | 'ds160_package' | 'i539_cos_package' | 'reinstatement_fee',
    amount: number,
    paymentMethod: string,
    applicationId?: string
  ) => {
    try {
      setSaving(true);

      // Note: recordIndividualFeePayment is now called in the component before this hook
      // to have access to all necessary data (paymentDate, etc.)

      // Update the appropriate fee status
      if (feeType === 'selection_process' || feeType === 'i20_control' || feeType === 'ds160_package' || feeType === 'i539_cos_package' || feeType === 'reinstatement_fee') {
        let fieldName: string;
        let methodField: string;

        if (feeType === 'selection_process') {
          fieldName = 'has_paid_selection_process_fee';
          methodField = 'selection_process_fee_payment_method';
        } else if (feeType === 'i20_control') {
          fieldName = 'has_paid_i20_control_fee';
          methodField = 'i20_control_fee_payment_method';
        } else if (feeType === 'ds160_package') {
          fieldName = 'has_paid_ds160_package';
          methodField = 'ds160_package_payment_method';
        } else if (feeType === 'reinstatement_fee') {
          fieldName = 'has_paid_reinstatement_package';
          methodField = 'reinstatement_package_payment_method';
        } else {
          fieldName = 'has_paid_i539_cos_package';
          methodField = 'i539_cos_package_payment_method';
        }

        const { error } = await supabase
          .from('user_profiles')
          .update({
            [fieldName]: true,
            [methodField]: paymentMethod
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else if (applicationId) {
        // Application, scholarship or placement fee
        let fieldName: string | undefined;
        let methodField: string | undefined;
        
        if (feeType === 'application') {
          fieldName = 'is_application_fee_paid';
          methodField = 'application_fee_payment_method';
        } else if (feeType === 'scholarship') {
          fieldName = 'is_scholarship_fee_paid';
          methodField = 'scholarship_fee_payment_method';
        } else if (feeType === 'placement') {
          fieldName = 'is_placement_fee_paid';
          methodField = 'placement_fee_payment_method';
        } else {
          throw new Error('Invalid feeType for application context');
        }

        const { error } = await supabase
          .from('scholarship_applications')
          .update({
            [fieldName]: true,
            [methodField]: paymentMethod
          })
          .eq('id', applicationId);

        if (error) throw error;

        // Extra: Update placement flow payment tracking globally (if needed) but usually UI queries via applications table
        if (feeType === 'placement') {
          // Também marcar no user_profile como fallback se o projeto usar
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ 
               is_placement_fee_paid: true 
            })
            .eq('user_id', userId);
        }

      } else {
        // Se é application, scholarship, ou placement fee mas não tem applicationId, retornar erro
        if (feeType === 'application' || feeType === 'scholarship' || feeType === 'placement') {
          throw new Error('Application ID is required for application, scholarship and placement fees');
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error marking fee as paid:', err);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, []);

  // Approve document
  const approveDocument = useCallback(async (applicationId: string, docType: string) => {
    try {
      setSaving(true);

      const { data: app, error: fetchError } = await supabase
        .from('scholarship_applications')
        .select('documents')
        .eq('id', applicationId)
        .single();

      if (fetchError) throw fetchError;

      const documents = app.documents || [];
      const updatedDocuments = documents.map((doc: any) => {
        if (doc.type === docType) {
          return {
            ...doc,
            status: 'approved',
            approved_at: new Date().toISOString()
          };
        }
        return doc;
      });

      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ documents: updatedDocuments })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err: any) {
      console.error('Error approving document:', err);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, []);

  // Reject document
  const rejectDocument = useCallback(async (applicationId: string, docType: string, reason: string) => {
    try {
      setSaving(true);

      const { data: app, error: fetchError } = await supabase
        .from('scholarship_applications')
        .select('documents')
        .eq('id', applicationId)
        .single();

      if (fetchError) throw fetchError;

      const documents = app.documents || [];
      const updatedDocuments = documents.map((doc: any) => {
        if (doc.type === docType) {
          return {
            ...doc,
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejection_reason: reason
          };
        }
        return doc;
      });

      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ documents: updatedDocuments })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err: any) {
      console.error('Error rejecting document:', err);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, []);

  // Update payment method
  const updatePaymentMethod = useCallback(async (
    userId: string,
    feeType: 'selection_process' | 'i20_control' | 'ds160_package' | 'i539_cos_package' | 'reinstatement_fee',
    method: string
  ) => {
    try {
      setSaving(true);

      let fieldName: string;
      if (feeType === 'selection_process') {
        fieldName = 'selection_process_fee_payment_method';
      } else if (feeType === 'i20_control') {
        fieldName = 'i20_control_fee_payment_method';
      } else if (feeType === 'ds160_package') {
        fieldName = 'ds160_package_payment_method';
      } else if (feeType === 'reinstatement_fee') {
        fieldName = 'reinstatement_package_payment_method';
      } else {
        fieldName = 'i539_cos_package_payment_method';
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ [fieldName]: method })
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      console.error('Error updating payment method:', err);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    saving,
    saveProfile,
    markFeeAsPaid,
    approveDocument,
    rejectDocument,
    updatePaymentMethod,
  };
};

