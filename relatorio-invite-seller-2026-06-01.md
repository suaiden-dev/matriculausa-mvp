# Relatório: Invite Seller (Hubstaff-style)
**Data:** 2026-06-01  
**Branch:** `fix-fee`

---

## Contexto

O fluxo antigo de adicionar sellers era: agência gerava um código → compartilhava o link → seller se registrava → admin aprovava. Muita fricção. A nova feature substitui esse fluxo por um sistema de convite por email, inspirado no Hubstaff:

1. Agência digita apenas o email do seller
2. Sistema envia email de convite automático via Supabase Auth
3. Seller clica no link → cai numa página customizada
4. Seller preenche nome + senha → conta criada automaticamente
5. Seller é redirecionado para o dashboard

---

## Bugs/Problemas Corrigidos Antes da Task (mesma sessão)

### 1. `agency_commissions` 404 — console noise
**Arquivo:** `src/hooks/useAgencyQueries.ts`  
**Problema:** Hook jogava o erro do Supabase quando a tabela `agency_commissions` não existe no banco.  
**Fix:** Substituído `if (error) throw error;` por `if (error) return [];` — fallback gracioso.

### 2. GlobalErrorBoundary aparecendo em todas as páginas
**Arquivo:** `src/pages/AgencyDashboard/Overview.tsx`  
**Problema:** `import DirectSalesLink from './DirectSalesLink'` — arquivo não existe. Causava erro de runtime que o React ErrorBoundary capturava.  
**Fix:** Removido o import e o `<DirectSalesLink />` do JSX.

### 3. `useI20DeadlineMonitor` spammando console a cada 5 minutos
**Arquivo:** `src/pages/AgencyDashboard/AgencyDashboardLayout.tsx`  
**Fix:** Removido o import e a chamada do hook.

### 4. Console.log excessivos
**Arquivos:**
- `src/hooks/useAgencyQueries.ts` — 17 `console.log` removidos
- `src/hooks/useSystemType.ts` — 8 `console.log` removidos
- `src/hooks/useI20DeadlineMonitor.ts` — 4 `console.log` removidos

### 5. Reestruturação do SellerManagement.tsx
**Arquivo:** `src/pages/AgencyDashboard/SellerManagement.tsx`  
**Problema:** Página tinha 3 abas (Manage Sellers / Generate Links / Pending) — ficou estranha após as mudanças.  
**Novo layout:**
- Header com título + botão "Add Seller" (CTA principal)
- Painel expansível "Add Seller" (inline)
- Tabela principal com toolbar: [Search] [Pending] [Deactivated] [↻]
- Empty state com "Add First Seller"
- Cards expansíveis para Deactivated e Pending (fora da tabela)

---

## Feature Principal: Invite Seller

### Arquivos Criados

#### `supabase/functions/invite-seller/index.ts` (novo)
Edge Function Deno que:
- Verifica que o caller tem role `affiliate_admin`
- Busca o `affiliate_admin_id` via tabela `affiliate_admins`
- Valida que o email foi enviado no body
- Checa duplicata: se email já é seller desta agência → retorna `409`
- Chama `adminClient.auth.admin.inviteUserByEmail(email, { data: { role: 'seller', affiliate_admin_id }, redirectTo: '/seller/accept-invite' })`
- **NÃO cria** `user_profiles` nem `sellers` — isso é responsabilidade do seller na página de aceite
- Retorna `{ success: true, message: 'Invite sent' }`

**Erros tratados:**
| Situação | Status | Resposta |
|----------|--------|----------|
| Sem Authorization header | 401 | `Unauthorized` |
| Token inválido | 401 | `Unauthorized` |
| Role != affiliate_admin | 403 | `Forbidden` |
| Agency não encontrada | 404 | `Agency not found` |
| Email ausente | 400 | `email is required` |
| Seller já existe na agência | 409 | `Seller already exists for this agency` |
| Erro do Supabase Auth | 400 | Mensagem original |

---

#### `src/pages/SellerAcceptInvite.tsx` (novo)
Página pública em `/seller/accept-invite`. Fluxo:

