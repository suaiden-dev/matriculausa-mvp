/*
  # Populate user_cart with historical data from existing students
  
  This migration populates the user_cart table with historical data based on:
  1. Students who have selected_scholarship_id in user_profiles (selected a scholarship)
  2. Students who have applications in scholarship_applications (showed interest/applied)
  
  This gives us historical "views" data for the admin dashboard statistics.
*/

-- Insert historical data from user_profiles.selected_scholarship_id
INSERT INTO public.user_cart (user_id, scholarship_id, created_at)
SELECT 
  up.user_id,
  up.selected_scholarship_id,
  COALESCE(up.updated_at, up.created_at, NOW())
FROM public.user_profiles up
WHERE up.selected_scholarship_id IS NOT NULL
  AND up.user_id IS NOT NULL
  -- Only insert if not already in cart (avoid duplicates)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_cart uc
    WHERE uc.user_id = up.user_id
      AND uc.scholarship_id = up.selected_scholarship_id
  )
ON CONFLICT (user_id, scholarship_id) DO NOTHING;

-- Insert historical data from scholarship_applications
-- This represents students who showed interest/applied before the cart system existed
INSERT INTO public.user_cart (user_id, scholarship_id, created_at)
SELECT DISTINCT
  up.user_id,
  sa.scholarship_id,
  COALESCE(sa.created_at, sa.applied_at, NOW())
FROM public.scholarship_applications sa
INNER JOIN public.user_profiles up ON sa.student_id = up.id
WHERE sa.scholarship_id IS NOT NULL
  AND up.user_id IS NOT NULL
  -- Only insert if not already in cart (avoid duplicates)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_cart uc
    WHERE uc.user_id = up.user_id
      AND uc.scholarship_id = sa.scholarship_id
  )
ON CONFLICT (user_id, scholarship_id) DO NOTHING;

-- Log the results
DO $$
DECLARE
  profiles_count INTEGER;
  applications_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profiles_count
  FROM public.user_profiles
  WHERE selected_scholarship_id IS NOT NULL;
  
  SELECT COUNT(DISTINCT CONCAT(sa.student_id::text, '-', sa.scholarship_id::text)) INTO applications_count
  FROM public.scholarship_applications sa
  WHERE sa.scholarship_id IS NOT NULL;
  
  SELECT COUNT(*) INTO total_count
  FROM public.user_cart;
  
  RAISE NOTICE 'Historical data population completed:';
  RAISE NOTICE '  - Students with selected_scholarship_id: %', profiles_count;
  RAISE NOTICE '  - Applications with scholarship_id: %', applications_count;
  RAISE NOTICE '  - Total entries in user_cart after migration: %', total_count;
END $$;

