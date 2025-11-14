import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface StudentRecord {
  student_id: string;
  user_id: string;
  student_name: string;
  student_email: string;
  phone?: string | null;
  country?: string | null;
  field_of_interest?: string | null;
  academic_level?: string | null;
  gpa?: number | null;
  english_proficiency?: string | null;
  status?: string | null;
  avatar_url?: string | null;
  dependents?: number;
  desired_scholarship_range?: number | null;
  student_created_at: string;
  has_paid_selection_process_fee: boolean;
  has_paid_i20_control_fee: boolean;
  selection_process_fee_payment_method?: string | null;
  i20_control_fee_payment_method?: string | null;
  seller_referral_code: string | null;
  application_id: string | null;
  scholarship_id: string | null;
  application_status: string | null;
  applied_at: string | null;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  application_fee_payment_method?: string | null;
  scholarship_fee_payment_method?: string | null;
  acceptance_letter_status: string | null;
  student_process_type: string | null;
  payment_status: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  scholarship_name: string | null;
  scholarship_title?: string | null;
  university_name: string | null;
  total_applications: number;
  university_website?: string | null;
  is_locked: boolean;
  all_applications?: any[];
  admin_notes?: string | null;
}

/**
 * useStudentDetails - Hook for fetching and managing student data
 * Implements progressive loading: critical data first, then secondary data
 */
export const useStudentDetails = (profileId: string | undefined) => {
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSecondaryData, setLoadingSecondaryData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load critical student data
  const loadCriticalData = useCallback(async () => {
    if (!profileId) return;

    try {
      setLoading(true);
      setError(null);

      // Try RPC first for better performance
      let s: any = null;
      let useRpc = true;

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_admin_student_full_details',
          { target_profile_id: profileId }
        );

        if (!rpcError && rpcData) {
          s = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
          if (s && s.id) {
            console.log('✅ [PERFORMANCE] Using consolidated RPC for student data');
          } else {
            console.warn('⚠️ [PERFORMANCE] RPC returned invalid data, using fallback');
            useRpc = false;
            s = null;
          }
        } else {
          console.warn('⚠️ [PERFORMANCE] RPC failed, using fallback:', rpcError);
          useRpc = false;
        }
      } catch (rpcError) {
        console.warn('⚠️ [PERFORMANCE] RPC not available, using fallback:', rpcError);
        useRpc = false;
      }

      // Fallback to original query if RPC fails
      if (!useRpc || !s) {
        const { data, error: queryError } = await supabase
          .from('user_profiles')
          .select(`
            id,
            user_id,
            full_name,
            email,
            phone,
            country,
            field_of_interest,
            academic_level,
            gpa,
            english_proficiency,
            status,
            avatar_url,
            dependents,
            desired_scholarship_range,
            created_at,
            has_paid_selection_process_fee,
            has_paid_i20_control_fee,
            selection_process_fee_payment_method,
            i20_control_fee_payment_method,
            role,
            seller_referral_code,
            admin_notes,
            scholarship_applications (
              id,
              scholarship_id,
              status,
              applied_at,
              is_application_fee_paid,
              is_scholarship_fee_paid,
              application_fee_payment_method,
              scholarship_fee_payment_method,
              acceptance_letter_status,
              acceptance_letter_url,
              acceptance_letter_sent_at,
              acceptance_letter_signed_at,
              acceptance_letter_approved_at,
              transfer_form_url,
              transfer_form_status,
              transfer_form_sent_at,
              student_process_type,
              payment_status,
              reviewed_at,
              reviewed_by,
              documents,
              scholarships (
                title,
                university_id,
                field_of_study,
                annual_value_with_scholarship,
                application_fee_amount,
                universities (
                  name
                )
              )
            )
          `)
          .eq('id', profileId)
          .single();

        if (queryError) throw queryError;
        s = data;
      }

      if (!s) {
        throw new Error('Failed to load student data');
      }

      // Format the student record
      const applications = s.scholarship_applications || [];
      const approvedApp = applications.find((app: any) => app.status === 'approved');
      const mainApp = approvedApp || applications[0] || {};

      const formatted: StudentRecord = {
        student_id: s.id,
        user_id: s.user_id,
        student_name: s.full_name,
        student_email: s.email,
        phone: s.phone,
        country: s.country,
        field_of_interest: s.field_of_interest,
        academic_level: s.academic_level,
        gpa: s.gpa,
        english_proficiency: s.english_proficiency,
        status: s.status,
        avatar_url: s.avatar_url,
        dependents: s.dependents,
        desired_scholarship_range: s.desired_scholarship_range,
        student_created_at: s.created_at,
        has_paid_selection_process_fee: s.has_paid_selection_process_fee,
        has_paid_i20_control_fee: s.has_paid_i20_control_fee,
        selection_process_fee_payment_method: s.selection_process_fee_payment_method,
        i20_control_fee_payment_method: s.i20_control_fee_payment_method,
        seller_referral_code: s.seller_referral_code,
        application_id: mainApp.id || null,
        scholarship_id: mainApp.scholarship_id || null,
        application_status: mainApp.status || null,
        applied_at: mainApp.applied_at || null,
        is_application_fee_paid: mainApp.is_application_fee_paid || false,
        is_scholarship_fee_paid: mainApp.is_scholarship_fee_paid || false,
        application_fee_payment_method: mainApp.application_fee_payment_method || null,
        scholarship_fee_payment_method: mainApp.scholarship_fee_payment_method || null,
        acceptance_letter_status: mainApp.acceptance_letter_status || null,
        student_process_type: mainApp.student_process_type || null,
        payment_status: mainApp.payment_status || null,
        reviewed_at: mainApp.reviewed_at || null,
        reviewed_by: mainApp.reviewed_by || null,
        scholarship_name: mainApp.scholarships?.title || null,
        scholarship_title: mainApp.scholarships?.title || null,
        university_name: mainApp.scholarships?.universities?.name || null,
        total_applications: applications.length,
        is_locked: applications.some((app: any) => app.status === 'approved'),
        all_applications: applications,
        admin_notes: s.admin_notes,
      };

      setStudent(formatted);
    } catch (err: any) {
      console.error('Error loading critical data:', err);
      setError(err.message || 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  // Load data when profileId changes
  useEffect(() => {
    if (profileId) {
      loadCriticalData();
    }
  }, [profileId, loadCriticalData]);

  return {
    student,
    setStudent,
    loading,
    loadingSecondaryData,
    error,
    refetch: loadCriticalData,
  };
};

