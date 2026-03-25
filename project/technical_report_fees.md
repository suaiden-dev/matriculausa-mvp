# Relatório Técnico de Engenharia - Sistema de Taxas e Pagamentos (Deep Dive)
**Data de Emissão**: 20/03/2026
**Documento**: MRT-FEES-20260320-01
**Nível de Confidencialidade**: Interno / Engenharia

## 1. Contexto Arquitetural: O Novo Fluxo de Placement Fee

A plataforma Matricula USA unificou seu modelo de monetização no fluxo de **Placement Fee**, movendo-se para um sistema simplificado que consolida custos de consultoria e matrícula. Este fluxo é regido pela flag `placement_fee_flow` em `public.user_profiles`.

### 1.1. Modelagem de Dados no Supabase
O sistema de taxas integra três tabelas principais:
- `public.user_profiles`: Contém as flags de status de pagamento (`is_placement_fee_paid`, `is_application_fee_paid`) e metadados de fluxo (`placement_fee_flow`).
- `public.scholarship_applications`: Faz o vínculo entre o estudante (`student_id`) e a bolsa (`scholarship_id`), armazenando o status da candidatura (`pending`, `approved`, `enrolled`).
- `public.scholarships`: Contém o valor base da taxa (`placement_fee_amount`) e o valor anual da bolsa (`annual_value_with_scholarship`), que servirá como entrada para a calculadora em caso de ausência de valor fixo.
- `public.individual_fee_payments`: Nova tabela de auditoria granular que registra:
    - `fee_type` (Enum: `application`, `placement`, `scholarship`, `i20_control`).
    - `amount` (Valor normalizado em dólares).
    - `payment_method` (Stripe, Parcelow, Zelle, etc).

---

## 2. Diagnóstico Técnico de Incidentes (Post-Mortem)

### 2.1. Dessincronismo de Redirecionamento (Onboarding - Step 6 para 7)
- **Componente**: `src/pages/StudentOnboarding/hooks/useOnboardingProgress.tsx`
- **Diagnóstico**: O cálculo de `nextStep` falhava ao avaliar a completude do Step 6 (*Application Selection*). No novo fluxo, o pagamento da *Application Fee* dispara uma transição de estado que o `useOnboardingProgress` interpretava erroneamente como o fim do processo de documentos, saltando o Step 7 (*Placement Fee*).
- **Lógica de Transição Corrigida**:
    ```typescript
    // Pseudo-lógica implementada
    const determineNextStep = () => {
        if (!is_application_fee_paid) return 'scholarship_fee';
        if (placement_fee_flow && !is_placement_fee_paid) return 'placement_fee';
        return 'documents';
    };
    ```

### 2.2. Deadlock Visual (Skeleton Infinito no Painel Admin)
- **Componente**: `src/components/AdminDashboard/StudentDetails/PaymentStatusCard.tsx`
- **Bug**: O componente dependia do estado `realPaidAmounts` carregado no painel pai (`AdminStudentDetails.refactored.tsx`). A função `validateAndNormalizePaidAmounts` falhava na serialização:
    - Se a `individual_fee_payments` para o aluno `b8393b4d-c82c-4ed4-8870-4f9640e33897` retornasse um array vazio, o objeto `normalized` resultante perdia as chaves (`placement`, `application`).
    - O componente de UI verificava `if (!realPaidAmounts)` ou chaves específicas. A ausência da chave mantinha o componente em loop de `loading`.
- **Correção**: Implementado preenchimento preventivo de chaves com `0` ou `null` na função de normalização.

### 2.3. Saturação de Validação Financeira (O Caso dos $20.000,00)
- **Fato**: O sistema exibia `$1000.00` (fallback) em vez de `$20k` ou `$10k`.
- **Análise do Arquivo**: `src/pages/AdminDashboard/AdminStudentDetails.refactored.tsx`
- **Segmento Crítico**:
    ```typescript
    // CÓDIGO ANTERIOR (DEPRECATED):
    const isReasonableRange = realPaidAmounts.placement >= 100 && realPaidAmounts.placement <= 5000;
    
    // CÓDIGO ATUALIZADO (FIX):
    const isReasonableRange = realPaidAmounts.placement >= 100 && realPaidAmounts.placement <= 35000;
    ```
- **Explicação**: A *Placement Fee* não segue mais o padrão fixo histórico. Bolsas personalizadas podem ter taxas variáveis. O limite de segurança de `$5k` descartava o valor pago real, disparando a cadeia de fallbacks da UI.

---

## 3. Implementação da Estratégia de Fallbacks Dinâmicos (UI Tier)

O componente `PaymentStatusCard.tsx` agora utiliza uma hierarquia de **6 Níveis de Recuperação de Dados** para garantir que o Admin não veja dados vazios ou incorretos:

1. **Camada de Auditoria (Real)**: `realPaidAmounts.placement`. Prioritário se houver registro em `individual_fee_payments`.
2. **Camada de Intervenção (Override)**: `currentOverrides.placement_fee`. Valor customizado definido manualmente pelo Admin.
3. **Camada de Perfil (Profile)**: `student.placement_fee_amount`. Valor cacheado no objeto `StudentRecord` (mapeado via RPC).
4. **Camada de Contexto (Selected App)**: 
    - Busca recursiva: `student.all_applications.find(app => app.status === 'enrolled' || app.status === 'approved')`.
    - Extração do campo `placement_fee_amount` vinculado diretamente à bolsa no banco.
5. **Camada Algorítmica (Calculator)**: 
    - Utiliza `utils/placementFeeCalculator.ts`.
    - Executa `getPlacementFee(annual_scholarship_value)`.
    - Ex: Bolsa anual de $5500 -> Taxa calculada de $1250.
6. **Camada de Emergência (Fixed Fallback)**: `$1000.00`. Exibido apenas em falha total de metadados.

---

## 4. Auditoria de Dados e Workflow de Teste

**Identificadores**:
- Aluno: `weiqiang2017@uorak.com` / ID: `b8393b4d-c82c-4ed4-8870-4f9640e33897`.
- Bolsa Investigada: "teste 121212" / ID: `7e2a3b9a-e6ed-45aa-a117-6eea71c2db0e`.

**Logs de Verificação SQL**:
```sql
-- Verificar dados da bolsa configurada
SELECT placement_fee_amount, annual_value_with_scholarship 
FROM scholarships 
WHERE id = '7e2a3b9a-e6ed-45aa-a117-6eea71c2db0e';
-- Resultado: 20000 | NULL

-- Verificar status de pagamentos
SELECT is_placement_fee_paid, placement_fee_payment_method 
FROM user_profiles 
WHERE id = 'b8393b4d-c82c-4ed4-8870-4f9640e33897';
```

**Workflow de Flushing Executado**:
Para validar as correções de redirecionamento, foi necessário resetar o estado de pagamento do aluno:
1. `UPDATE user_profiles SET is_application_fee_paid = false, is_placement_fee_paid = false ...`
2. `DELETE FROM individual_fee_payments ...`
3. O aluno agora está no Step 6, pronto para pagar a taxa e validar o salto para o Step 7.

---
**Relatório Técnico Detalhado - Engenharia de Core Payments**
