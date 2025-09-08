# Correção do Sistema de Documentos dos Estudantes

## Problema Identificado

O sistema estava falhando ao salvar os 43 documentos que o aluno enviava quando clicava em "Manual Review" devido aos seguintes problemas:

### 1. Tabela `student_documents` Ausente
- A tabela `student_documents` não existia no banco de dados
- O sistema tentava inserir documentos nessa tabela inexistente
- Isso causava falhas silenciosas no processo de salvamento

### 2. Erro na Interface de Visualização
- A função `handleViewDocument` estava sendo chamada com documentos `undefined`
- Isso causava o erro: `Cannot read properties of undefined (reading 'file_url')`
- Os botões de visualização apareciam mesmo quando não havia documentos

### 3. Fluxo de Manual Review Incompleto
- O sistema não conseguia persistir os documentos enviados durante o manual review
- Os documentos ficavam apenas no localStorage temporariamente
- Não havia sincronização com o banco de dados

## Solução Implementada

### 1. Criação da Tabela `student_documents`

Criada uma nova migração (`20250125000001_create_student_documents_table.sql`) que:

```sql
CREATE TABLE IF NOT EXISTS public.student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('passport', 'diploma', 'funds_proof')),
    file_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'changes_requested')),
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Características da Tabela:**
- Validação de tipos de documento (passport, diploma, funds_proof)
- Controle de status com valores permitidos
- Rastreamento de timestamps para auditoria
- Suporte a rejeições com justificativa

### 2. Políticas de Segurança (RLS)

Implementadas políticas de Row Level Security:

- **Usuários**: Podem ver, inserir, atualizar e deletar apenas seus próprios documentos
- **Administradores**: Podem ver e atualizar todos os documentos
- **Escolas**: Podem ver documentos de seus estudantes

### 3. Correção da Interface

**Problema Corrigido:**
- Adicionada verificação de segurança na função `handleViewDocument`
- Botões de visualização só aparecem quando há documentos válidos
- Prevenção de chamadas com parâmetros `undefined`

**Antes:**
```tsx
<button onClick={() => handleViewDocument(d)}>
  View Document
</button>
```

**Depois:**
```tsx
{d?.file_url && (
  <button onClick={() => handleViewDocument(d)}>
    View Document
  </button>
)}
```

### 4. Índices de Performance

Criados índices para otimizar consultas:

```sql
CREATE INDEX idx_student_documents_user_id ON public.student_documents(user_id);
CREATE INDEX idx_student_documents_type ON public.student_documents(type);
CREATE INDEX idx_student_documents_status ON public.student_documents(status);
CREATE INDEX idx_student_documents_uploaded_at ON public.student_documents(uploaded_at);
```

### 5. Trigger de Atualização Automática

Implementado trigger para manter `updated_at` sempre atualizado:

```sql
CREATE TRIGGER update_student_documents_updated_at 
    BEFORE UPDATE ON public.student_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## Como Aplicar a Correção

### 1. Executar a Migração

No seu banco de dados Supabase, execute o script:

```bash
# Via SQL Editor no Supabase Dashboard
# Copie e cole o conteúdo de: project/apply-student-documents-migration.sql
```

### 2. Verificar a Instalação

Após executar a migração, verifique se a tabela foi criada:

```sql
-- Verificar estrutura da tabela
SELECT * FROM information_schema.columns 
WHERE table_name = 'student_documents';

-- Verificar políticas RLS
SELECT * FROM pg_policies 
WHERE tablename = 'student_documents';
```

### 3. Testar o Sistema

1. Faça login como estudante
2. Faça upload de documentos
3. Clique em "Manual Review"
4. Verifique se os documentos são salvos corretamente
5. Confirme que não há mais erros de `undefined`

## Benefícios da Correção

### 1. Persistência de Dados
- Documentos são salvos permanentemente no banco de dados
- Não há mais perda de dados durante o processo de manual review
- Rastreamento completo do histórico de documentos

### 2. Segurança
- Controle de acesso baseado em roles
- Usuários só podem acessar seus próprios documentos
- Políticas RLS configuradas adequadamente

### 3. Performance
- Índices otimizados para consultas frequentes
- Trigger automático para timestamps
- Estrutura de dados normalizada

### 4. Manutenibilidade
- Código mais robusto com verificações de segurança
- Interface que só mostra funcionalidades disponíveis
- Logs de debug para facilitar troubleshooting

## Próximos Passos Recomendados

### 1. Monitoramento
- Implementar logs de auditoria para operações de documentos
- Monitorar performance das consultas à tabela
- Verificar uso de storage para otimização de custos

### 2. Funcionalidades Adicionais
- Sistema de notificações para mudanças de status
- Histórico de revisões com comentários
- Integração com sistema de aprovação automática

### 3. Testes
- Testes unitários para as funções de documento
- Testes de integração para o fluxo completo
- Testes de carga para verificar performance

## Arquivos Modificados

1. **Nova migração**: `project/supabase/migrations/20250125000001_create_student_documents_table.sql`
2. **Script de aplicação**: `project/apply-student-documents-migration.sql`
3. **Interface corrigida**: `project/src/pages/SchoolDashboard/StudentDetails.tsx`
4. **Documentação**: `project/STUDENT_DOCUMENTS_FIX_DOCUMENTATION.md`

## Conclusão

A correção implementada resolve o problema fundamental de persistência de documentos e melhora significativamente a robustez do sistema. Os estudantes agora podem enviar documentos com confiança, sabendo que serão salvos corretamente no banco de dados e estarão disponíveis para revisão pelas universidades.
