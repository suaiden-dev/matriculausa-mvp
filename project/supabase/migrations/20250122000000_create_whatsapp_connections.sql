-- Criar tabela whatsapp_connections
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid REFERENCES universities(id) ON DELETE CASCADE,
  ai_configuration_id uuid REFERENCES ai_configurations(id) ON DELETE CASCADE,
  phone_number text,
  connection_status text DEFAULT 'connecting' CHECK (connection_status IN ('connecting', 'connected', 'disconnected', 'error')),
  connected_at timestamptz,
  disconnected_at timestamptz,
  instance_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view their own whatsapp connections" ON public.whatsapp_connections
  FOR SELECT USING (
    university_id IN (
      SELECT id FROM universities WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own whatsapp connections" ON public.whatsapp_connections
  FOR INSERT WITH CHECK (
    university_id IN (
      SELECT id FROM universities WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own whatsapp connections" ON public.whatsapp_connections
  FOR UPDATE USING (
    university_id IN (
      SELECT id FROM universities WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own whatsapp connections" ON public.whatsapp_connections
  FOR DELETE USING (
    university_id IN (
      SELECT id FROM universities WHERE user_id = auth.uid()
    )
  );

-- Criar índices para performance
CREATE INDEX idx_whatsapp_connections_university_id ON public.whatsapp_connections(university_id);
CREATE INDEX idx_whatsapp_connections_ai_configuration_id ON public.whatsapp_connections(ai_configuration_id);
CREATE INDEX idx_whatsapp_connections_connection_status ON public.whatsapp_connections(connection_status);
CREATE INDEX idx_whatsapp_connections_instance_name ON public.whatsapp_connections(instance_name);

-- Trigger para updated_at
CREATE TRIGGER update_whatsapp_connections_updated_at 
  BEFORE UPDATE ON public.whatsapp_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 