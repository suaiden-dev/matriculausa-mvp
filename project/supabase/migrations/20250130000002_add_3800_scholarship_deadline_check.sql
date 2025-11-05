/*
  # Add 3800 Scholarship Deadline Check Function
  
  This migration adds a function to validate if a $3800 scholarship has expired
  based on the deadline of November 7, 2025 at 00:00 (America/Los_Angeles timezone).
  
  ## Changes:
  1. Create function to check if $3800 scholarship is expired
  2. Function can be used as an extra validation layer in RPC calls
*/

-- Function to check if a $3800 scholarship is expired
CREATE OR REPLACE FUNCTION check_3800_scholarship_expired(
  scholarship_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  scholarship_value numeric;
  deadline_date timestamp with time zone;
  current_time timestamp with time zone;
BEGIN
  -- Get the scholarship's annual_value_with_scholarship
  SELECT annual_value_with_scholarship INTO scholarship_value
  FROM scholarships
  WHERE id = scholarship_id_param;
  
  -- If scholarship not found or not $3800, return false (not expired)
  IF scholarship_value IS NULL OR scholarship_value != 3800 THEN
    RETURN false;
  END IF;
  
  -- Deadline: November 6, 2025, 23:59 America/Phoenix (Arizona)
  -- Arizona não usa DST, sempre UTC-7 (MST - Mountain Standard Time)
  -- November 6, 2025 23:59 MST = November 7, 2025 06:59 UTC
  -- A partir de 00:00 do dia 7 (07:00 UTC) não será mais possível se candidatar
  deadline_date := '2025-11-07 06:59:59 UTC'::timestamp with time zone;
  
  -- Get current UTC time
  current_time := NOW() AT TIME ZONE 'UTC';
  
  -- Return true if current time >= deadline (expired)
  RETURN current_time >= deadline_date;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION check_3800_scholarship_expired(uuid) IS 
'Checks if a $3800 scholarship has expired based on the deadline of November 6, 2025 23:59 America/Phoenix (Arizona, MST, UTC-7). Returns true if expired (after 00:00 Nov 7), false otherwise.';

