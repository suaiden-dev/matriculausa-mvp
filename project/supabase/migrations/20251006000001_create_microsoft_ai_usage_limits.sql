-- Create ai_usage_limits table for Microsoft AI Agents chatbot
-- This table tracks daily prompt usage per session to limit free tier usage

BEGIN;

-- Create table
CREATE TABLE IF NOT EXISTS public.ai_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  prompts_used INTEGER DEFAULT 0,
  max_prompts INTEGER DEFAULT 5,
  last_prompt_at TIMESTAMPTZ,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one record per university per session
  CONSTRAINT ai_usage_limits_unique_session UNIQUE(university_id, session_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_limits_university_id 
  ON public.ai_usage_limits(university_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_limits_session_id 
  ON public.ai_usage_limits(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_limits_reset_at 
  ON public.ai_usage_limits(reset_at);

-- Enable RLS
ALTER TABLE public.ai_usage_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage all records
DROP POLICY IF EXISTS "ai_usage_limits_service_role" ON public.ai_usage_limits;
CREATE POLICY "ai_usage_limits_service_role" 
  ON public.ai_usage_limits
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Policy: Users can view their own usage
DROP POLICY IF EXISTS "ai_usage_limits_select_own" ON public.ai_usage_limits;
CREATE POLICY "ai_usage_limits_select_own" 
  ON public.ai_usage_limits
  FOR SELECT
  USING (university_id = auth.uid());

-- Function: Check if user can use AI (within limits)
CREATE OR REPLACE FUNCTION public.check_ai_usage_limit(
  p_university_id UUID,
  p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usage_record RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_can_use BOOLEAN := TRUE;
  v_prompts_used INTEGER := 0;
  v_max_prompts INTEGER := 5;
  v_remaining_prompts INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Try to get existing usage record
  SELECT * INTO v_usage_record
  FROM public.ai_usage_limits
  WHERE university_id = p_university_id
    AND session_id = p_session_id;

  -- If record doesn't exist, user can use (will be created on increment)
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_use', TRUE,
      'prompts_used', 0,
      'max_prompts', v_max_prompts,
      'remaining_prompts', v_max_prompts,
      'reset_at', NULL,
      'is_new_session', TRUE
    );
  END IF;

  -- Check if reset time has passed (24 hours from creation)
  IF v_now >= v_usage_record.reset_at THEN
    -- Reset the counter
    UPDATE public.ai_usage_limits
    SET prompts_used = 0,
        reset_at = v_now + INTERVAL '24 hours',
        updated_at = v_now
    WHERE university_id = p_university_id
      AND session_id = p_session_id;
    
    v_prompts_used := 0;
    v_max_prompts := v_usage_record.max_prompts;
    v_can_use := TRUE;
    v_reset_at := v_now + INTERVAL '24 hours';
  ELSE
    -- Check current usage
    v_prompts_used := v_usage_record.prompts_used;
    v_max_prompts := v_usage_record.max_prompts;
    v_reset_at := v_usage_record.reset_at;
    
    -- Check if limit reached
    IF v_prompts_used >= v_max_prompts THEN
      v_can_use := FALSE;
    END IF;
  END IF;

  v_remaining_prompts := v_max_prompts - v_prompts_used;

  RETURN jsonb_build_object(
    'can_use', v_can_use,
    'prompts_used', v_prompts_used,
    'max_prompts', v_max_prompts,
    'remaining_prompts', v_remaining_prompts,
    'reset_at', v_reset_at,
    'is_new_session', FALSE
  );
END;
$$;

-- Function: Increment AI usage counter
CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_university_id UUID,
  p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_reset_at TIMESTAMPTZ := v_now + INTERVAL '24 hours';
  v_max_prompts INTEGER := 5;
  v_prompts_used INTEGER;
  v_remaining_prompts INTEGER;
BEGIN
  -- Insert or update usage record
  INSERT INTO public.ai_usage_limits (
    university_id,
    session_id,
    prompts_used,
    max_prompts,
    last_prompt_at,
    reset_at,
    created_at,
    updated_at
  )
  VALUES (
    p_university_id,
    p_session_id,
    1,
    v_max_prompts,
    v_now,
    v_reset_at,
    v_now,
    v_now
  )
  ON CONFLICT (university_id, session_id) 
  DO UPDATE SET
    prompts_used = CASE
      -- Reset if past reset time
      WHEN v_now >= ai_usage_limits.reset_at THEN 1
      -- Otherwise increment
      ELSE ai_usage_limits.prompts_used + 1
    END,
    reset_at = CASE
      -- Reset timer if past reset time
      WHEN v_now >= ai_usage_limits.reset_at THEN v_reset_at
      -- Otherwise keep existing
      ELSE ai_usage_limits.reset_at
    END,
    last_prompt_at = v_now,
    updated_at = v_now
  RETURNING prompts_used, max_prompts, reset_at
  INTO v_prompts_used, v_max_prompts, v_reset_at;

  v_remaining_prompts := v_max_prompts - v_prompts_used;

  RETURN jsonb_build_object(
    'prompts_used', v_prompts_used,
    'max_prompts', v_max_prompts,
    'remaining_prompts', v_remaining_prompts,
    'reset_at', v_reset_at
  );
END;
$$;

-- Function: Clean up old usage records (optional, for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_ai_usage_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete records older than 30 days past their reset time
  DELETE FROM public.ai_usage_limits
  WHERE reset_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_ai_usage_limit(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_ai_usage_limits() TO service_role;

COMMIT;

