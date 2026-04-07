# Relatório de Desenvolvimento — 02/04/2026

**Projeto:** MatriculaUSA MVP  
**Repositório:** `matriculausa-mvp`  
**Data:** 02 de abril de 2026  

---

## Sumário Executivo

Sessão focada na correção de bugs críticos no fluxo de onboarding do estudante (`StudentOnboarding`). Todos os problemas identificados eram relacionados à lógica de progressão de etapas e ao estado `isLocked` da etapa de seleção de bolsas. Também foi realizada uma limpeza de dados no banco de dados de produção (Supabase).

---

## 1. Bug: Etapa 3 (Escolha de Bolsas) era pulada automaticamente

### Arquivo afetado
`project/src/pages/StudentOnboarding/hooks/useOnboardingProgress.tsx`

### Causa raiz
A função `checkProgress()` usava `freshProfile.student_process_type` como critério para considerar `scholarshipsSelected = true`. Qualquer aluno com `student_process_type` já definido no banco (mesmo nunca tendo passado pela seleção de bolsas) era considerado como tendo concluído a etapa 3.

```ts
// ❌ ANTES — INCORRETO
scholarshipsSelected = !!(
  currentCart.length > 0 ||
  (appsData && appsData.length > 0) ||
  !!freshProfile.selected_scholarship_id ||
  (freshProfile.student_process_type && ['initial', 'transfer', 'change_of_status', 'resident'].includes(...))
//                 ↑ PROBLEMA: não é evidência de seleção de bolsa
);
```

### Correção aplicada
Removida a condição `student_process_type` de `scholarshipsSelected`. Apenas evidências concretas de seleção de bolsa são consideradas.

```ts
// ✅ DEPOIS — CORRETO
scholarshipsSelected = !!(
  currentCart.length > 0 ||
  (appsData && appsData.length > 0) ||
  !!freshProfile.selected_scholarship_id
);
```

---

## 2. Bug: Erro 500 ao carregar o StudentOnboarding (crash da aplicação)

### Arquivo afetado
`project/src/pages/StudentOnboarding/StudentOnboarding.tsx`

### Causa raiz — Imports duplicados
O arquivo declarava os mesmos componentes **duas vezes**:
- **Linhas 7–17:** Imports estáticos (`import { SelectionFeeStep } from '...'`)
- **Linhas 22–54:** Redeclaração dos mesmos como `const = React.lazy(...)` 

Isso causava erro de compilação TypeScript `"Cannot redeclare block-scoped variable"`, resultando em HTTP 500 no Vite.

### Causa adicional — Imports fora de ordem
Os imports `useTranslation`, `LanguageSelector`, `useSmartPollingNotifications` e `NotificationsModal` estavam posicionados **depois** das declarações `const`, violando a regra de hoisting de módulos ES.

### Correção aplicada
- Removidos todos os imports estáticos duplicados (linhas 7–17)
- Movidos os imports restantes para o topo do arquivo, antes de qualquer declaração `const`

**Estrutura final correta:**
```ts
// ✅ Todos os imports estáticos no topo
import React, { ... } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { OnboardingStep } from './types';
import LanguageSelector from '../../components/LanguageSelector';
// ...

// Depois as declarações lazy
const SelectionFeeStep = React.lazy(() => import('./components/SelectionFeeStep')...);
// ...
```

---

## 3. Bug: Tela "ETAPA CONCLUÍDA" aparecia sem bolsas selecionadas

### Arquivo afetado
`project/src/pages/StudentOnboarding/components/ScholarshipSelectionStep.tsx`

### Causa raiz
O `isLocked` dentro do componente usava `student_process_type` como critério exclusivo para mostrar a tela de conclusão. Mesmo sem nenhuma bolsa escolhida, o aluno via "ETAPA CONCLUÍDA".

