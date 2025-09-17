-- Migration: Create email management tables

-- Table for storing email configurations (SMTP/IMAP)
CREATE TABLE email_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- Nome da configuração (ex: "Gmail Pessoal", "Outlook Trabalho")
    email_address VARCHAR(255) NOT NULL,
    
    -- SMTP Configuration
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_secure BOOLEAN DEFAULT false,
    smtp_auth_user VARCHAR(255) NOT NULL,
    smtp_auth_pass TEXT NOT NULL, -- Encrypted password
    
    -- IMAP Configuration
    imap_host VARCHAR(255) NOT NULL,
    imap_port INTEGER NOT NULL DEFAULT 993,
    imap_secure BOOLEAN DEFAULT true,
    imap_auth_user VARCHAR(255) NOT NULL,
    imap_auth_pass TEXT NOT NULL, -- Encrypted password
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_enabled BOOLEAN DEFAULT true,
    sync_interval_minutes INTEGER DEFAULT 5,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing received emails
CREATE TABLE received_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email_config_id UUID NOT NULL REFERENCES email_configurations(id) ON DELETE CASCADE,
    message_id VARCHAR(500) NOT NULL, -- Unique message ID from email
    
    -- Email metadata
    subject TEXT,
    from_address TEXT NOT NULL,
    from_name TEXT,
    to_addresses TEXT[], -- Array of recipient addresses
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    reply_to TEXT,
    
    -- Content
    text_content TEXT,
    html_content TEXT,
    
    -- Flags
    is_read BOOLEAN DEFAULT false,
    is_flagged BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    
    -- Timestamps
    received_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate emails
    UNIQUE(email_config_id, message_id)
);

-- Table for storing sent emails
CREATE TABLE sent_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email_config_id UUID NOT NULL REFERENCES email_configurations(id) ON DELETE CASCADE,
    
    -- Email metadata
    subject TEXT,
    to_addresses TEXT[] NOT NULL,
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    reply_to TEXT,
    
    -- Content
    text_content TEXT,
    html_content TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,
    
    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for email attachments
CREATE TABLE email_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email_id UUID, -- Can reference either received_emails or sent_emails
    email_type VARCHAR(20) NOT NULL CHECK (email_type IN ('received', 'sent')),
    
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    size_bytes INTEGER,
    storage_path TEXT, -- Path to stored file
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_email_configurations_user_id ON email_configurations(user_id);
CREATE INDEX idx_email_configurations_active ON email_configurations(user_id, is_active);

CREATE INDEX idx_received_emails_config_id ON received_emails(email_config_id);
CREATE INDEX idx_received_emails_received_date ON received_emails(email_config_id, received_date DESC);
CREATE INDEX idx_received_emails_unread ON received_emails(email_config_id, is_read, received_date DESC);

CREATE INDEX idx_sent_emails_config_id ON sent_emails(email_config_id);
CREATE INDEX idx_sent_emails_created_at ON sent_emails(email_config_id, created_at DESC);
CREATE INDEX idx_sent_emails_status ON sent_emails(email_config_id, status);

CREATE INDEX idx_email_attachments_email ON email_attachments(email_id, email_type);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_configurations_updated_at 
    BEFORE UPDATE ON email_configurations 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_received_emails_updated_at 
    BEFORE UPDATE ON received_emails 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_sent_emails_updated_at 
    BEFORE UPDATE ON sent_emails 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE email_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE received_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own email configurations" 
    ON email_configurations FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email configurations" 
    ON email_configurations FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email configurations" 
    ON email_configurations FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email configurations" 
    ON email_configurations FOR DELETE 
    USING (auth.uid() = user_id);

-- Received emails policies
CREATE POLICY "Users can view emails from their configurations" 
    ON received_emails FOR SELECT 
    USING (
        email_config_id IN (
            SELECT id FROM email_configurations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert received emails" 
    ON received_emails FOR INSERT 
    WITH CHECK (true); -- Emails are inserted by the system

CREATE POLICY "Users can update their received emails" 
    ON received_emails FOR UPDATE 
    USING (
        email_config_id IN (
            SELECT id FROM email_configurations WHERE user_id = auth.uid()
        )
    );

-- Sent emails policies
CREATE POLICY "Users can view their sent emails" 
    ON sent_emails FOR SELECT 
    USING (
        email_config_id IN (
            SELECT id FROM email_configurations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert sent emails" 
    ON sent_emails FOR INSERT 
    WITH CHECK (
        email_config_id IN (
            SELECT id FROM email_configurations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can update sent emails status" 
    ON sent_emails FOR UPDATE 
    USING (true); -- System needs to update status

-- Email attachments policies
CREATE POLICY "Users can view attachments from their emails" 
    ON email_attachments FOR SELECT 
    USING (
        (email_type = 'received' AND email_id IN (
            SELECT id FROM received_emails re 
            JOIN email_configurations ec ON re.email_config_id = ec.id 
            WHERE ec.user_id = auth.uid()
        )) OR
        (email_type = 'sent' AND email_id IN (
            SELECT id FROM sent_emails se 
            JOIN email_configurations ec ON se.email_config_id = ec.id 
            WHERE ec.user_id = auth.uid()
        ))
    );

CREATE POLICY "System can insert email attachments" 
    ON email_attachments FOR INSERT 
    WITH CHECK (true); -- Attachments are managed by the system