import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { recordIndividualFeePayment } from '../lib/paymentRecorder';

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
    feeType: 'selection_process' | 'application' | 'scholarship' | 'i20_control',
    amount: number,
    paymentMethod: string,
    applicationId?: string
  ) => {
    try {
      setSaving(true);

      // Record the payment
      await recordIndividualFeePayment(userId, feeType, amount);

      // Update the appropriate fee status
      if (feeType === 'selection_process' || feeType === 'i20_control') {
        const fieldName = feeType === 'selection_process' 
          ? 'has_paid_selection_process_fee'
          : 'has_paid_i20_control_fee';
        const methodField = feeType === 'selection_process'
          ? 'selection_process_fee_payment_method'
          : 'i20_control_fee_payment_method';

        const { error } = await supabase
          .from('user_profiles')
          .update({
            [fieldName]: true,
            [methodField]: paymentMethod
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else if (applicationId) {
        // Application or scholarship fee
        const fieldName = feeType === 'application' 
          ? 'is_application_fee_paid'
          : 'is_scholarship_fee_paid';
        const methodField = feeType === 'application'
          ? 'application_fee_payment_method'
          : 'scholarship_fee_payment_method';

        const { error } = await supabase
          .from('scholarship_applications')
          .update({
            [fieldName]: true,
            [methodField]: paymentMethod
          })
          .eq('id', applicationId);

        if (error) throw error;
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
    feeType: 'selection_process' | 'i20_control',
    method: string
  ) => {
    try {
      setSaving(true);

      const fieldName = feeType === 'selection_process'
        ? 'selection_process_fee_payment_method'
        : 'i20_control_fee_payment_method';

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

