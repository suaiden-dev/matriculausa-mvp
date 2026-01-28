-- Migration: Add welcome chat message to handle_new_user trigger
-- This sends a welcome message automatically when a student registers
-- Uses pg_net to call the Edge Function asynchronously

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create or replace the trigger function to include welcome message
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
  welcome_message_text text;
  edge_function_url text;
  service_role_key text := NULL;
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

  -- ✅ NOVO: Send welcome message for students (asynchronously via Edge Function)
  -- IMPORTANTE: Esta seção está completamente isolada em um bloco BEGIN/EXCEPTION
  -- para garantir que QUALQUER erro aqui NÃO quebre o registro do usuário
  IF user_role = 'student' THEN
    BEGIN
      -- Build welcome message (multi-language support)
      welcome_message_text := 'Welcome to Support Chat!' || E'\n\n' ||
        'Hello! This is your support chat. Our team is available to help you from 9 AM to 5 PM (Arizona Time Zone). You can ask questions about scholarships, documents, and your application progress. Feel free to send messages and attachments at any time!' || E'\n\n' ||
        'Support hours: 9 AM - 5 PM (Arizona Time Zone)';

      -- Get Edge Function URL (hardcoded for this project)
      edge_function_url := 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1/send-welcome-chat-message';

      -- Get Service Role Key from system_settings table (if available)
      -- The Edge Function will use its own SUPABASE_SERVICE_ROLE_KEY from environment
      -- but we can pass it here for extra security
      BEGIN
        SELECT value INTO service_role_key
        FROM public.system_settings
        WHERE key = 'service_role_key'
        LIMIT 1;
      EXCEPTION WHEN OTHERS THEN
        -- Se a tabela não existir ou houver erro, continua sem a chave
        service_role_key := NULL;
        RAISE LOG 'Could not get service_role_key from system_settings: %', SQLERRM;
      END;

      -- Call Edge Function asynchronously (non-blocking)
      -- IMPORTANTE: net.http_post pode falhar (rede, timeout, etc)
      -- Por isso está dentro de um bloco BEGIN/EXCEPTION separado
      BEGIN
        PERFORM net.http_post(
          url := edge_function_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
          ),
          body := jsonb_build_object(
            'student_id', NEW.id::text,
            'welcome_message_text', welcome_message_text
          )
        );
        RAISE LOG 'Welcome message HTTP request sent for student: %', NEW.id;
      EXCEPTION WHEN OTHERS THEN
        -- Se a chamada HTTP falhar, apenas loga o erro mas NÃO quebra o registro
        RAISE LOG 'Failed to send welcome message HTTP request for student %: %', NEW.id, SQLERRM;
        -- Continua normalmente - o registro do usuário não é afetado
      END;

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
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile, university entry (if role=school), and sends welcome chat message (if role=student) automatically when user signs up';

