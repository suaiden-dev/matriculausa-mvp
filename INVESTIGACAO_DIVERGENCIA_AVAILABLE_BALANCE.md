# Investigação: Divergência de Available Balance

## Problema Reportado

- **Financial Overview**: $11,950
- **Controle do Matheus**: $11,450
- **Diferença**: $500

## Metodologia de Investigação

### 1. Identificação do Affiliate Admin
- **Email**: contato@brantimmigration.com
- **User ID**: 6a3c5c04-fc94-4938-bdc2-c14c9ff8459c
- **Affiliate Admin ID**: 525e4fba-5743-49c0-8ab8-f0dba284bc7a

### 2. Comparação de Fontes de Dados

#### FinancialOverview.tsx
- Usa RPC: `get_affiliate_admin_profiles_with_fees`
- **Filtra apenas sellers ativos** (`s.is_active = true`)
- Busca payment methods separadamente após obter os perfis

#### PaymentManagement.tsx
- Busca diretamente de `user_profiles`
- **NÃO filtra por sellers ativos**
- Busca payment methods junto com os perfis

### 3. Resultados da Investigação

#### Número de Estudantes
- **RPC (sellers ativos)**: 25 estudantes
- **Query direta (todos)**: 25 estudantes
- **Diferença**: 0 estudantes

**Conclusão**: Não há diferença no número de estudantes retornados. Todos os sellers estão ativos ou a query direta também está filtrando apenas sellers ativos.

#### Payment Requests
- **Total Paid Out**: $2,099.00 (1 request com status 'paid')
- **Total Approved**: $0.00
- **Total Pending**: $0.00
- **Outros status**: Nenhum (rejected, cancelled, etc.)

#### Cálculo SQL Completo (usando RPC - sellers ativos)

| Métrica | Valor Calculado |
|---------|----------------|
| **Total Revenue** | $20,748.00 |
| **Manual Revenue** | $4,499.00 |
| **Total Paid Out** | $2,099.00 |
| **Total Approved** | $0.00 |
| **Total Pending** | $0.00 |
| **Available Balance** | **$14,150.00** |

**Fórmula**: `Available Balance = (Total Revenue - Manual Revenue) - Total Paid Out - Total Approved - Total Pending`
**Cálculo**: `($20,748 - $4,499) - $2,099 - $0 - $0 = $14,150`

### 4. Discrepâncias Identificadas

#### Discrepância Principal
O cálculo SQL mostra **$14,150**, mas:
- Financial Overview mostra: **$11,950** (diferença de **-$2,200**)
- Controle do Matheus mostra: **$11,450** (diferença de **-$2,700**)

#### Possíveis Causas

1. **Total Revenue diferente**
   - O Financial Overview pode estar calculando um Total Revenue menor
   - Diferença de $2,200 ou $2,700 sugere que alguns estudantes não estão sendo contados

2. **Manual Revenue diferente**
   - O Financial Overview pode estar identificando mais pagamentos como "manual"
   - Isso reduziria o Available Balance

3. **Payment Requests diferentes**
   - Pode haver payment requests que não estão sendo considerados
   - Mas a query mostra apenas 1 request com status 'paid'

4. **Dados em cache ou desatualizados**
   - O Financial Overview pode estar usando dados em cache
   - O PaymentManagement pode estar usando dados mais recentes

### 5. Receita Manual Detalhada

Estudantes com pagamentos via "manual" (Outside):

| Estudante | Selection Manual | Scholarship Manual | I-20 Manual | Total Manual |
|-----------|------------------|-------------------|-------------|--------------|
| Jonatas Fonseca Pinheiro | $1,000 | $0 | $0 | $1,000 |
| Daniel Costa e Silva | $999 | $0 | $0 | $999 |
| Maria Yorleny Palacio Lopera | $900 | $0 | $0 | $900 |
| Alondra Ciprián Quezada | $400 | $0 | $0 | $400 |
| Sara Bianey Stith Campo | $400 | $0 | $0 | $400 |
| Vanessa Henrique Fogaça | $400 | $0 | $0 | $400 |
| SHEYLA ROCIO HILARIO OCEJO | $400 | $0 | $0 | $400 |
| **TOTAL** | **$4,499** | **$0** | **$0** | **$4,499** |

