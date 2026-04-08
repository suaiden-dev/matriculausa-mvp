import { useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface LeadData {
  full_name?: string;
  email: string;
  phone?: string;
  source_page: string;
  quiz_answers?: any;
}

export const useLeadCapture = () => {
  // Use a ref to keep track of the email to avoid capturing same data repeatedly
  const lastCapturedEmail = useRef<string | null>(null);

  /**
   * Captures the lead data silently to the database.
   * Only triggers if a valid email is provided.
   */
  const captureLead = useCallback(async (data: LeadData) => {
    // Only capture if we have an email that looks like an email
    if (!data.email || !data.email.includes('@') || !data.email.includes('.')) {
      return;
    }

    try {
      // Call the secure RPC function to safely upsert the lead
      const { error } = await supabase.rpc('capture_lead', {
        p_full_name: data.full_name || null,
        p_email: data.email,
        p_phone: data.phone || null,
        p_source_page: data.source_page,
        p_quiz_answers: data.quiz_answers || null
      });

      if (error) {
        console.error('Silent capture error:', error);
        return;
      }

      lastCapturedEmail.current = data.email;
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
