# Bug: `receive-migma-transfer-form` não grava `transfer_proof_to_school_url`

**Data:** 24/06/2026  
**Componente afetado:** "Comprovante de Envio para Escola Atual" no painel admin do MatriculaUSA

---

## Contexto

Quando o aluno (transfer student) preenche e envia o Transfer Form na Migma, o sistema da Migma chama uma edge function do MatriculaUSA para notificar que o comprovante está disponível. No painel admin do MatriculaUSA existe um componente chamado **"Comprovante de Envio para Escola Atual"** que deveria exibir esse documento — mas continua mostrando **"Aguardando confirmação do aluno"** mesmo após o aluno enviar.

---

## Fluxo esperado

```
Aluno sobe transfer form preenchido na Migma (StudentDashboard)
        │
        ▼
Migma salva arquivo em migma-student-documents/
        │
        ▼
Migma chama POST /receive-migma-transfer-form no MatriculaUSA
  payload: { student_email, student_name, filled_form_url, migma_application_id }
        │
        ▼
MatriculaUSA grava em scholarship_applications:
  - transfer_proof_to_school_url = filled_form_url
  - transfer_proof_to_school_status = 'submitted'
  - transfer_proof_to_school_at = now()
        │
        ▼
Componente no admin exibe o documento
```

---

## O que está acontecendo

A função `receive-migma-transfer-form` (lado MatriculaUSA) **retorna HTTP 200** mas **não grava os campos** `transfer_proof_to_school_url`, `transfer_proof_to_school_status` e `transfer_proof_to_school_at` na tabela `scholarship_applications`.

Confirmado consultando o banco após o aluno enviar: os três campos ficam `null`.

---

## O que o componente precisa para renderizar

O componente lê diretamente da tabela `scholarship_applications`:

```ts
// lê esses campos:
transfer_proof_to_school_url    // URL do documento
transfer_proof_to_school_status // 'submitted' ou 'viewed' → exibe o doc
transfer_proof_to_school_at     // data de envio (exibição apenas)
```

Só renderiza o documento quando `transfer_proof_to_school_status` é `'submitted'` ou `'viewed'`.

---

## Workaround atual (Migma)

A Migma implementou uma gravação direta via PostgREST (service role) como contorno enquanto a função do MatriculaUSA não é corrigida. O fluxo do workaround:

1. Email do aluno → `user_profiles.id` no MatriculaUSA
2. `user_profiles.id` → `scholarship_applications` mais recente com `transfer_form_url IS NOT NULL` (ou `student_process_type = 'transfer'`)
3. `PATCH scholarship_applications` com os três campos acima

Esse workaround já está deployado e funcionando. No entanto, **o ideal é que a própria função `receive-migma-transfer-form` faça esse trabalho** para que o fluxo não dependa de uma gravação direta externa.

---

## O que precisa ser corrigido

Na função `receive-migma-transfer-form` do MatriculaUSA, após receber o payload, ela precisa executar:

```sql
UPDATE scholarship_applications
SET
  transfer_proof_to_school_url    = '<filled_form_url do payload>',
  transfer_proof_to_school_status = 'submitted',
  transfer_proof_to_school_at     = now()
WHERE student_id = (
  SELECT id FROM user_profiles WHERE email = '<student_email do payload>'
)
AND (
  student_process_type = 'transfer'
  OR transfer_form_url IS NOT NULL
)
ORDER BY created_at DESC
LIMIT 1;
```

Ou equivalente via Supabase client JS/TS.

---

## Payload que a Migma envia

```json
{
  "student_email": "email@exemplo.com",
  "student_name": "Nome do Aluno",
  "filled_form_url": "https://ekxftwrjvxtpnqbraszv.supabase.co/storage/v1/object/sign/...",
  "migma_application_id": "uuid-da-aplicacao-migma"
}
```