**Observação**: O usuário mencionou que Thamara de Souza tem I-20 Control Fee pago via "Outside" ($900), mas o banco de dados mostra `i20_control_fee_payment_method = null`. Isso pode indicar um problema de dados ou que o payment_method não está sendo salvo corretamente.

### 6. Receita Total por Estudante (Top 10)

| Estudante | Selection | Scholarship | I-20 | Total |
|-----------|-----------|-------------|------|-------|
| Adolfo Cézar costa | $1,000 | $900 | $900 | $2,800 |
| Thamara de Souza | $550 | $900 | $900 | $2,350 |
| Stephanie Cristine Santos Ferreira | $550 | $900 | $900 | $2,350 |
| Ana Julia Linhares Rezende | $400 | $900 | $900 | $2,200 |
| Gerson Aparecido Chesque Pereira | $700 | $900 | $0 | $1,600 |
| Camila Peres Vilacian | $550 | $900 | $0 | $1,450 |
| Sara Bianey Stith Campo | $400 | $1,000 | $0 | $1,400 |
| Renan da Conceição Freire | $999 | $400 | $0 | $1,399 |
| Jonatas Fonseca Pinheiro | $1,000 | $0 | $0 | $1,000 |
| Daniel Costa e Silva | $999 | $0 | $0 | $999 |

### 7. Hipóteses para a Diferença de $500

#### Hipótese 1: Thamara I-20 Control Fee
- Se o I-20 Control Fee do Thamara ($900) estiver sendo contado como "manual" no Financial Overview mas não no cálculo SQL
- Isso explicaria parte da diferença, mas não os $500 completos

#### Hipótese 2: Dados em Cache
- O Financial Overview pode estar usando dados em cache (TTL de 60 segundos)
- O PaymentManagement pode estar usando dados mais recentes

#### Hipótese 3: Diferença no Cálculo de Receita
- Algum estudante pode estar sendo contado de forma diferente
- Pode haver um problema com overrides ou dependents

#### Hipótese 4: Payment Requests Adicionais
- Pode haver payment requests que não estão sendo considerados no cálculo
- Mas a query mostra apenas 1 request

### 8. Próximos Passos Recomendados

1. **Verificar logs do console** do Financial Overview para ver os valores calculados
2. **Verificar se há dados em cache** que possam estar causando a diferença
3. **Comparar linha por linha** o cálculo de receita entre FinancialOverview e PaymentManagement
4. **Verificar se o Thamara I-20** está sendo contado corretamente como "manual"
5. **Verificar se há payment requests** que não estão sendo considerados

### 9. BUG CRÍTICO IDENTIFICADO: RPC não identifica Scholarship Fee pago para estudantes Legacy

#### Problema Encontrado

**Daniel Costa e Silva** (`danielbamsesi@gmail.com`):
- Tem `system_type = 'legacy'`
- Tem `is_scholarship_fee_paid = true` na tabela `scholarship_applications` com `payment_method = 'manual'`
- Mas a RPC `get_affiliate_admin_profiles_with_fees` retorna `is_scholarship_fee_paid = false`

#### Causa Raiz

A RPC tem lógica diferente para `simplified` vs `legacy`:

```sql
CASE 
  WHEN up.system_type = 'simplified' THEN
    EXISTS (SELECT 1 FROM scholarship_applications ...)  -- ✅ Verifica tabela
  ELSE COALESCE(up.is_scholarship_fee_paid, false)     -- ❌ Só verifica campo
END as is_scholarship_fee_paid
```

Para estudantes `legacy`, a RPC **não verifica** a tabela `scholarship_applications`, apenas o campo `up.is_scholarship_fee_paid` que pode estar desatualizado.

#### Impacto no Cálculo

**Daniel Costa e Silva - Pagamentos Outside:**
- Selection Process Fee: $999 (manual) ✅
- Scholarship Fee: $400 (manual) ❌ **NÃO ESTÁ SENDO CONTADO**
- I-20 Control Fee: $999 (manual) ❌ **NÃO ESTÁ SENDO CONTADO**

**Total Manual Revenue do Daniel que DEVERIA ser contado:**
- Selection: $999
- Scholarship: $400 (com override)
- I-20: $999 (com override)
- **Total: $2,398**