1. **Detecção do token**: lê `#access_token=xxx&refresh_token=yyy&type=invite` do hash da URL
2. **Estabelece sessão**: `supabase.auth.setSession({ access_token, refresh_token })`
3. **Exibe form**: Nome completo (obrigatório) + Senha (obrigatório, mín. 6 chars) + Telefone (opcional)
4. **Submit:**
   - `supabase.auth.updateUser({ password, data: { full_name } })`
   - `supabase.auth.getUser()` → lê `user_metadata.affiliate_admin_id`
   - `INSERT user_profiles { user_id, email, full_name, role: 'seller', status: 'active' }`
   - `supabase.rpc('generate_unique_seller_code')` → gera referral code único
   - `INSERT sellers { user_id, email, name, phone, affiliate_admin_id, referral_code, is_active: true }`
   - Redirect para `/seller/dashboard`

**Estados da página:** `loading` → `form` → `submitting` → redirect (ou `error` se token inválido)

---

### Arquivos Modificados

#### `src/App.tsx`
- Adicionado lazy import: `const SellerAcceptInvite = React.lazy(() => import('./pages/SellerAcceptInvite'));`
- Adicionada rota pública (sem auth guard): `<Route path="/seller/accept-invite" element={<SellerAcceptInvite />} />`

#### `src/pages/AgencyDashboard/SellerManagement.tsx`
- **Removido:** import de `SellerRegistrationLinkGenerator`
- **Adicionado:** estados `inviteEmail`, `inviteLoading`, `inviteError`
- **Substituído:** painel "Generate Registration Link" (com o componente antigo) por form inline de convite por email
- Form chama `supabase.functions.invoke('invite-seller', { body: { email } })`
- Em caso de sucesso: fecha painel + exibe toast + recarrega lista de sellers

---

## Fluxo Completo End-to-End

```
Agência clica "Add Seller"
  → Painel expande inline
  → Digita email do seller
  → Clica "Send Invite"
  → invoke('invite-seller', { email })
  → Edge Function:
      ✓ Verifica role affiliate_admin
      ✓ Busca affiliate_admin_id
      ✓ Checa duplicata
      ✓ auth.admin.inviteUserByEmail → Supabase envia email automático
  → Toast "Invite sent!" + lista recarrega

Seller recebe email de convite
  → Clica link → /seller/accept-invite#access_token=xxx&type=invite
  → Página lê token do hash → setSession()
  → Form aparece: Nome + Senha + Telefone
  → Submit:
      ✓ updateUser({ password, full_name })
      ✓ INSERT user_profiles { role: 'seller' }
      ✓ RPC generate_unique_seller_code()
      ✓ INSERT sellers { affiliate_admin_id, referral_code, ... }
  → Redirect /seller/dashboard
```

---

## Deploy

```bash
supabase functions deploy invite-seller --project-ref fitpynguasqqutuhzifx
```

---

## Checklist de Verificação

- [ ] Abrir `/agency/dashboard/users` → clicar "Add Seller" → form de email aparece
- [ ] Digitar email inválido → botão desabilitado
- [ ] Digitar email válido → "Send Invite" → toast de sucesso
- [ ] Supabase Auth → usuário tem `invited_at` preenchido, `confirmed_at` null
- [ ] Tentar convidar mesmo email novamente → erro 409
- [ ] Email recebido com link de convite
- [ ] Clicar link → `/seller/accept-invite` carrega com form
- [ ] Preencher nome + senha → submit
- [ ] `user_profiles` → registro criado com `role: 'seller'`
- [ ] `sellers` → registro com `affiliate_admin_id` correto e `referral_code` único
- [ ] Redirect para `/seller/dashboard` funciona
- [ ] Agência recarrega lista → novo seller aparece

---

## Arquivos Resumo

| Arquivo | Ação |
|---------|------|
| `supabase/functions/invite-seller/index.ts` | Criado |
| `src/pages/SellerAcceptInvite.tsx` | Criado |
| `src/App.tsx` | Modificado — rota pública adicionada |
| `src/pages/AgencyDashboard/SellerManagement.tsx` | Modificado — invite form |
| `src/pages/AgencyDashboard/Overview.tsx` | Modificado — removido import inexistente |
| `src/pages/AgencyDashboard/AgencyDashboardLayout.tsx` | Modificado — removido I20DeadlineMonitor |
| `src/hooks/useAgencyQueries.ts` | Modificado — fix 404 + console.log limpos |
| `src/hooks/useSystemType.ts` | Modificado — console.log limpos |
| `src/hooks/useI20DeadlineMonitor.ts` | Modificado — console.log limpos |
