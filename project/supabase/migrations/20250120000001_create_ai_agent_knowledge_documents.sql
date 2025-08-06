-- Create table for AI agent knowledge base documents
CREATE TABLE IF NOT EXISTS ai_agent_knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_configuration_id uuid REFERENCES ai_configurations(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_agent_knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_agent_knowledge_documents
CREATE POLICY "Users can view documents for their AI agents"
  ON ai_agent_knowledge_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_configurations 
      WHERE ai_configurations.id = ai_agent_knowledge_documents.ai_configuration_id 
      AND ai_configurations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents for their AI agents"
  ON ai_agent_knowledge_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_configurations 
      WHERE ai_configurations.id = ai_agent_knowledge_documents.ai_configuration_id 
      AND ai_configurations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents for their AI agents"
  ON ai_agent_knowledge_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_configurations 
      WHERE ai_configurations.id = ai_agent_knowledge_documents.ai_configuration_id 
      AND ai_configurations.user_id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX idx_ai_agent_knowledge_documents_config_id ON ai_agent_knowledge_documents(ai_configuration_id);
CREATE INDEX idx_ai_agent_knowledge_documents_uploaded_by ON ai_agent_knowledge_documents(uploaded_by_user_id); 