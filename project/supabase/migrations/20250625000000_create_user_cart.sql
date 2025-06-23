CREATE TABLE public.user_cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scholarship_id UUID NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, scholarship_id)
);

ALTER TABLE public.user_cart ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own cart"
ON public.user_cart
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id); 