**Total Manual Revenue do Daniel que ESTÁ sendo contado:**
- Selection: $999
- **Total: $999**

**Diferença: $1,399 não está sendo contado no Manual Revenue**

#### Outros Estudantes Afetados

**Thamara de Souza** (`thamarasouza82@gmail.com`):
- Tem I-20 Control Fee pago via "Outside" ($900)
- Mas `i20_control_fee_payment_method = null` no banco
- **Problema de dados**: O payment_method não está sendo salvo corretamente

### 10. Receita Manual Corrigida (com base nos dados do usuário)

Com base na lista de pagamentos Outside fornecida pelo usuário:

| Estudante | Selection | Scholarship | I-20 | Total Manual |
|-----------|-----------|-------------|------|--------------|
| Daniel Costa e Silva | $999 | $400 | $999 | **$2,398** |
| Jonatas Fonseca Pinheiro | $1,000 | $0 | $0 | $1,000 |
| Maria Yorleny Palacio Lopera | $900 | $0 | $0 | $900 |
| Thamara de Souza | $0 | $0 | $900 | $900 |
| Alondra Ciprián Quezada | $400 | $0 | $0 | $400 |
| Sara Bianey Stith Campo | $400 | $0 | $0 | $400 |
| SHEYLA ROCIO HILARIO OCEJO | $400 | $0 | $0 | $400 |
| Vanessa Henrique Fogaça | $400 | $0 | $0 | $400 |
| **TOTAL CORRETO** | **$4,499** | **$400** | **$1,899** | **$6,798** |

**Manual Revenue atual calculado pelo código: $4,499**
**Manual Revenue correto (baseado nos dados do usuário): $6,798**
**Diferença: $2,299**

### 11. Cálculo do Available Balance Corrigido

Com o Manual Revenue correto:

| Métrica | Valor |
|---------|-------|
| **Total Revenue** | $20,748.00 |
| **Manual Revenue (CORRETO)** | **$6,798.00** |
| **Total Paid Out** | $2,099.00 |
| **Total Approved** | $0.00 |
| **Total Pending** | $0.00 |
| **Available Balance (CORRETO)** | **$11,851.00** |

**Fórmula**: `($20,748 - $6,798) - $2,099 = $11,851`

### 12. Comparação com Valores Reportados

| Fonte | Available Balance | Diferença com Cálculo Correto |
|-------|-------------------|------------------------------|
| **Cálculo Correto** | **$11,851** | - |
| **Financial Overview** | $11,950 | **+$99** |
| **Controle do Matheus** | $11,450 | **-$401** |

### 13. Conclusão

A investigação identificou **dois problemas críticos**:

1. **BUG na RPC**: Para estudantes `legacy`, a RPC não verifica a tabela `scholarship_applications`, causando subcontagem do Scholarship Fee pago
2. **Problema de Dados**: O `i20_control_fee_payment_method` do Thamara está como `null` quando deveria ser `'manual'`

**Impacto:**
- Manual Revenue está sendo subcontado em **$2,299**
- Available Balance está sendo supercontado em **$2,299**
- A diferença de **$500** entre Financial Overview e controle do Matheus pode estar relacionada a como esses bugs se manifestam em cada dashboard

**Recomendação**: 
1. Corrigir a RPC para verificar `scholarship_applications` também para estudantes `legacy`
2. Corrigir o `i20_control_fee_payment_method` do Thamara no banco de dados
3. Recalcular Manual Revenue e Available Balance após as correções

### 14. Plano de Debug Completo

Para fazer um debug completo quando tiver acesso à conta, consulte o documento **`PLANO_DEBUG_COMPLETO.md`** que contém:

- **Logs detalhados** para adicionar no código (FinancialOverview e PaymentManagement)
- **Queries SQL** de verificação estudante por estudante
- **Checklist completo** de verificação
- **Script de comparação automática** entre os dois cálculos
- **Template de relatório** para documentar descobertas
- **Passos de execução** detalhados

O plano de debug permitirá:
1. Identificar exatamente onde cada cálculo diverge
2. Comparar estudante por estudante
3. Verificar payment methods e overrides
4. Documentar todas as divergências encontradas
5. Validar correções após implementação

