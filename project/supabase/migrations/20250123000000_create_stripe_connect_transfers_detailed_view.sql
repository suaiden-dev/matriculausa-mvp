-- Create a comprehensive view for Stripe Connect transfers with detailed information
CREATE OR REPLACE VIEW stripe_connect_transfers_detailed AS
SELECT 
  -- Transfer information
  sct.id,
  sct.transfer_id,
  sct.session_id,
  sct.payment_intent_id,
  sct.amount,
  sct.status,
  sct.destination_account,
  sct.error_message,
  sct.created_at,
  sct.updated_at,
  
  -- Application information
  sa.id as application_id,
  sa.status as application_status,
  sa.applied_at,
  sa.reviewed_at,
  sa.notes as application_notes,
  
  -- Student information
  up.id as student_profile_id,
  up.full_name as student_name,
  up.phone as student_phone,
  up.country as student_country,
  up.field_of_interest as student_field,
  up.academic_level as student_level,
  up.gpa as student_gpa,
  up.english_proficiency as student_english,
  
  -- Scholarship information
  s.id as scholarship_id,
  s.title as scholarship_title,
  s.description as scholarship_description,
  s.amount as scholarship_amount,
  s.deadline as scholarship_deadline,
  s.field_of_study as scholarship_field,
  s.level as scholarship_level,
  s.is_exclusive as scholarship_exclusive,
  s.is_active as scholarship_active,
  
  -- University information
  u.id as university_id,
  u.name as university_name,
  u.location as university_location,
  u.website as university_website,
  
  -- Fee type information (based on session_id pattern or amount)
  CASE 
    WHEN sct.amount = 2500 THEN 'Application Fee ($25.00)'
    WHEN sct.amount = 5000 THEN 'Scholarship Fee ($50.00)'
    WHEN sct.amount = 10000 THEN 'I-20 Control Fee ($100.00)'
    WHEN sct.amount = 15000 THEN 'Selection Process Fee ($150.00)'
    ELSE 'Custom Fee ($' || (sct.amount::numeric / 100)::text || ')'
  END as fee_type,
  
  -- Fee category
  CASE 
    WHEN sct.amount = 2500 THEN 'application'
    WHEN sct.amount = 5000 THEN 'scholarship'
    WHEN sct.amount = 10000 THEN 'i20_control'
    WHEN sct.amount = 15000 THEN 'selection_process'
    ELSE 'custom'
  END as fee_category,
  
  -- Transfer status details
  CASE sct.status
    WHEN 'succeeded' THEN 'Transfer completed successfully'
    WHEN 'pending' THEN 'Transfer is being processed'
    WHEN 'failed' THEN 'Transfer failed - check error details'
    ELSE 'Unknown status'
  END as status_description,
  
  -- Time since transfer
  EXTRACT(EPOCH FROM (NOW() - sct.created_at)) / 3600 as hours_since_transfer,
  
  -- Application progress
  CASE sa.status
    WHEN 'pending' THEN 'Application under review'
    WHEN 'approved' THEN 'Application approved'
    WHEN 'rejected' THEN 'Application rejected'
    WHEN 'under_review' THEN 'Application being evaluated'
    ELSE 'Unknown application status'
  END as application_progress

FROM stripe_connect_transfers sct
LEFT JOIN scholarship_applications sa ON sct.application_id = sa.id
LEFT JOIN user_profiles up ON sa.student_id = up.user_id
LEFT JOIN scholarships s ON sa.scholarship_id = s.id
LEFT JOIN universities u ON sct.university_id = u.id

ORDER BY sct.created_at DESC;

-- Add comments to the view
COMMENT ON VIEW stripe_connect_transfers_detailed IS 'Comprehensive view of Stripe Connect transfers with detailed information about applications, students, scholarships, and universities';

-- Grant access to the view
GRANT SELECT ON stripe_connect_transfers_detailed TO authenticated;

-- Create indexes to improve view performance
CREATE INDEX IF NOT EXISTS idx_stripe_connect_transfers_application_id 
ON stripe_connect_transfers(application_id);

CREATE INDEX IF NOT EXISTS idx_stripe_connect_transfers_user_id 
ON stripe_connect_transfers(user_id);

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_student_id 
ON scholarship_applications(student_id);

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_scholarship_id 
ON scholarship_applications(scholarship_id);
