-- Create student action logs table
CREATE TABLE IF NOT EXISTS public.student_action_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'document_upload', 'document_approval', 'fee_payment', 'application_approval', 'profile_update', etc.
    action_description TEXT NOT NULL, -- Human readable description
    performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    performed_by_type TEXT NOT NULL CHECK (performed_by_type IN ('student', 'admin', 'university')),
    performed_by_name TEXT, -- Cached name for performance
    performed_by_email TEXT, -- Cached email for performance
    metadata JSONB, -- Additional data about the action
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_action_logs_student_id ON public.student_action_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_student_action_logs_created_at ON public.student_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_action_logs_action_type ON public.student_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_student_action_logs_performed_by ON public.student_action_logs(performed_by);

-- RLS policies
ALTER TABLE public.student_action_logs ENABLE ROW LEVEL SECURITY;

-- Students can view their own logs
CREATE POLICY "Students can view their own logs"
ON public.student_action_logs
FOR SELECT
TO authenticated
USING (
    student_id IN (
        SELECT id FROM public.user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- Admins can view all logs
CREATE POLICY "Admins can view all logs"
ON public.student_action_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Universities can view logs for their students
CREATE POLICY "Universities can view their students' logs"
ON public.student_action_logs
FOR SELECT
TO authenticated
USING (
    student_id IN (
        SELECT up.id FROM public.user_profiles up
        JOIN public.scholarship_applications sa ON sa.student_id = up.id
        JOIN public.scholarships s ON s.id = sa.scholarship_id
        WHERE s.university_id = (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'school'
        )
    )
);

-- Only admins can insert logs
CREATE POLICY "Admins can insert logs"
ON public.student_action_logs
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Function to log student actions
CREATE OR REPLACE FUNCTION log_student_action(
    p_student_id UUID,
    p_action_type TEXT,
    p_action_description TEXT,
    p_performed_by UUID,
    p_performed_by_type TEXT,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
    performer_name TEXT;
    performer_email TEXT;
BEGIN
    -- Get performer details
    SELECT full_name, email 
    INTO performer_name, performer_email
    FROM public.user_profiles 
    WHERE user_id = p_performed_by;
    
    -- Insert log
    INSERT INTO public.student_action_logs (
        student_id,
        action_type,
        action_description,
        performed_by,
        performed_by_type,
        performed_by_name,
        performed_by_email,
        metadata
    ) VALUES (
        p_student_id,
        p_action_type,
        p_action_description,
        p_performed_by,
        p_performed_by_type,
        performer_name,
        performer_email,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;
