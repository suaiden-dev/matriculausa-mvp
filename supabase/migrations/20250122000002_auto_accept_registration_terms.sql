-- =====================================================
-- Migration: Auto-accept Registration Terms for Students
-- =====================================================
-- Atualiza o trigger handle_new_user para registrar automaticamente
-- terms_of_service e privacy_policy quando um estudante se registra
-- 
-- IMPORTANTE: Esta migration inclui toda a lógica da versão atual do banco
-- + a nova funcionalidade de aceite automático de termos
-- =====================================================

-- Atualizar função handle_new_user para registrar termos automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  user_role text;
  welcome_message_text text;
  admin_id uuid;
  conversation_id uuid;
  message_inserted boolean;
  scholarship_package_id_val uuid;
  terms_service_id uuid;
  privacy_policy_id uuid;
BEGIN
  -- Insert into user_profiles table when a new user is created
  -- Wrap scholarship_packages lookup in BEGIN/EXCEPTION to prevent errors from stopping the trigger
  BEGIN
    scholarship_package_id_val := CASE 
      WHEN NEW.raw_user_meta_data->>'scholarship_package_number' IS NOT NULL THEN
        (SELECT id FROM public.scholarship_packages 
         WHERE package_number = (NEW.raw_user_meta_data->>'scholarship_package_number')::integer 
         AND is_active = true 
         LIMIT 1)
      ELSE NULL
    END;
  EXCEPTION WHEN OTHERS THEN
    -- If scholarship_packages lookup fails, just set to NULL and continue
    RAISE LOG 'Error looking up scholarship_package for user %: %', NEW.id, SQLERRM;
    scholarship_package_id_val := NULL;
  END;

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
    scholarship_package_id_val,  -- Use the variable instead of inline CASE
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
  RAISE LOG 'handle_new_user: User % created with role %', NEW.id, user_role;

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
      RAISE LOG 'handle_new_user: Starting welcome message process for student %', NEW.id;
      
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

      RAISE LOG 'handle_new_user: Admin lookup result for student %: admin_id = %', NEW.id, admin_id;

      -- If no regular admin found, try affiliate_admin
      IF admin_id IS NULL THEN
        SELECT user_id INTO admin_id
        FROM public.user_profiles
        WHERE role = 'affiliate_admin'
        ORDER BY created_at ASC
        LIMIT 1;
        RAISE LOG 'handle_new_user: Affiliate admin lookup result for student %: admin_id = %', NEW.id, admin_id;
      END IF;

      -- Only proceed if we found an admin
      IF admin_id IS NOT NULL THEN
        RAISE LOG 'handle_new_user: Creating conversation for student % with admin %', NEW.id, admin_id;
        
        -- Use helper function to create/get conversation (bypasses RLS)
        conversation_id := public.create_welcome_conversation(admin_id, NEW.id);

        RAISE LOG 'handle_new_user: Conversation created/retrieved for student %: conversation_id = %', NEW.id, conversation_id;

        -- Only insert message if conversation exists
        IF conversation_id IS NOT NULL THEN
          RAISE LOG 'handle_new_user: Inserting welcome message for student %', NEW.id;
          
          -- Use helper function to insert message (bypasses RLS)
          message_inserted := public.insert_welcome_message(
            conversation_id,
            admin_id,
            NEW.id,
            welcome_message_text
          );

          RAISE LOG 'handle_new_user: Welcome message insert result for student %: message_inserted = %', NEW.id, message_inserted;
        ELSE
          RAISE LOG 'handle_new_user: WARNING - Conversation ID is NULL for student %', NEW.id;
        END IF;
      ELSE
        RAISE LOG 'handle_new_user: WARNING - No admin found for student %', NEW.id;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Proteção extra: se QUALQUER coisa falhar nesta seção, apenas loga
      -- e continua com o registro do usuário normalmente
      RAISE LOG 'Error in welcome message section for student %: %', NEW.id, SQLERRM;
      RAISE LOG 'Error details: SQLSTATE = %, SQLERRM = %', SQLSTATE, SQLERRM;
      -- NÃO re-raise a exceção - permite que o registro continue
    END;

    -- ✅ NOVO: Registrar automaticamente terms_of_service e privacy_policy para estudantes
    -- IMPORTANTE: Esta seção está isolada em um bloco BEGIN/EXCEPTION
    -- para garantir que QUALQUER erro aqui NÃO quebre o registro do usuário
    BEGIN
      RAISE LOG 'handle_new_user: Starting auto-accept terms process for student %', NEW.id;

      -- Buscar termos ativos
      SELECT id INTO terms_service_id
      FROM public.application_terms
      WHERE term_type = 'terms_of_service'
      AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1;

      SELECT id INTO privacy_policy_id
      FROM public.application_terms
      WHERE term_type = 'privacy_policy'
      AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1;

      RAISE LOG 'handle_new_user: Terms lookup for student %: terms_service_id = %, privacy_policy_id = %', NEW.id, terms_service_id, privacy_policy_id;

      -- Registrar aceite de Terms of Service se existir termo ativo
      IF terms_service_id IS NOT NULL THEN
        INSERT INTO public.comprehensive_term_acceptance (
          user_id,
          term_id,
          term_type,
          accepted_at,
          ip_address,
          user_agent,
          created_at
        )
        VALUES (
          NEW.id,
          terms_service_id,
          'terms_of_service',
          NOW(),
          NULL, -- IP não disponível no trigger
          'System Auto-Accept (Registration)', -- Identificar como aceite automático
          NOW()
        )
        ON CONFLICT (user_id, term_id) DO NOTHING; -- Evitar duplicatas;

        RAISE LOG 'handle_new_user: Terms of Service auto-accepted for student %', NEW.id;
      ELSE
        RAISE LOG 'handle_new_user: WARNING - No active Terms of Service found for student %', NEW.id;
      END IF;

      -- Registrar aceite de Privacy Policy se existir termo ativo
      IF privacy_policy_id IS NOT NULL THEN
        INSERT INTO public.comprehensive_term_acceptance (
          user_id,
          term_id,
          term_type,
          accepted_at,
          ip_address,
          user_agent,
          created_at
        )
        VALUES (
          NEW.id,
          privacy_policy_id,
          'privacy_policy',
          NOW(),
          NULL, -- IP não disponível no trigger
          'System Auto-Accept (Registration)', -- Identificar como aceite automático
          NOW()
        )
        ON CONFLICT (user_id, term_id) DO NOTHING; -- Evitar duplicatas;

        RAISE LOG 'handle_new_user: Privacy Policy auto-accepted for student %', NEW.id;
      ELSE
        RAISE LOG 'handle_new_user: WARNING - No active Privacy Policy found for student %', NEW.id;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail user registration
      RAISE LOG 'Error auto-accepting registration terms for student %: %', NEW.id, SQLERRM;
      RAISE LOG 'Error details: SQLSTATE = %, SQLERRM = %', SQLSTATE, SQLERRM;
    END;
  END IF;

  -- ✅ Create newsletter preferences based on consent
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
    RAISE LOG 'Error details: SQLSTATE = %, SQLERRM = %', SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger function has the right permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Comentário explicativo
COMMENT ON FUNCTION public.handle_new_user() IS 
'Cria perfil de usuário, entrada de universidade (se role=school), envia mensagem de boas-vindas no chat (se role=student), registra automaticamente aceite de terms_of_service e privacy_policy para estudantes, e cria preferências de newsletter baseadas em consentimento. Usa funções helper com SECURITY DEFINER para bypass de políticas RLS.';
