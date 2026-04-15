import { useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface LeadData {
  full_name?: string;
  email?: string;
  phone?: string;
  source_page: string;
  pre_qualification_answers?: any;
  status?: string;
}

export const useLeadCapture = () => {
  // Use a ref to keep track of the email/phone to avoid capturing same data repeatedly
  const lastCapturedKey = useRef<string | null>(null);

  /**
   * Captures the lead data silently to the database.
   * Triggers if a name and either email or phone is provided.
   */
  const captureLead = useCallback(async (data: LeadData) => {
    // Improved validation: email must have at least one character before @ and at least two after .
    const isValidEmail = data.email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email);
    const phoneDigits = data.phone ? data.phone.replace(/\D/g, '') : '';
    const isValidPhone = phoneDigits.length >= 10;

    // Only capture if we have a name and at least one VALID contact method
    if (!data.full_name || (!isValidEmail && !isValidPhone)) {
      return;
    }

    // Skip if the current data is the same as the last one captured (basic avoidance of duplicates)
    // We include a stringified version of answers and status to detect changes
    const answersKey = data.pre_qualification_answers ? JSON.stringify(data.pre_qualification_answers) : '';
    const captureKey = `${data.full_name}|${data.email || ''}|${data.phone || ''}|${data.status || ''}|${answersKey}`;
    
    if (lastCapturedKey.current === captureKey) {
      return;
    }

    try {
      // Call the secure RPC function to safely upsert the lead
      // Note: We are prepared to send p_status once the SQL function is updated
      const rpcParams: any = {
        p_full_name: data.full_name || null,
        p_email: data.email,
        p_phone: data.phone || null,
        p_source_page: data.source_page,
        p_pre_qualification_answers: data.pre_qualification_answers || null
      };

      // Only add status if provided, to avoid breaking existing RPC before update
      if (data.status) {
        rpcParams.p_status = data.status;
      }

      const { error } = await supabase.rpc('capture_lead', rpcParams);

      if (error) {
        console.error('Silent capture error:', error);
        return;
      }

      lastCapturedKey.current = captureKey;
    } catch (err) {
      console.error('Failed to capture lead:', err);
    }
  }, []);

  /**
   * Marks the lead as converted in the database.
   * Should be called after successful registration or payment.
   */
  const markAsConverted = useCallback(async (email: string) => {
    if (!email) return;

    try {
      const { error } = await supabase.rpc('mark_lead_converted', {
        p_email: email
      });

      if (error) {
        console.error('Mark converted error:', error);
      }
    } catch (err) {
      console.error('Failed to mark lead as converted:', err);
    }
  }, []);

  return { captureLead, markAsConverted };
};
