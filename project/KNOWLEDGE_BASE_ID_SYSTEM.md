# Sistema de IDs para Base de Conhecimento

## Problema Resolvido

Anteriormente, a base de conhecimento estava sendo sobrescrita toda vez que um novo documento era enviado. Isso causava perda de documentos anteriores e informações importantes.

## Solução Implementada

### 1. Sistema de IDs Únicos

Cada documento na base de conhecimento agora tem um ID único que é preservado no prompt:

```xml
<knowledge-base id="doc_123e4567-e89b-12d3-a456-426614174000">
Documento: manual_empresa.pdf
Conteúdo: [transcrição do documento]
</knowledge-base>
```

### 2. Adição Incremental

Quando novos documentos são enviados:
- O sistema verifica quais documentos já existem no prompt atual
- Apenas documentos novos são adicionados
- Documentos existentes são preservados

### 3. Remoção Seletiva

Quando um documento é deletado:
- O documento é removido do banco de dados
- O documento é removido especificamente do prompt por ID
- Outros documentos permanecem intactos

## Como Funciona

### Upload de Documentos

1. **Upload via `AIAgentKnowledgeUpload`**:
   - Documentos são salvos na tabela `ai_agent_knowledge_documents` com IDs únicos
   - Após upload, a função `update-prompt-with-knowledge` é chamada

2. **Atualização do Prompt**:
   - A função `extractExistingDocumentIds()` extrai IDs de documentos já no prompt
   - A função `generateWhatsAppPromptWithKnowledge()` adiciona apenas novos documentos
   - O prompt é atualizado preservando documentos existentes

### Remoção de Documentos

1. **Deleção via Interface**:
   - Usuário clica em deletar documento
   - Documento é removido do banco de dados
   - Função `remove-document-from-knowledge` é chamada

2. **Remoção do Prompt**:
   - A função `removeDocumentFromPrompt()` remove o documento específico por ID
   - Outros documentos permanecem no prompt

## Edge Functions

### `update-prompt-with-knowledge`

**Função**: Adiciona novos documentos à base de conhecimento sem sobrescrever existentes

**Parâmetros**:
```json
{
  "ai_configuration_id": "uuid"
}
```

**Comportamento**:
- Extrai IDs de documentos existentes no prompt
- Filtra apenas documentos novos com transcrição completa
- Adiciona novos documentos ao prompt existente
- Atualiza apenas se houver mudanças

### `remove-document-from-knowledge`

**Função**: Remove documento específico da base de conhecimento

**Parâmetros**:
```json
{
  "ai_configuration_id": "uuid",
  "document_id": "uuid"
}
```

**Comportamento**:
- Remove documento específico do prompt por ID
- Atualiza configuração de AI
- Preserva outros documentos

## Vantagens do Sistema

1. **Preservação de Dados**: Documentos antigos não são perdidos
2. **Eficiência**: Apenas novos documentos são processados
3. **Controle Granular**: Remoção seletiva de documentos
4. **Rastreabilidade**: Cada documento tem ID único
5. **Performance**: Menos processamento desnecessário

## Fluxo de Dados

```
Upload Documento → Salvar no Banco → Verificar IDs Existentes → Adicionar Apenas Novos → Atualizar Prompt
```

```
Deletar Documento → Remover do Banco → Remover do Prompt por ID → Atualizar Prompt
```

## Logs e Debug

O sistema inclui logs detalhados para debug:

- `✅ Adicionados X novos documentos ao prompt`
- `✅ Nenhum novo documento para adicionar ao prompt`
- `✅ Documento removido da base de conhecimento`
- `✅ Prompt atualizado com novos documentos`

## Compatibilidade

O sistema é totalmente compatível com:
- Documentos existentes
- Configurações de AI existentes
- Interface de usuário atual
- Sistema de transcrição existente

## Processamento Individual de Múltiplos Documentos

### Problema Resolvido

Anteriormente, quando múltiplos documentos eram enviados simultaneamente, apenas o último era considerado. Agora cada documento é processado individualmente com seu próprio ID único.

### Solução Implementada

