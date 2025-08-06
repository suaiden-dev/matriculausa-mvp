-- Trigger function para atualizar prompt quando documento é transcrito
CREATE OR REPLACE FUNCTION handle_document_transcription_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Só executar quando o status mudar para 'completed'
  IF NEW.transcription_status = 'completed' AND OLD.transcription_status != 'completed' THEN
    -- Removido: Chamar a edge function para atualizar o prompt via net.http_post
    -- Agora, a atualização do prompt é feita diretamente no frontend ou por outro mecanismo.
    
    RAISE NOTICE 'Trigger executado: documento % transcrito, atualizando prompt para configuração %', NEW.id, NEW.ai_configuration_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger na tabela ai_agent_knowledge_documents
DROP TRIGGER IF EXISTS trigger_document_transcription_update ON ai_agent_knowledge_documents;
CREATE TRIGGER trigger_document_transcription_update
  AFTER UPDATE ON ai_agent_knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION handle_document_transcription_update();

-- Comentário explicativo
COMMENT ON FUNCTION handle_document_transcription_update() IS 'Atualiza automaticamente o prompt do agente AI quando um documento é transcrito com sucesso';
COMMENT ON TRIGGER trigger_document_transcription_update ON ai_agent_knowledge_documents IS 'Dispara atualização de prompt quando transcrição é completada'; 