# Integração MatriculaUSA × Migma — `receive-matriculausa-letter`

**Data:** 23/06/2026

---

## Contexto

O painel do aluno na Migma exibe o status de documentos enviados pela MatriculaUSA:

- **Acceptance Letter** → "Waiting for MatriculaUSA"
- **Transfer Form** → "Not applicable"

Após investigação no código da MatriculaUSA, foi identificado que o webhook `receive-matriculausa-letter` **não estava sendo chamado** em nenhum dos fluxos de envio de documentos. O problema foi corrigido em 23/06/2026, mas o status na Migma ainda não atualiza. Esta documentação descreve o fluxo completo para que a equipe da Migma possa verificar o que pode estar faltando do lado deles.

---

## O que foi corrigido na MatriculaUSA (23/06/2026)

Foram adicionadas chamadas ao endpoint `receive-matriculausa-letter` nos seguintes pontos:

### 1. Acceptance Letter (Initial F-1 e Transfer)

**Arquivo:** `project/src/pages/SchoolDashboard/StudentDetails.tsx`

Após a universidade fazer upload da carta de aceite e atualizar `scholarship_applications.acceptance_letter_url`, agora o sistema chama:

```json
POST /receive-matriculausa-letter
{
  "student_email": "<email do aluno cadastrado na MatriculaUSA>",
  "acceptance_letter_url": "<URL pública do PDF>"
}
```

### 2. Transfer Form — Upload pelo admin

**Arquivo:** `project/src/hooks/useTransferForm.ts`

Quando o admin da MatriculaUSA faz upload do template do Transfer Form para o aluno:

```json
POST /receive-matriculausa-letter
{
  "student_email": "<email do aluno>",
  "transfer_form_url": "<URL pública do PDF>"
}
```

### 3. Transfer Form — Aprovação pelo admin

```json
POST /receive-matriculausa-letter
{
  "student_email": "<email do aluno>",
  "transfer_form_admin_status": "approved"
}
```

### 4. Transfer Form — Rejeição pelo admin

```json
POST /receive-matriculausa-letter
{
  "student_email": "<email do aluno>",
  "transfer_form_admin_status": "rejected",
  "transfer_form_rejection_reason": "<motivo>"
}
```

---

## Header de segurança

Todas as chamadas incluem o header:

```
x-migma-webhook-secret: <valor de VITE_MIGMA_WEBHOOK_SECRET>
```

---

## O que o endpoint `receive-matriculausa-letter` faz (lado Migma)

Conforme lido no código (`supabase/functions/receive-matriculausa-letter/index.ts`):

1. Valida o `x-migma-webhook-secret`
2. Busca o perfil do aluno em `user_profiles` pelo `student_email`
3. Busca a `institution_application` ativa do aluno (status: `payment_confirmed`, `approved`, `submitted`, `pending`, `documents_uploaded`)
4. Atualiza `institution_applications`:
   - Se `acceptance_letter_url`: salva a URL + `acceptance_letter_received_at` + `package_status = 'ready'`
   - Se `transfer_form_url`: salva a URL
   - Se `transfer_form_admin_status`: salva o status + `transfer_form_reviewed_at`
5. Atualiza `user_profiles.onboarding_current_step = 'acceptance_letter'`
6. Dispara `migma-notify` com trigger `acceptance_letter_ready` (quando há acceptance_letter_url)

---

## Possíveis causas para o status não atualizar na Migma

Com base na análise do endpoint e no padrão de problema já visto com os documentos (mapeamento):

### Causa 1 — Email do aluno não coincide

O endpoint busca o aluno por `student_email` na tabela `user_profiles` da Migma. Se o email cadastrado na MatriculaUSA for diferente do email cadastrado na Migma, o lookup retorna vazio e o endpoint responde `404 — Student not found`.

**Verificação:** Confirmar que `user_profiles.email` na Migma é idêntico ao email do aluno na MatriculaUSA (incluindo maiúsculas/minúsculas e espaços).

### Causa 2 — Nenhuma `institution_application` ativa encontrada

O endpoint filtra por status:
```sql
status IN ('payment_confirmed', 'approved', 'submitted', 'pending', 'documents_uploaded')
```

Se a aplicação do aluno estiver em outro status (ex: `enrolled`, `cancelled`, `completed`), o endpoint retorna `404 — Active application not found` e nada é atualizado.

**Verificação:** Confirmar qual é o `status` atual da `institution_application` do aluno de teste na Migma.

### Causa 3 — O webhook estava sendo chamado antes da correção de hoje

Como o webhook **não era chamado antes de 23/06/2026**, todos os alunos que receberam acceptance letter ou transfer form antes dessa data nunca tiveram `institution_applications.acceptance_letter_url` populado na Migma. Para esses alunos, é necessário ou:
- Reenviar manualmente via chamada ao endpoint
- Ou fazer um backfill direto no banco

### Causa 4 — A UI da Migma não lê os campos corretos

Semelhante ao problema que aconteceu com o mapeamento de documentos (os arquivos existiam mas não apareciam na UI porque o slot não estava mapeado), é possível que a UI do painel do aluno na Migma leia um campo diferente de `acceptance_letter_url` ou `transfer_form_url` para exibir os status "Waiting for MatriculaUSA" / "Received".

**Verificação:** Confirmar qual campo em `institution_applications` (ou em outra tabela) controla o que é exibido no painel do aluno como status da Acceptance Letter e do Transfer Form.

---

## Sugestão de diagnóstico

1. Verificar os logs da edge function `receive-matriculausa-letter` no Supabase Dashboard da Migma para ver se há chamadas chegando e quais erros estão sendo retornados
2. Verificar o email do aluno de teste `arecio8703@uorak.com` na tabela `user_profiles` da Migma
3. Verificar o `status` da `institution_application` desse aluno
4. Verificar qual campo a UI do aluno usa para exibir o status "Waiting for MatriculaUSA"

---

## Tipos de processo e o que cada um recebe

| Processo | Acceptance Letter | Transfer Form | I-20 |
|---|---|---|---|
| Initial F-1 | ✅ Enviado via webhook | ❌ Não aplicável | ❌ Não aplicável |
| Transfer | ✅ Enviado via webhook | ✅ Enviado via webhook | ❌ Não aplicável |
| COS | ✅ Enviado via webhook | ❌ Não aplicável | Fluxo interno da Migma (não enviado pela MatriculaUSA) |
