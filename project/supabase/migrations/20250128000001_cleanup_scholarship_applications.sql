/*
  # Cleanup and Reorganize Scholarship Applications Table
  
  This migration cleans up the confusing scholarship_applications table structure
  and creates a more organized and logical flow.
  
  ## Problems with current structure:
  1. Confusing status fields (status + payment_status + boolean flags)
  2. Mixed unrelated fields (acceptance letters, stripe transfers, affiliates)
  3. Inconsistent payment tracking
  4. Hard to understand application lifecycle
  
  ## New clean structure:
  1. Single application_status field with clear values
  2. Clear payment tracking
  3. Separated concerns (applications vs payments vs documents)
  4. Logical application flow
*/

-- Step 1: Create new clean structure
CREATE TABLE IF NOT EXISTS scholarship_applications_clean (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    scholarship_id uuid NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
    
    -- Clear application status
    application_status text NOT NULL DEFAULT 'draft' CHECK (
        application_status IN (
            'draft',                    -- Student started but not submitted
            'submitted',                -- Documents uploaded, waiting review
            'under_review',             -- University reviewing documents
            'documents_approved',       -- Documents approved, waiting application fee
            'application_fee_paid',     -- Application fee paid, waiting scholarship fee
            'scholarship_fee_paid',     -- All fees paid, application complete
            'enrolled',                 -- Student enrolled in program
            'rejected',                 -- Application rejected
            'withdrawn'                 -- Student withdrew application
        )
    ),
    
    -- Clear payment tracking
    payment_status text NOT NULL DEFAULT 'pending' CHECK (
        payment_status IN (
            'pending',                  -- No payments made
            'selection_process_paid',   -- Selection process fee paid
            'application_fee_paid',     -- Application fee paid
            'scholarship_fee_paid',     -- All fees paid
            'failed',                   -- Payment failed
            'refunded'                  -- Payment refunded
        )
    ),
    
    -- Payment amounts and dates
    selection_process_fee_amount integer,
    selection_process_fee_paid_at timestamptz,
    application_fee_amount integer,
    application_fee_paid_at timestamptz,
    scholarship_fee_amount integer,
    scholarship_fee_paid_at timestamptz,
    
    -- Application lifecycle
    submitted_at timestamptz,
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES auth.users(id),
    documents_approved_at timestamptz,
    enrolled_at timestamptz,
    
    -- Notes and metadata
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Ensure one application per student per scholarship
    UNIQUE(student_id, scholarship_id)
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_clean_student_id 
ON scholarship_applications_clean(student_id);

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_clean_status 
ON scholarship_applications_clean(application_status);

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_clean_payment 
ON scholarship_applications_clean(payment_status);

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_clean_scholarship 
ON scholarship_applications_clean(scholarship_id);

-- Step 3: Migrate existing data to new structure
INSERT INTO scholarship_applications_clean (
    id,
    student_id,
    scholarship_id,
    application_status,
    payment_status,
    selection_process_fee_amount,
    selection_process_fee_paid_at,
    application_fee_amount,
    application_fee_paid_at,
    scholarship_fee_amount,
    scholarship_fee_paid_at,
    submitted_at,
    reviewed_at,
    reviewed_by,
    documents_approved_at,
    notes,
    created_at,
    updated_at
)
SELECT 
    sa.id,
    sa.student_id,
    sa.scholarship_id,
    
    -- Map old status to new application_status
    CASE 
        WHEN sa.status = 'pending' AND sa.is_application_fee_paid = false THEN 'submitted'
        WHEN sa.status = 'pending' AND sa.is_application_fee_paid = true THEN 'application_fee_paid'
        WHEN sa.status = 'approved' THEN 'documents_approved'
        WHEN sa.status = 'under_review' THEN 'under_review'
        WHEN sa.status = 'enrolled' THEN 'enrolled'
        WHEN sa.status = 'rejected' THEN 'rejected'
        ELSE 'submitted'
    END as application_status,
    
    -- Map old payment fields to new payment_status
    CASE 
        WHEN sa.is_scholarship_fee_paid = true THEN 'scholarship_fee_paid'
        WHEN sa.is_application_fee_paid = true THEN 'application_fee_paid'
        WHEN up.has_paid_selection_process_fee = true THEN 'selection_process_paid'
        ELSE 'pending'
    END as payment_status,
    
    -- Map payment amounts (default values)
    50 as selection_process_fee_amount,
    CASE WHEN up.has_paid_selection_process_fee THEN up.updated_at ELSE NULL END as selection_process_fee_paid_at,
    100 as application_fee_amount,
    CASE WHEN sa.is_application_fee_paid THEN sa.updated_at ELSE NULL END as application_fee_paid_at,
    500 as scholarship_fee_amount,
    CASE WHEN sa.is_scholarship_fee_paid THEN sa.updated_at ELSE NULL END as scholarship_fee_paid_at,
    
    -- Map timestamps
    sa.applied_at as submitted_at,
    sa.reviewed_at,
    sa.reviewed_by,
    CASE WHEN sa.status = 'approved' THEN sa.updated_at ELSE NULL END as documents_approved_at,
    sa.notes,
    sa.created_at,
    sa.updated_at
FROM scholarship_applications sa
JOIN user_profiles up ON sa.student_id = up.id
WHERE sa.student_id IS NOT NULL 
  AND sa.scholarship_id IS NOT NULL;

-- Step 4: Add RLS policies for new table
ALTER TABLE scholarship_applications_clean ENABLE ROW LEVEL SECURITY;

-- Students can see their own applications
CREATE POLICY "Students can view own applications" ON scholarship_applications_clean
    FOR SELECT USING (auth.uid()::text = (
        SELECT up.user_id::text 
        FROM user_profiles up 
        WHERE up.id = student_id
    ));

-- Admins can see all applications
CREATE POLICY "Admins can view all applications" ON scholarship_applications_clean
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- Step 5: Create view for backward compatibility (temporary)
CREATE OR REPLACE VIEW scholarship_applications_compat AS
SELECT 
    id,
    student_id,
    scholarship_id,
    application_status as status,
    payment_status,
    submitted_at as applied_at,
    reviewed_at,
    reviewed_by,
    notes,
    created_at,
    updated_at,
    selection_process_fee_amount,
    selection_process_fee_paid_at,
    application_fee_amount,
    application_fee_paid_at,
    scholarship_fee_amount,
    scholarship_fee_paid_at,
    documents_approved_at,
    enrolled_at
FROM scholarship_applications_clean;

-- Add comments for documentation
COMMENT ON TABLE scholarship_applications_clean IS 'Clean and organized scholarship applications table';
COMMENT ON COLUMN scholarship_applications_clean.application_status IS 'Current status of the application in the lifecycle';
COMMENT ON COLUMN scholarship_applications_clean.payment_status IS 'Current payment status for all fees';
COMMENT ON COLUMN scholarship_applications_clean.selection_process_fee_amount IS 'Amount for selection process fee in cents';
COMMENT ON COLUMN scholarship_applications_clean.application_fee_amount IS 'Amount for application fee in cents';
COMMENT ON COLUMN scholarship_applications_clean.scholarship_fee_amount IS 'Amount for scholarship fee in cents';
