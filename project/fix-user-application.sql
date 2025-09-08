-- Script para corrigir o problema do usuário saioa7769@uorak.com
-- ID: 02c8c51b-ad78-43af-93e1-4d162ebb82bf

-- PRIMEIRO: Verificar se o usuário existe e tem perfil
DO $$
DECLARE
    user_exists boolean := false;
    profile_exists boolean := false;
    user_id uuid := '02c8c51b-ad78-43af-93e1-4d162ebb82bf';
    user_email text := 'saioa7769@uorak.com';
BEGIN
    -- Verificar se o usuário existe
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'Usuário não encontrado na tabela auth.users';
    END IF;
    
    -- Verificar se o perfil existe
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE user_id = user_id) INTO profile_exists;
    
    IF NOT profile_exists THEN
        RAISE EXCEPTION 'Perfil não encontrado na tabela user_profiles';
    END IF;
    
    RAISE NOTICE 'Usuário e perfil encontrados. Prosseguindo com a correção...';
END $$;

-- SEGUNDO: Verificar se há aplicação existente
SELECT 
    'Verificando aplicações existentes' as step,
    COUNT(*) as total_applications
FROM scholarship_applications 
WHERE student_id = '02c8c51b-ad78-43af-93e1-4d162ebb82bf';

-- TERCEIRO: Se não houver aplicação, criar uma baseada no perfil do usuário
DO $$
DECLARE
    user_id uuid := '02c8c51b-ad78-43af-93e1-4d162ebb82bf';
    selected_scholarship_id uuid;
    application_count integer;
    new_application_id uuid;
BEGIN
    -- Verificar quantas aplicações o usuário tem
    SELECT COUNT(*) INTO application_count
    FROM scholarship_applications 
    WHERE student_id = user_id;
    
    -- Se não tiver aplicação, criar uma
    IF application_count = 0 THEN
        -- Buscar a bolsa selecionada no perfil
        SELECT up.selected_scholarship_id INTO selected_scholarship_id
        FROM user_profiles up
        WHERE up.user_id = user_id;
        
        -- Se não tiver bolsa selecionada, usar a primeira disponível
        IF selected_scholarship_id IS NULL THEN
            SELECT s.id INTO selected_scholarship_id
            FROM scholarships s
            WHERE s.is_active = true
            LIMIT 1;
            
            RAISE NOTICE 'Nenhuma bolsa selecionada. Usando primeira bolsa disponível: %', selected_scholarship_id;
        END IF;
        
        -- Criar a aplicação
        INSERT INTO scholarship_applications (
            student_id,
            scholarship_id,
            status,
            applied_at,
            payment_status,
            is_application_fee_paid,
            is_scholarship_fee_paid,
            student_process_type,
            created_at,
            updated_at
        ) VALUES (
            user_id,
            selected_scholarship_id,
            'pending',
            NOW(),
            'pending',
            false,
            false,
            'Initial',
            NOW(),
            NOW()
        ) RETURNING id INTO new_application_id;
        
        RAISE NOTICE 'Nova aplicação criada com ID: %', new_application_id;
        
        -- Atualizar o perfil para marcar que tem aplicação
        UPDATE user_profiles 
        SET 
            selected_scholarship_id = selected_scholarship_id,
            updated_at = NOW()
        WHERE user_id = user_id;
        
        RAISE NOTICE 'Perfil atualizado com selected_scholarship_id';
        
    ELSE
        RAISE NOTICE 'Usuário já possui % aplicação(ões)', application_count;
    END IF;
END $$;

-- QUARTO: Verificar se os campos de pagamento existem na tabela
DO $$
DECLARE
    column_exists boolean;
BEGIN
    -- Verificar se payment_status existe
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scholarship_applications' 
        AND column_name = 'payment_status'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'Campo payment_status não existe. Executando migração...';
        
        -- Adicionar campos faltantes
        ALTER TABLE scholarship_applications 
        ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS paid_at timestamptz,
        ADD COLUMN IF NOT EXISTS is_application_fee_paid boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_scholarship_fee_paid boolean DEFAULT false;
        
        RAISE NOTICE 'Campos de pagamento adicionados com sucesso';
    ELSE
        RAISE NOTICE 'Campos de pagamento já existem';
    END IF;
END $$;

-- QUINTO: Sincronizar status de pagamento baseado no perfil
UPDATE scholarship_applications 
SET 
    is_application_fee_paid = up.is_application_fee_paid,
    is_scholarship_fee_paid = up.is_scholarship_fee_paid,
    payment_status = CASE 
        WHEN up.is_application_fee_paid AND up.is_scholarship_fee_paid THEN 'paid'
        WHEN up.is_application_fee_paid THEN 'partial_paid'
        ELSE 'pending'
    END,
    updated_at = NOW()
FROM user_profiles up
WHERE scholarship_applications.student_id = up.user_id
  AND up.user_id = '02c8c51b-ad78-43af-93e1-4d162ebb82bf';

-- SEXTO: Verificar resultado final
SELECT 
    'RESULTADO FINAL' as status,
    sa.id as application_id,
    sa.student_id,
    sa.scholarship_id,
    sa.status as application_status,
    sa.payment_status,
    sa.is_application_fee_paid,
    sa.is_scholarship_fee_paid,
    sa.created_at,
    sa.updated_at
FROM scholarship_applications sa
WHERE sa.student_id = '02c8c51b-ad78-43af-93e1-4d162ebb82bf';

-- SÉTIMO: Verificar perfil atualizado
SELECT 
    'PERFIL ATUALIZADO' as status,
    up.id,
    up.user_id,
    up.full_name,
    up.email,
    up.is_application_fee_paid,
    up.is_scholarship_fee_paid,
    up.has_paid_selection_process_fee,
    up.selected_scholarship_id,
    up.documents_status,
    up.updated_at
FROM user_profiles up
WHERE up.user_id = '02c8c51b-ad78-43af-93e1-4d162ebb82bf';
