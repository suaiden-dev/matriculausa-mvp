-- Migration: Expand terms acceptance system to cover all types of terms
-- This ensures legal compliance and security by tracking all term acceptances

-- Create enum for different types of terms
CREATE TYPE term_type AS ENUM (
  'terms_of_service',
  'privacy_policy', 
  'affiliate_terms',
  'seller_terms',
  'checkout_terms',
  'university_terms'
);

-- Create table for all types of terms
CREATE TABLE IF NOT EXISTS application_terms (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  term_type term_type NOT NULL,
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create table for comprehensive term acceptance tracking
CREATE TABLE IF NOT EXISTS comprehensive_term_acceptance (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  term_id uuid REFERENCES application_terms(id) NOT NULL,
  term_type term_type NOT NULL,
  accepted_at timestamp with time zone DEFAULT now() NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT comprehensive_term_acceptance_unique UNIQUE (user_id, term_id)
);

-- Create indexes for better performance
CREATE INDEX idx_comprehensive_term_acceptance_user_id ON comprehensive_term_acceptance(user_id);
CREATE INDEX idx_comprehensive_term_acceptance_term_id ON comprehensive_term_acceptance(term_id);
CREATE INDEX idx_comprehensive_term_acceptance_term_type ON comprehensive_term_acceptance(term_type);
CREATE INDEX idx_comprehensive_term_acceptance_accepted_at ON comprehensive_term_acceptance(accepted_at);

-- Enable RLS
ALTER TABLE application_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprehensive_term_acceptance ENABLE ROW LEVEL SECURITY;

-- Policies for application_terms
CREATE POLICY "Everyone can view active terms" ON application_terms
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage terms" ON application_terms
  FOR ALL USING ((auth.jwt()->'user_metadata'->>'role')::text IN ('admin', 'affiliate_admin'));

-- Policies for comprehensive_term_acceptance
CREATE POLICY "Users can read their own term acceptances" ON comprehensive_term_acceptance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own term acceptances" ON comprehensive_term_acceptance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to check if user has accepted specific term type
CREATE OR REPLACE FUNCTION check_user_term_acceptance(
  p_user_id uuid,
  p_term_type term_type
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_accepted boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM comprehensive_term_acceptance cta
    INNER JOIN application_terms at ON cta.term_id = at.id
    WHERE cta.user_id = p_user_id
    AND at.term_type = p_term_type
    AND at.is_active = true
  ) INTO v_has_accepted;
  
  RETURN v_has_accepted;
END;
$$;

-- Function to get user's unaccepted terms
CREATE OR REPLACE FUNCTION get_user_unaccepted_terms(p_user_id uuid)
RETURNS TABLE(
  term_id uuid,
  title text,
  term_type term_type,
  version integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    at.id,
    at.title,
    at.term_type,
    at.version
  FROM application_terms at
  WHERE at.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM comprehensive_term_acceptance cta
    WHERE cta.term_id = at.id
    AND cta.user_id = p_user_id
  );
END;
$$;

-- Function to record term acceptance with additional metadata
CREATE OR REPLACE FUNCTION record_term_acceptance(
  p_user_id uuid,
  p_term_id uuid,
  p_term_type term_type,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_term_exists boolean;
BEGIN
  -- Check if term exists and is active
  SELECT EXISTS(
    SELECT 1 FROM application_terms 
    WHERE id = p_term_id AND is_active = true
  ) INTO v_term_exists;
  
  IF NOT v_term_exists THEN
    RETURN false;
  END IF;
  
  -- Insert or update acceptance record
  INSERT INTO comprehensive_term_acceptance (
    user_id, term_id, term_type, ip_address, user_agent
  ) VALUES (
    p_user_id, p_term_id, p_term_type, p_ip_address, p_user_agent
  )
  ON CONFLICT (user_id, term_id) 
  DO UPDATE SET
    accepted_at = now(),
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent,
    updated_at = now();
  
  RETURN true;
END;
$$;

-- Insert default terms if they don't exist
INSERT INTO application_terms (title, content, term_type, version) VALUES
(
  'Terms of Service',
  'By using our service, you agree to these terms...',
  'terms_of_service',
  1
),
(
  'Privacy Policy', 
  'This privacy policy describes how we collect and use your information...',
  'privacy_policy',
  1
),
(
  'Checkout Terms',
  'By proceeding with this payment, you agree to our checkout terms...',
  'checkout_terms',
  1
),
(
  'University Terms',
  'As a university representative, you agree to these terms...',
  'university_terms',
  1
)
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_application_terms_updated_at 
  BEFORE UPDATE ON application_terms 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comprehensive_term_acceptance_updated_at 
  BEFORE UPDATE ON comprehensive_term_acceptance 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