1. **Processamento Individual**: Cada documento é processado separadamente com seu próprio ID único
2. **Atualização Individual**: O prompt é atualizado para cada documento individualmente
3. **Rastreabilidade**: Cada documento tem seu próprio log de processamento
4. **Resiliência**: Se um documento falhar, os outros continuam sendo processados

### Como Funciona Agora

#### Upload de Múltiplos Documentos

1. **Seleção**: Usuário seleciona múltiplos arquivos
2. **Processamento Individual**: Cada arquivo é processado separadamente:
   - Upload para storage com nome único
   - Inserção no banco com ID único
   - Atualização do prompt individual
3. **Logs Detalhados**: Cada documento tem seu próprio log de processamento

#### Logs de Processamento

```
🔄 Processando documento individual: manual.pdf
✅ Documento salvo no banco com ID: 123e4567-e89b-12d3-a456-426614174000
🔄 Atualizando prompt para documento: 123e4567-e89b-12d3-a456-426614174000
✅ Prompt atualizado para documento: 123e4567-e89b-12d3-a456-426614174000

🔄 Processando documento individual: guia.pdf
✅ Documento salvo no banco com ID: 456e7890-e89b-12d3-a456-426614174001
🔄 Atualizando prompt para documento: 456e7890-e89b-12d3-a456-426614174001
✅ Prompt atualizado para documento: 456e7890-e89b-12d3-a456-426614174001

✅ Todos os documentos processados individualmente: 2
```

### Vantagens do Sistema Individual

1. **IDs Únicos**: Cada documento tem seu próprio ID único
2. **Processamento Independente**: Falha em um documento não afeta os outros
3. **Rastreabilidade**: Logs detalhados para cada documento
4. **Atualização Incremental**: Prompt atualizado para cada documento
5. **Resiliência**: Sistema continua funcionando mesmo com falhas parciais

### Funções Adicionadas

#### `processMultipleDocuments(files: File[])`
- Processa múltiplos documentos individualmente
- Retorna array de documentos processados
- Trata erros individualmente

#### `updatePromptForDocument(documentId: string)`
- Atualiza prompt para um documento específico
- Logs detalhados de cada atualização
- Tratamento de erros individual

### Fluxo de Processamento

```
Selecionar Múltiplos Arquivos
    ↓
Para cada arquivo:
    ↓
1. Upload para Storage
    ↓
2. Salvar no Banco com ID Único
    ↓
3. Atualizar Prompt Individual
    ↓
4. Log de Sucesso
    ↓
Próximo Arquivo...
```

### Tratamento de Erros

- **Erro de Storage**: Pula arquivo e continua com próximo
- **Erro de Banco**: Pula arquivo e continua com próximo  
- **Erro de Prompt**: Loga erro mas não falha o processo
- **Erro Geral**: Continua processando outros arquivos

## Correção de Problema de Edição

### Problema Identificado

Quando o usuário editava um agente AI através da interface, a função `handleSubmitAgent` estava sobrescrevendo completamente o `final_prompt` com um novo prompt base, removendo toda a base de conhecimento que foi adicionada anteriormente.

### Solução Implementada

1. **Preservação de Base de Conhecimento**: Quando um agente existente é editado, apenas as configurações básicas são atualizadas (nome, tipo, personalidade), preservando o `final_prompt` existente.

2. **Função de Atualização Segura**: Criada a função `updatePromptBasePreservingKnowledge()` que permite atualizar o prompt base preservando a base de conhecimento existente.

3. **Verificação de Prompt Existente**: O sistema verifica se o agente já tem um `final_prompt` antes de decidir se deve preservar ou criar um novo.

### Como Funciona Agora

- **Edição de Agente**: Apenas configurações básicas são atualizadas, preservando a base de conhecimento
- **Novo Agente**: Prompt base é criado normalmente
- **Atualização de Prompt Base**: Se necessário, pode ser feita preservando a base de conhecimento

### Logs Adicionais

- `✅ Preservando base de conhecimento existente para agente: [id]`
- `✅ Prompt base atualizado preservando base de conhecimento` 