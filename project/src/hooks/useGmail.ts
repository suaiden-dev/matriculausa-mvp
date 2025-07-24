import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { useGmailConnection } from './useGmailConnection';
import { Email } from '../types';

interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

interface UseGmailReturn {
  emails: Email[];
  loading: boolean;
  error: string | null;
  sendEmail: (request: SendEmailRequest) => Promise<{ success: boolean; messageId?: string; error?: string }>;
  fetchEmails: (options?: { maxResults?: number; labelIds?: string[]; query?: string; pageToken?: string }) => Promise<void>;
  loadMoreEmails: () => Promise<void>;
  clearError: () => void;
  clearEmails: () => void;
  isConnected: boolean;
  hasMoreEmails: boolean;
  nextPageToken?: string;
}

export const useGmail = (): UseGmailReturn => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [hasMoreEmails, setHasMoreEmails] = useState(true);
  const { activeConnection, checkConnections } = useGmailConnection();

  // Log quando activeConnection muda
  useEffect(() => {
    console.log('🔄 useGmail: activeConnection changed to:', activeConnection?.email);
    
    // Se a conexão mudou, limpar emails para evitar mostrar emails da conta anterior
    if (activeConnection) {
      console.log('🔄 useGmail: Clearing emails for new connection:', activeConnection.email);
      setEmails([]);
      setNextPageToken(undefined);
      setHasMoreEmails(true);
    }
  }, [activeConnection?.email]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearEmails = useCallback(() => {
    setEmails([]);
    setNextPageToken(undefined);
    setHasMoreEmails(true);
  }, []);

  // Verificar conexões ao inicializar
  useEffect(() => {
    checkConnections();
  }, [checkConnections]);

  const fetchEmails = useCallback(async (options: { maxResults?: number; labelIds?: string[]; query?: string; pageToken?: string } = {}) => {
    if (!activeConnection) {
      setError('Gmail not connected. Please connect your Gmail account first.');
      return;
    }

    console.log('📧 Fetching emails for account:', activeConnection.email);

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${config.getSupabaseUrl()}/functions/v1/get-gmail-inbox?email=${encodeURIComponent(activeConnection.email)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          maxResults: options.maxResults || 50, // Aumentado para 50 emails por padrão
          labelIds: options.labelIds || ['INBOX'],
          query: options.query || '',
          pageToken: options.pageToken || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch emails');
      }

      if (result.success) {
        if (options.pageToken) {
          // Carregar mais emails (append)
          setEmails(prev => [...prev, ...result.emails]);
        } else {
          // Primeira carga (replace)
          setEmails(result.emails);
        }
        
        setNextPageToken(result.nextPageToken);
        setHasMoreEmails(!!result.nextPageToken);
      } else {
        throw new Error('Failed to fetch emails');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching emails');
      console.error('Error fetching emails:', err);
    } finally {
      setLoading(false);
    }
  }, [activeConnection?.email]); // Mudança crucial: usar activeConnection.email em vez de activeConnection

  const loadMoreEmails = useCallback(async () => {
    if (nextPageToken && hasMoreEmails && !loading) {
      await fetchEmails({ pageToken: nextPageToken });
    }
  }, [nextPageToken, hasMoreEmails, loading, fetchEmails]);

  const sendEmail = useCallback(async (request: SendEmailRequest): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    if (!activeConnection) {
      const errorMessage = 'Gmail not connected. Please connect your Gmail account first.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${config.getSupabaseUrl()}/functions/v1/send-gmail-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          to: request.to,
          subject: request.subject,
          body: request.htmlBody || request.body,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      if (result.success) {
        return { success: true, messageId: result.messageId };
      } else {
        throw new Error('Failed to send email');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while sending email';
      setError(errorMessage);
      console.error('Error sending email:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [activeConnection]);

  return {
    emails,
    loading,
    error,
    sendEmail,
    fetchEmails,
    loadMoreEmails,
    clearError,
    clearEmails,
    isConnected: !!activeConnection,
    hasMoreEmails,
    nextPageToken,
  };
}; 