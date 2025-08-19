-- Create function to get scholarship fees
CREATE OR REPLACE FUNCTION get_scholarship_fees(p_scholarship_id UUID)
RETURNS TABLE (
  application_fee_amount DECIMAL(10,2),
  platform_fee_percentage DECIMAL(5,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.application_fee_amount, 350.00) as application_fee_amount,
    COALESCE(s.platform_fee_percentage, 15.00) as platform_fee_percentage
  FROM scholarships s
  WHERE s.id = p_scholarship_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_scholarship_fees(UUID) TO authenticated;
