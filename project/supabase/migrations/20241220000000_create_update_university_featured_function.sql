-- Create function to update university featured status
-- This function bypasses RLS policies for admin users

CREATE OR REPLACE FUNCTION update_university_featured_status(
  university_id_param UUID,
  is_featured_param BOOLEAN,
  featured_order_param INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RETURN json_build_object('error', 'Unauthorized: Admin access required');
  END IF;

  -- Update the university
  UPDATE universities 
  SET 
    is_featured = is_featured_param,
    featured_order = featured_order_param,
    updated_at = NOW()
  WHERE id = university_id_param;

  -- Check if update was successful
  IF FOUND THEN
    -- Get updated university data
    SELECT json_build_object(
      'success', true,
      'university_id', id,
      'name', name,
      'is_featured', is_featured,
      'featured_order', featured_order
    ) INTO result
    FROM universities 
    WHERE id = university_id_param;
    
    RETURN result;
  ELSE
    RETURN json_build_object('error', 'University not found');
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_university_featured_status TO authenticated;
