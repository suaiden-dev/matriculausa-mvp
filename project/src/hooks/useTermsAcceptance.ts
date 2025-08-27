import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type TermType = 
  | 'terms_of_service'
  | 'privacy_policy'
  | 'affiliate_terms'
  | 'seller_terms'
  | 'checkout_terms'
  | 'university_terms';

interface Term {
  id: string;
  title: string;
  content: string;
  term_type: TermType;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TermAcceptance {
  id: string;
  user_id: string;
  term_id: string;
  term_type: TermType;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export const useTermsAcceptance = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user's IP address and user agent
  const getClientInfo = useCallback(async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return {
        ip_address: data.ip,
        user_agent: navigator.userAgent
      };
    } catch (error) {
      console.warn('Could not get IP address:', error);
      return {
        ip_address: null,
        user_agent: navigator.userAgent
      };
    }
  }, []);

  // Check if user has accepted a specific term type
  const checkTermAcceptance = useCallback(async (termType: TermType): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('check_user_term_acceptance', {
        p_user_id: user.id,
        p_term_type: termType
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking term acceptance:', error);
      return false;
    }
  }, [user]);

  // Get all unaccepted terms for the user
  const getUnacceptedTerms = useCallback(async (): Promise<Term[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_user_unaccepted_terms', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting unaccepted terms:', error);
      return [];
    }
  }, [user]);

  // Record term acceptance
  const recordTermAcceptance = useCallback(async (
    termId: string, 
    termType: TermType
  ): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    setError(null);

    try {
      const clientInfo = await getClientInfo();
      
      const { data, error } = await supabase.rpc('record_term_acceptance', {
        p_user_id: user.id,
        p_term_id: termId,
        p_term_type: termType,
        p_ip_address: clientInfo.ip_address,
        p_user_agent: clientInfo.user_agent
      });

      if (error) throw error;
      
      return data || false;
    } catch (error: any) {
      console.error('Error recording term acceptance:', error);
      setError(error.message || 'Failed to record term acceptance');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, getClientInfo]);

  // Get active terms by type
  const getActiveTermsByType = useCallback(async (termType: TermType): Promise<Term[]> => {
    try {
      const { data, error } = await supabase
        .from('application_terms')
        .select('*')
        .eq('term_type', termType)
        .eq('is_active', true)
        .order('version', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting active terms:', error);
      return [];
    }
  }, []);

  // Get latest active term by type
  const getLatestActiveTerm = useCallback(async (termType: TermType): Promise<Term | null> => {
    const terms = await getActiveTermsByType(termType);
    return terms.length > 0 ? terms[0] : null;
  }, [getActiveTermsByType]);

  // Check if user has accepted all required terms
  const checkAllRequiredTermsAccepted = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Get all active terms
      const { data: activeTerms, error } = await supabase
        .from('application_terms')
        .select('term_type')
        .eq('is_active', true);

      if (error) throw error;

      if (!activeTerms || activeTerms.length === 0) return true;

      // Check if user has accepted all active terms
      for (const term of activeTerms) {
        const hasAccepted = await checkTermAcceptance(term.term_type);
        if (!hasAccepted) return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking all required terms:', error);
      return false;
    }
  }, [user, checkTermAcceptance]);

  // Get user's acceptance history
  const getAcceptanceHistory = useCallback(async (): Promise<TermAcceptance[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('comprehensive_term_acceptance')
        .select(`
          *,
          application_terms (
            title,
            term_type,
            version
          )
        `)
        .eq('user_id', user.id)
        .order('accepted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting acceptance history:', error);
      return [];
    }
  }, [user]);

  return {
    loading,
    error,
    checkTermAcceptance,
    getUnacceptedTerms,
    recordTermAcceptance,
    getActiveTermsByType,
    getLatestActiveTerm,
    checkAllRequiredTermsAccepted,
    getAcceptanceHistory
  };
};
