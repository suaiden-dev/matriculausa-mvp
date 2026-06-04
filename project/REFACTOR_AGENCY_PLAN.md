# Plano de Refatoração e Reorganização: Agency Dashboard
**Data do Plano:** 15 de Maio de 2026
**Execução Prevista:** Segunda-feira

## 1. Objetivo
Reorganizar a estrutura de arquivos do Dashboard da Agência para melhorar a manutenibilidade, aplicar princípios de Clean Code e reduzir o tamanho dos arquivos (eliminando "God Components").

## 2. Diagnóstico Atual
- **Localização:** `src/pages/AgencyDashboard/`
- **Problemas Identificados:**
    - `EnhancedStudentTracking.tsx`: Componente monolítico com ~2.700 linhas.
    - Duplicação de arquivos: `EnhancedStudentTracking.tsx` vs `EnhancedStudentTrackingRefactored.tsx`.
    - Duplicação de arquivos: `SellerManagement.tsx` vs `SellerManagementNew.tsx`.
    - Estrutura "flat" (todos os arquivos na raiz da pasta), dificultando a navegação.
    - Lógica de negócio (Supabase/RPC) misturada com UI em componentes grandes.

## 3. Nova Estrutura Proposta
Migrar para uma estrutura modular baseada em funcionalidades:

```
src/pages/AgencyDashboard/
├── components/           # Componentes compartilhados do dashboard
├── hooks/                # Hooks compartilhados (ex: useAgencyQueries)
├── Overview/             # Página Inicial
│   └── index.tsx
├── StudentTracking/      # Rastreamento de Alunos
│   ├── index.tsx         # Baseado na versão Refactored
│   └── components/       # Sub-componentes (Filtros, Cards, Detalhes)
├── SellerManagement/     # Gestão de Sellers
│   ├── index.tsx
│   ├── hooks/            # useSellerActions (promoção, demotion)
│   └── components/       # Tabela, Modais de Confirmação
├── PaymentManagement/    # Gestão Financeira
│   ├── index.tsx
│   └── components/
├── Analytics/            # Análises e Gráficos
│   └── index.tsx
├── ProfileSettings/      # Configurações de Perfil
│   └── index.tsx
└── index.tsx             # Roteador Principal (Routes/Route)
```

## 4. Checklist de Execução (Segunda-feira)

### Fase 1: Consolidação de Estudantes
- [ ] Mover `EnhancedStudentTrackingRefactored.tsx` para `StudentTracking/index.tsx`.
- [ ] Validar se todas as funcionalidades do arquivo de 2.7k linhas (ex: Transfer Form) estão cobertas.
- [ ] Deletar `EnhancedStudentTracking.tsx` (legado) e `StudentTracking.tsx`.

### Fase 2: Consolidação de Sellers
- [ ] Criar pasta `SellerManagement/`.
- [ ] Extrair lógica de `promoteToSeller`, `demoteFromSeller`, `reactivateSeller` para um hook `useSellerActions.ts`.
- [ ] Extrair a tabela de sellers para `components/SellerTable.tsx`.
- [ ] Deletar `SellerManagementNew.tsx`.

### Fase 3: Reorganização de Pastas
- [ ] Criar subpastas para `Overview`, `Analytics`, `PaymentManagement`, `ProfileSettings` e `UtmTracking`.
- [ ] Mover arquivos e atualizar imports no `index.tsx` principal.

### Fase 4: Refatoração de Código (Clean Code)
- [ ] Reduzir `PaymentManagement.tsx` (52KB) extraindo lógica para hooks.
- [ ] Reduzir `FinancialOverview.tsx` (36KB).
- [ ] Garantir que todos os componentes usem **React Query** para cache e sincronização.

## 5. Plano de Verificação
- [ ] Executar testes E2E: `npx playwright test agency-dashboard.spec.ts`.
- [ ] Verificação Manual:
    - Fluxo de promoção/demotion de seller.
    - Navegação entre lista de alunos e detalhes.
    - Funcionamento do botão "Refresh" (invalidação de cache).

---
*Documento preparado por Antigravity (IA).*
