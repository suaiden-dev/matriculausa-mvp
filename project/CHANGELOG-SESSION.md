# Session Changelog — 2026-05-08

---

## 1. Transfer Form Proof (Comprovante de Envio do Formulário de Transferência)

### Problema
Alunos de transferência precisavam comprovar que enviaram o formulário para a escola atual, mas não havia nenhum fluxo para isso.

### Migrations criadas
- `20260508000003_add_transfer_proof_to_school.sql` — adicionou 3 colunas em `scholarship_applications`:
  - `transfer_proof_to_school_url TEXT`
  - `transfer_proof_to_school_at TIMESTAMPTZ`
  - `transfer_proof_to_school_status TEXT` com check `(pending | confirmed | submitted | viewed)`
- `20260508000004_add_transfer_proof_to_admin_rpc.sql` — recriou a RPC `get_admin_student_full_details` incluindo as 3 novas colunas
- `20260508000005_add_confirmed_to_transfer_proof_status.sql` — adicionou o status `confirmed` ao check constraint

### Frontend
- `src/components/DocumentRequestsCard.tsx` — integrou comprovante dentro do card de download do formulário. 3 estados: `pending` (botão "Sim, já enviei"), `confirmed` (upload), `submitted` (badge verde + link)
- `src/components/AdminDashboard/StudentDetails/TransferFormSection.tsx` — estado `confirmed` adicionado, botão "Marcar como Visualizado" removido, badge amarela removida
- `src/i18n/locales/pt|en|es/dashboard.json` — chaves em `studentDashboard.documentRequests.forms.transferProofToSchool.*`

---

## 2. Nova Role `affiliate` — MatriculaRewards para não-alunos

### Problema
Pessoas que não são alunos queriam participar do MatriculaRewards sem passar pelo fluxo de candidatura de aluno.

### Migration criada
- `20260508000006_add_affiliate_role.sql` — adicionou `affiliate` ao check constraint de `user_profiles.role`

### Arquivos criados

**`src/pages/AffiliateRegistration.tsx`** — `/affiliate/register`
- Layout: gradiente azul, cards de benefícios à esquerda, formulário branco à direita
- Campos: Nome, Email, Telefone (PhoneInput com seletor de país), Senha, Confirmar senha
- Sem placeholders | Eye/EyeOff | barra de força da senha | indicador de match | checklist de requisitos
- Copy no estilo da MatriculaRewardsLanding (headline com gradiente amarelo, 3 cards de benefício)
- `emailRedirectTo` apontando para `/auth/callback` para login automático após confirmação
- Pós-signup com sessão: atualiza perfil + cria código de afiliado + vai para dashboard
- Pós-signup sem sessão: mostra `EmailConfirmationScreen` com reenvio de email

**`src/pages/AffiliateDashboard/index.tsx`** — `/affiliate/dashboard`
- Sem header próprio, renderiza `<MatriculaRewards />` diretamente

### Arquivos editados

- `src/hooks/useAuth.tsx` — `'affiliate'` adicionado aos tipos; `buildUser` prioriza `user_metadata.role` quando profile está como `student` default
- `src/components/AuthRedirect.tsx` — proteção de rotas e redirecionamento pós-login para `affiliate`
- `src/pages/Auth323NetworkCallback.tsx` — sincroniza `user_profiles.role` após confirmação de email; redirect por role em vez de hardcoded `/student/dashboard`
- `src/App.tsx` — lazy imports e rotas `/affiliate/register` e `/affiliate/dashboard`
- `src/pages/MatriculaRewardsLanding.tsx` — CTA aponta para `/affiliate/register`
- `src/components/Header.tsx` — `getDashboardPath` e `getDashboardLabel` com case `affiliate`
- `src/components/Footer.tsx` — link "Torne-se Afiliado" → `/affiliate/register`

---

## 3. Fix — Bolsas inativas e de teste aparecendo em `/scholarships`

### Problema
Bolsas da Migma (`is_active = false`) e bolsas de teste (`is_test = true`) apareciam na página pública de scholarships.

### Causa
`useScholarships.ts` buscava todas as bolsas sem nenhum filtro.

### Fix — `src/hooks/useScholarships.ts`
Adicionados filtros na query:
```ts
.eq('is_active', true)
.neq('is_test', true)
```

### Ação pendente no banco
```sql
UPDATE scholarships SET is_active = false WHERE is_test = true;
```
As bolsas da Migma já estão com `is_active = false` — o fix de código já as esconde automaticamente.

---

## Pendências — Aplicar no Supabase Dashboard

| Item | Tipo | Status |
|---|---|---|
| `20260508000003_add_transfer_proof_to_school.sql` | Migration | Pendente |
| `20260508000004_add_transfer_proof_to_admin_rpc.sql` | Migration | Pendente |
| `20260508000005_add_confirmed_to_transfer_proof_status.sql` | Migration | Pendente |
| `20260508000006_add_affiliate_role.sql` | Migration | Pendente |
| `UPDATE scholarships SET is_active = false WHERE is_test = true` | SQL | Pendente |
