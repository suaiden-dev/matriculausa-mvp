import { supabase } from '../lib/supabase';

/**
 * Email service for client-side operations using Supabase Edge Functions
 */
export class EmailServiceClient {
  
  /**
   * Get user email configurations
   */
  async getConfigurations() {
    const { data, error } = await supabase
      .from('email_configurations')
      .select(`
        id,
        name,
        email_address,
        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_auth_user,
        imap_host,
        imap_port,
        imap_secure,
        imap_auth_user,
        is_active,
        sync_enabled,
        sync_interval_minutes,
        last_sync_at,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Create new email configuration
   */
  async createConfiguration(configData) {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Encrypt passwords
    const encryptedData = {
      ...configData,
      user_id: user.id, // Add user_id
      smtp_auth_pass: this.encryptData(configData.smtp_auth_pass),
      imap_auth_pass: this.encryptData(configData.imap_auth_pass)
    };

    const { data, error } = await supabase
      .from('email_configurations')
      .insert(encryptedData)
      .select(`
        id,
        name,
        email_address,
        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_auth_user,
        imap_host,
        imap_port,
        imap_secure,
        imap_auth_user,
        is_active,
        sync_enabled,
        sync_interval_minutes,
        created_at
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update email configuration
   */
  async updateConfiguration(id, updateData) {
    // Encrypt passwords if provided
    if (updateData.smtp_auth_pass) {
      updateData.smtp_auth_pass = this.encryptData(updateData.smtp_auth_pass);
    }
    if (updateData.imap_auth_pass) {
      updateData.imap_auth_pass = this.encryptData(updateData.imap_auth_pass);
    }

    const { data, error } = await supabase
      .from('email_configurations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete email configuration
   */
  async deleteConfiguration(id) {
    const { error } = await supabase
      .from('email_configurations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  /**
   * Test email configuration
   */
  async testConfiguration(config) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No authentication session');
    }

    const response = await supabase.functions.invoke('email-test-config', {
      body: config,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (response.error) throw response.error;
    return response.data;
  }

  /**
   * Send email
   */
  async sendEmail(emailData) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No authentication session');
    }

    const response = await supabase.functions.invoke('email-send', {
      body: emailData,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (response.error) throw response.error;
    return response.data;
  }

  /**
   * Manually sync emails for a configuration
   */
  async syncEmails(configId) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No authentication session');
    }

    const response = await supabase.functions.invoke('email-sync', {
      body: { config_id: configId },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (response.error) throw response.error;
    return response.data;
  }

  /**
   * Get received emails
   */
  async getReceivedEmails({ configId, page = 1, limit = 50, unreadOnly = false }) {
    let query = supabase
      .from('received_emails')
      .select(`
        *,
        email_configurations!inner(
          id,
          name,
          email_address
        )
      `)
      .eq('is_deleted', false)
      .order('received_date', { ascending: false });

    if (configId) {
      query = query.eq('email_config_id', configId);
    }

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  /**
   * Get sent emails
   */
  async getSentEmails({ configId, page = 1, limit = 50 }) {
    let query = supabase
      .from('sent_emails')
      .select(`
        *,
        email_configurations!inner(
          id,
          name,
          email_address
        )
      `)
      .order('created_at', { ascending: false });

    if (configId) {
      query = query.eq('email_config_id', configId);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  /**
   * Mark email as read/unread
   */
  async markEmailAsRead(emailId, isRead = true) {
    const { data, error } = await supabase
      .from('received_emails')
      .update({ is_read: isRead })
      .eq('id', emailId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get email statistics
   */
  async getEmailStats(configId = null) {
    // Get received emails count
    let receivedQuery = supabase
      .from('received_emails')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    if (configId) {
      receivedQuery = receivedQuery.eq('email_config_id', configId);
    }

    const { count: totalReceived } = await receivedQuery;

    // Get unread emails count
    let unreadQuery = supabase
      .from('received_emails')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .eq('is_read', false);

    if (configId) {
      unreadQuery = unreadQuery.eq('email_config_id', configId);
    }

    const { count: unreadCount } = await unreadQuery;

    // Get sent emails count
    let sentQuery = supabase
      .from('sent_emails')
      .select('*', { count: 'exact', head: true });

    if (configId) {
      sentQuery = sentQuery.eq('email_config_id', configId);
    }

    const { count: totalSent } = await sentQuery;

    return {
      total_received: totalReceived || 0,
      unread_count: unreadCount || 0,
      total_sent: totalSent || 0
    };
  }

  /**
   * Subscribe to real-time email updates
   */
  subscribeToEmails(callback, configId = null) {
    let subscription = supabase
      .channel('received_emails')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'received_emails',
          filter: configId ? `email_config_id=eq.${configId}` : undefined
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  /**
   * Subscribe to configuration changes
   */
  subscribeToConfigurations(callback) {
    let subscription = supabase
      .channel('email_configurations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_configurations'
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  /**
   * Simple encryption for demo purposes
   * In production, use proper encryption
   */
  encryptData(data) {
    // This is a simple base64 encoding for demo
    // In production, use proper encryption
    return btoa(data);
  }

  /**
   * Subscribe to real-time email updates
   */
  subscribeToEmails(configId, callback) {
    const subscription = supabase
      .channel('received_emails')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'received_emails',
          filter: `email_config_id=eq.${configId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  /**
   * Simple decryption for demo purposes
   */
  decryptData(encryptedData) {
    try {
      return atob(encryptedData);
    } catch {
      return encryptedData; // Return as-is if not encoded
    }
  }
}

// Create singleton instance
export const emailService = new EmailServiceClient();
export const emailServiceClient = emailService; // For compatibility