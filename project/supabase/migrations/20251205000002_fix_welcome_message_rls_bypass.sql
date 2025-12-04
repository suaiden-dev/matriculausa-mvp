-- Migration: Fix RLS policies to allow trigger to insert welcome messages
-- The trigger runs with SECURITY DEFINER, which should bypass RLS, but we'll create
-- helper functions to ensure it works correctly without breaking user registration

-- Create helper function to insert conversation (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_welcome_conversation(
  p_admin_id uuid,
  p_student_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- Insert conversation (SECURITY DEFINER bypasses RLS)
  INSERT INTO public.admin_student_conversations (admin_id, student_id)
  VALUES (p_admin_id, p_student_id)
  ON CONFLICT (admin_id, student_id) DO NOTHING
  RETURNING id INTO v_conversation_id;

  -- If conversation already existed, get its ID
  IF v_conversation_id IS NULL THEN
    SELECT id INTO v_conversation_id
    FROM public.admin_student_conversations
    WHERE admin_id = p_admin_id AND student_id = p_student_id
    LIMIT 1;
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- Create helper function to insert welcome message (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.insert_welcome_message(
  p_conversation_id uuid,
  p_admin_id uuid,
  p_student_id uuid,
  p_message_text text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if welcome message already exists (prevent duplication)
  IF EXISTS (
    SELECT 1
    FROM public.admin_student_messages
    WHERE conversation_id = p_conversation_id
    AND (
      message LIKE '%Welcome to Support Chat%'
      OR message LIKE '%Bem-vindo ao Chat de Suporte%'
      OR message LIKE '%Bienvenido al Chat de Soporte%'
    )
    LIMIT 1
  ) THEN
    RETURN false; -- Message already exists
  END IF;

  -- Insert welcome message (SECURITY DEFINER bypasses RLS)
  INSERT INTO public.admin_student_messages (
    conversation_id,
    sender_id,
    recipient_id,
    message,
    read_at
  )
  VALUES (
    p_conversation_id,
    p_admin_id,
    p_student_id,
    p_message_text,
    NULL  -- Leave as null so it appears as unread
  );

  -- Update conversation's last_message_at
  UPDATE public.admin_student_conversations
  SET 
    last_message_at = NOW(),
    updated_at = NOW()
  WHERE id = p_conversation_id;

  RETURN true; -- Message inserted successfully
END;
$$;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.create_welcome_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_welcome_conversation(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.insert_welcome_message(uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_welcome_message(uuid, uuid, uuid, text) TO anon;

-- Create or replace the trigger function to use helper functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
  welcome_message_text text;
  admin_id uuid;
  conversation_id uuid;
  message_inserted boolean;
BEGIN
  -- Insert into user_profiles table when a new user is created
  INSERT INTO public.user_profiles (
    user_id,
    email,
    full_name,
    phone,
    status,
    role,
    -- Include referral codes if provided
    affiliate_code,
    seller_referral_code,
    scholarship_package_id,
    -- Persist dependents if provided during sign up
    dependents,
    -- Persist desired scholarship range if provided
    desired_scholarship_range,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'active',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'affiliate_code', NULL),
    COALESCE(NEW.raw_user_meta_data->>'seller_referral_code', NULL),
    CASE 
      WHEN NEW.raw_user_meta_data->>'scholarship_package_number' IS NOT NULL THEN
        (SELECT id FROM scholarship_packages 
         WHERE package_number = (NEW.raw_user_meta_data->>'scholarship_package_number')::integer 
         AND is_active = true 
         LIMIT 1)
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'dependents' IS NOT NULL THEN
        (NEW.raw_user_meta_data->>'dependents')::integer
      ELSE 0
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'desired_scholarship_range' IS NOT NULL THEN
        (NEW.raw_user_meta_data->>'desired_scholarship_range')::integer
      ELSE NULL
    END,
    NOW(),
    NOW()
  );

  -- Get user role
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  -- If the user is registering as a university, create a universities entry
  IF user_role = 'school' THEN
    INSERT INTO public.universities (
      user_id,
      name,
      description,
      location,
      website,
      contact,
      is_approved,
      profile_completed,
      terms_accepted,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'universityName', 'Unnamed University'),
      'University profile created during registration',
      COALESCE(NEW.raw_user_meta_data->>'location', ''),
      COALESCE(NEW.raw_user_meta_data->>'website', ''),
      jsonb_build_object(
        'name', COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        'position', COALESCE(NEW.raw_user_meta_data->>'position', ''),
        'email', NEW.email,
        'phone', COALESCE(NEW.raw_user_meta_data->>'phone', '')
      ),
      false,
      false,
      false,
      NOW(),
      NOW()
    );
  END IF;

  -- ✅ NOVO: Send welcome message for students (using helper functions that bypass RLS)
  -- IMPORTANTE: Esta seção está completamente isolada em um bloco BEGIN/EXCEPTION
  -- para garantir que QUALQUER erro aqui NÃO quebre o registro do usuário
  IF user_role = 'student' THEN
    BEGIN
      -- Build welcome message (multi-language support)
      welcome_message_text := 'Welcome to Support Chat!' || E'\n\n' ||
        'Hello! This is your support chat. Our team is available to help you from 9 AM to 5 PM (Arizona Time Zone). You can ask questions about scholarships, documents, and your application progress. Feel free to send messages and attachments at any time!' || E'\n\n' ||
        'Support hours: 9 AM - 5 PM (Arizona Time Zone)';

      -- Find default admin (same logic as Edge Function)
      -- First try to find regular admin (order by created_at for consistency)
      SELECT user_id INTO admin_id
      FROM public.user_profiles
      WHERE role = 'admin'
      ORDER BY created_at ASC
      LIMIT 1;

      -- If no regular admin found, try affiliate_admin
      IF admin_id IS NULL THEN
        SELECT user_id INTO admin_id
        FROM public.user_profiles
        WHERE role = 'affiliate_admin'
        ORDER BY created_at ASC
        LIMIT 1;
      END IF;

      -- Only proceed if we found an admin
      IF admin_id IS NOT NULL THEN
        -- Use helper function to create/get conversation (bypasses RLS)
        conversation_id := public.create_welcome_conversation(admin_id, NEW.id);

        -- Only insert message if conversation exists
        IF conversation_id IS NOT NULL THEN
          -- Use helper function to insert message (bypasses RLS)
          message_inserted := public.insert_welcome_message(
            conversation_id,
            admin_id,
            NEW.id,
            welcome_message_text
          );
        END IF;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Proteção extra: se QUALQUER coisa falhar nesta seção, apenas loga
      -- e continua com o registro do usuário normalmente
      RAISE LOG 'Error in welcome message section for student %: %', NEW.id, SQLERRM;
      -- NÃO re-raise a exceção - permite que o registro continue
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger function has the right permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile, university entry (if role=school), and sends welcome chat message directly in database (if role=student) automatically when user signs up. Uses helper functions with SECURITY DEFINER to bypass RLS policies.';
