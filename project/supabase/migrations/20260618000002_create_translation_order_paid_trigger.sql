-- Migration: Create trigger to automatically submit paid translation orders to Alpha
-- Date: 2026-06-18

CREATE OR REPLACE FUNCTION public.handle_translation_order_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_key TEXT;
  edge_function_url TEXT;
  request_body JSONB;
BEGIN
  -- Execute only when payment_status changes to 'paid' and alpha_project_number is not set yet
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') AND NEW.alpha_project_number IS NULL THEN
    -- Fetch settings
    BEGIN
      SELECT value INTO service_key 
      FROM public.system_settings 
      WHERE key = 'service_role_key';
      
      SELECT value INTO edge_function_url 
      FROM public.system_settings 
      WHERE key = 'send_to_alpha_edge_function_url';
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error fetching system settings: %', SQLERRM;
    END;

    -- Build payload
    request_body := jsonb_build_object(
      'translation_order_id', NEW.id
    );

    -- Call Edge Function send-to-alpha asynchronously via pg_net
    BEGIN
      PERFORM net.http_post(
        url := COALESCE(edge_function_url, 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1/send-to-alpha'),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(service_key, '')
        ),
        body := request_body
      );
      
      RAISE LOG 'Edge Function send-to-alpha called for order: %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error calling Edge Function send-to-alpha: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_translation_order_paid ON public.translation_orders;
CREATE TRIGGER trg_translation_order_paid
  AFTER UPDATE OF payment_status
  ON public.translation_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_translation_order_paid();