```ts
// ❌ ANTES — INCORRETO
const isLocked = useMemo(() => {
  if (!userProfile?.has_paid_selection_process_fee) return false;
  return !!(userProfile?.student_process_type &&
    ['initial', 'transfer', 'change_of_status'].includes(userProfile.student_process_type));
}, [...]);
```

### Iterações de correção

**Tentativa v2 (introduziu novo bug):**
```ts
// ⚠️ CAUSOU AUTO-AVANÇO — cart é estado temporário
const hasScholarshipsInCart = cart.length > 0;
return hasProcessType && hasScholarshipsInCart;
```
> Problema: clicar em qualquer bolsa (`cart.length > 0`) + `process_type` existente = `isLocked = true` imediatamente → tela de conclusão disparava sem clicar em Continuar.

**Correção final (v3) — definitiva:**
```ts
// ✅ CORRETO — documents_uploaded é sinal irreversível de fluxo completo
const isLocked = useMemo(() => {
  if (!userProfile?.has_paid_selection_process_fee) return false;
  if (userProfile?.documents_uploaded) return true; // passou pelo fluxo inteiro
  return false;
}, [userProfile?.has_paid_selection_process_fee, userProfile?.documents_uploaded]);
```

> **Lógica:** O `documents_uploaded = true` é o único sinal estável e irreversível que indica que o aluno passou por todo o fluxo: bolsas → process_type → documentos.

---

## 4. Remoção de dado no banco (Supabase Produção)

### Ação realizada
Usuário `anisia4279@uorak.com` clicou acidentalmente em uma bolsa durante os testes. Item removido diretamente via SQL no projeto Supabase `fitpynguasqqutuhzifx` (MatriculaUSA).

```sql
DELETE FROM user_cart
WHERE user_id = (
  SELECT user_id FROM user_profiles WHERE email = 'anisia4279@uorak.com'
)
RETURNING id, scholarship_id;
```

**Resultado:** 1 registro removido
- `id`: `bfd76a30-c132-40ac-ba95-1df580281c93`
- `scholarship_id`: `4fe29d08-13fa-4d47-9673-1d45a2eca13e` (STEM Scholarship)

---

## 5. Bug: Clicar em uma bolsa avançava o passo sozinho

### Contexto
Identificado durante testes manuais após a correção do item 3. O bug foi introduzido pela tentativa de correção v2 do `isLocked`.

### Causa raiz
A condição `cart.length > 0` reativa o `isLocked` assim que o usuário clica em qualquer bolsa, causando re-render imediato para a tela de conclusão.

### Correção
Mesma correção do item 3, versão final (v3) — resolveu ambos os problemas simultaneamente.

---

## Resumo de Arquivos Modificados

| Arquivo | Tipo de mudança |
|---|---|
| `hooks/useOnboardingProgress.tsx` | Lógica de `scholarshipsSelected` corrigida |
| `StudentOnboarding.tsx` | Imports duplicados removidos, ordem de imports corrigida |
| `components/ScholarshipSelectionStep.tsx` | `isLocked` reescrito (3 iterações → versão final estável) |

---

## Tabela de Decisões — isLocked (histórico)

| Versão | Critério usado | Problema |
|---|---|---|
| Original | `student_process_type` definido | Mostrava "ETAPA CONCLUÍDA" sem bolsas |
| v2 | `cart.length > 0 + process_type` | Auto-avançava ao clicar em qualquer bolsa |
| **v3 (final)** | **`documents_uploaded = true`** | ✅ Correto e estável |

---

## Observações para o Futuro

- **Campo `student_process_type`** não deve ser usado como indicador de progresso de bolsas. Ele indica apenas a escolha de tipo de visto/processo, não a conclusão da seleção de bolsas.
- Se futuramente for necessário criar alunos que **pulam** a etapa de seleção de bolsas por motivo administrativo, considere adicionar um campo booleano dedicado como `scholarship_selection_skipped` no perfil, em vez de inferir via `student_process_type`.
- O `user_cart` é um estado **temporário** de navegação e nunca deve ser usado como sinal de conclusão de etapa.
