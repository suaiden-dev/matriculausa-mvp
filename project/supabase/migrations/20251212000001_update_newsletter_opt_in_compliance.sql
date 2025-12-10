-- Migration: Update newsletter system for GDPR/LGPD compliance with explicit opt-in
-- This migration updates the newsletter system to require explicit consent before sending emails

-- 1. Update check_user_can_receive_email function to require explicit opt-in
CREATE OR REPLACE FUNCTION check_user_can_receive_email(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opt_out boolean;
  v_opt_in boolean;
  v_last_email_sent timestamptz;
  v_hours_since_last_email numeric;
BEGIN
  -- Verificar preferências de newsletter
  SELECT email_opt_out, email_opt_in, last_email_sent_at
  INTO v_opt_out, v_opt_in, v_last_email_sent
  FROM newsletter_user_preferences
  WHERE user_id = p_user_id;
  
  -- Se não tem registro de preferências, não pode receber (opt-in explícito requerido)
  IF v_opt_out IS NULL AND v_opt_in IS NULL THEN
    RETURN false;
  END IF;
  
  -- Se optou por sair, não pode receber
  IF v_opt_out = true THEN
    RETURN false;
  END IF;
  
  -- ✅ NOVO: Se não consentiu explicitamente (opt_in é NULL ou false), não pode receber
  IF v_opt_in IS NULL OR v_opt_in = false THEN
    RETURN false;
  END IF;
  
  -- Verificar rate limit: máximo 1 email por dia (24 horas)
  -- Só verifica se o usuário consentiu (opt_in = true)
  IF v_last_email_sent IS NOT NULL THEN
    v_hours_since_last_email := EXTRACT(EPOCH FROM (NOW() - v_last_email_sent)) / 3600;
    IF v_hours_since_last_email < 24 THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Se chegou aqui, usuário consentiu e passou no rate limit
  RETURN true;
END;
$$;

COMMENT ON FUNCTION check_user_can_receive_email IS 'Verifica se usuário pode receber email. Exige opt-in explícito (email_opt_in = true), verifica opt-out e rate limit (máximo 1 email por 24h). GDPR/LGPD compliant.';

-- 2. Update handle_new_user trigger to create newsletter preferences based on consent
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

  -- ✅ Send welcome message for students (using helper functions that bypass RLS)
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

  -- ✅ NOVO: Create newsletter preferences based on consent
  -- IMPORTANTE: Esta seção está isolada em um bloco BEGIN/EXCEPTION
  -- para garantir que QUALQUER erro aqui NÃO quebre o registro do usuário
  BEGIN
    -- Check if user consented to newsletter (from user_metadata)
    -- newsletter_consent can be boolean true/false or string 'true'/'false'
    -- Create newsletter preferences record
    INSERT INTO public.newsletter_user_preferences (
      user_id,
      email_opt_out,
      email_opt_in,
      opt_in_at,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      false, -- Default: not opted out
      -- Check newsletter_consent from metadata (handle both boolean and string)
      CASE 
        WHEN NEW.raw_user_meta_data->>'newsletter_consent' IS NULL THEN false
        WHEN LOWER(NEW.raw_user_meta_data->>'newsletter_consent') = 'true' THEN true
        WHEN (NEW.raw_user_meta_data->>'newsletter_consent')::text = 'true' THEN true
        ELSE false
      END,
      -- Timestamp only if consented
      CASE 
        WHEN NEW.raw_user_meta_data->>'newsletter_consent' IS NOT NULL AND 
             (LOWER(NEW.raw_user_meta_data->>'newsletter_consent') = 'true' OR 
              (NEW.raw_user_meta_data->>'newsletter_consent')::text = 'true') THEN NOW()
        ELSE NULL
      END,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING; -- Don't fail if record already exists
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail user registration
    RAISE LOG 'Error creating newsletter preferences for user %: %', NEW.id, SQLERRM;
  END;

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
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile, university entry (if role=school), sends welcome chat message (if role=student), and creates newsletter preferences based on consent. Uses helper functions with SECURITY DEFINER to bypass RLS policies.';

