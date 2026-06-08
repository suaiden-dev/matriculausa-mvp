-- Migration: identify_ip RPC
-- Purpose: Cross-reference an IP address with known user history from student_action_logs
-- to identify who physically performed actions on shared accounts (e.g. school_manager).
-- Returns ranked matches with a confidence score based on historical frequency.

CREATE OR REPLACE FUNCTION public.identify_ip(p_ip text)
RETURNS TABLE (
  person_name   text,
  person_email  text,
  person_type   text,
  frequency     bigint,
  last_seen     timestamptz,
  confidence    text   -- 'high' (>=50 actions) | 'medium' (>=10) | 'low' (<10)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    performed_by_name   AS person_name,
    performed_by_email  AS person_email,
    performed_by_type   AS person_type,
    COUNT(*)            AS frequency,
    MAX(created_at)     AS last_seen,
    CASE
      WHEN COUNT(*) >= 50 THEN 'high'
      WHEN COUNT(*) >= 10 THEN 'medium'
      ELSE 'low'
    END AS confidence
  FROM public.student_action_logs
  WHERE metadata->>'ip' = p_ip
    AND performed_by_name IS NOT NULL
    AND performed_by_email IS NOT NULL
  GROUP BY performed_by_name, performed_by_email, performed_by_type
  ORDER BY frequency DESC
  LIMIT 5;
$$;
