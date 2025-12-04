-- Migration: Fix welcome message to insert directly in database
-- Instead of calling Edge Function via HTTP, we insert the message directly
-- This is more reliable and doesn't depend on external HTTP calls

-- Create or replace the trigger function to include welcome message
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
  welcome_message_text text;
  admin_id uuid;
  conversation_id uuid;
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

  -- ✅ NOVO: Send welcome message for students (direct database insert)
  -- IMPORTANTE: Esta seção está completamente isolada em um bloco BEGIN/EXCEPTION
  -- para garantir que QUALQUER erro aqui NÃO quebre o registro do usuário
  IF user_role = 'student' THEN
    BEGIN
      -- Build welcome message (multi-language support)
      welcome_message_text := 'Welcome to Support Chat!' || E'\n\n' ||
        'Hello! This is your support chat. Our team is available to help you from 9 AM to 5 PM (Arizona Time Zone). You can ask questions about scholarships, documents, and your application progress. Feel free to send messages and attachments at any time!' || E'\n\n' ||
        'Support hours: 9 AM - 5 PM (Arizona Time Zone)';

      -- Find default admin (same logic as Edge Function)
      -- First try to find regular admin
      SELECT user_id INTO admin_id
      FROM public.user_profiles
      WHERE role = 'admin'
      LIMIT 1;

      -- If no regular admin found, try affiliate_admin
      IF admin_id IS NULL THEN
        SELECT user_id INTO admin_id
        FROM public.user_profiles
        WHERE role = 'affiliate_admin'
        LIMIT 1;
      END IF;

      -- Only proceed if we found an admin
      IF admin_id IS NOT NULL THEN
        -- Create or get existing conversation
        INSERT INTO public.admin_student_conversations (admin_id, student_id)
        VALUES (admin_id, NEW.id)
        ON CONFLICT (admin_id, student_id) DO NOTHING
        RETURNING id INTO conversation_id;

        -- If conversation already existed, get its ID
        IF conversation_id IS NULL THEN
          SELECT id INTO conversation_id
          FROM public.admin_student_conversations
          WHERE admin_id = admin_id AND student_id = NEW.id
          LIMIT 1;
        END IF;

        -- Only insert message if conversation exists
        IF conversation_id IS NOT NULL THEN
          -- Check if welcome message already exists (prevent duplication)
          -- We check for key phrases from the welcome message
          IF NOT EXISTS (
            SELECT 1
            FROM public.admin_student_messages
            WHERE conversation_id = conversation_id
            AND (
              message LIKE '%Welcome to Support Chat%'
              OR message LIKE '%Bem-vindo ao Chat de Suporte%'
              OR message LIKE '%Bienvenido al Chat de Soporte%'
            )
            LIMIT 1
          ) THEN
            -- Insert welcome message
            INSERT INTO public.admin_student_messages (
              conversation_id,
              sender_id,
              recipient_id,
              message,
              read_at
            )
            VALUES (
              conversation_id,
              admin_id,
              NEW.id,
              welcome_message_text,
              NULL  -- Leave as null so it appears as unread
            );

            -- Update conversation's last_message_at
            UPDATE public.admin_student_conversations
            SET 
              last_message_at = NOW(),
              updated_at = NOW()
            WHERE id = conversation_id;
          END IF;
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
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile, university entry (if role=school), and sends welcome chat message directly in database (if role=student) automatically when user signs up';

