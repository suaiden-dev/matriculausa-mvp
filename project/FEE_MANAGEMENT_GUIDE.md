# Guia de Gerenciamento de Taxas

## Visão Geral

O sistema possui um gerenciamento centralizado de taxas através do hook `useFeeConfig` e da tabela `system_settings` no banco de dados.

## Tipos de Taxas

### 1. Application Fee (Dinâmica)
- **Definida por**: Universidade (por bolsa)
- **Fonte**: Campo `application_fee_amount` na tabela `scholarships`
- **Comportamento**: Cada bolsa pode ter um valor diferente
- **Exemplo**: Bolsa A = $10, Bolsa B = $25

### 2. Scholarship Fee (Fixa)
- **Definida por**: Sistema (administrador)
- **Fonte**: Tabela `system_settings` (chave: `scholarship_fee_default`)
- **Comportamento**: Valor único para todo o sistema
- **Valor padrão**: $400

### 3. Outras Taxas Fixas
- **Selection Process Fee**: $999 (configurável)
- **I-20 Control Fee**: $999 (configurável)

## Como Alterar Valores

### Para Taxas Fixas (Scholarship Fee, Selection Process, I-20 Control):

1. **Via Banco de Dados** (Recomendado):
```sql
-- Atualizar Scholarship Fee para $500
INSERT INTO system_settings (key, value) 
VALUES ('scholarship_fee_default', '500')
ON CONFLICT (key) 
DO UPDATE SET value = '500';

-- Atualizar Selection Process Fee para $1200
INSERT INTO system_settings (key, value) 
VALUES ('selection_process_fee', '1200')
ON CONFLICT (key) 
DO UPDATE SET value = '1200';
```

2. **Via Código** (Fallback):
```typescript
// Em src/hooks/useFeeConfig.ts
const DEFAULT_FEE_CONFIG: FeeConfig = {
  selection_process_fee: 999,
  application_fee_default: 350,
  scholarship_fee_default: 400,  // ← Alterar aqui
  i20_control_fee: 999
};
```

### Para Application Fee (Dinâmica):

```sql
-- Atualizar Application Fee de uma bolsa específica
UPDATE scholarships 
SET application_fee_amount = 25.00  -- $25.00
WHERE id = 'scholarship-id-aqui';
```

## Estrutura da Tabela system_settings

```sql
CREATE TABLE system_settings (
  key VARCHAR PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Chaves Disponíveis

- `selection_process_fee`: Taxa do processo de seleção
- `application_fee_default`: Taxa padrão de aplicação (fallback)
- `scholarship_fee_default`: Taxa fixa de bolsa
- `i20_control_fee`: Taxa de controle I-20

## Como o Sistema Funciona

1. **Carregamento**: `useFeeConfig` busca valores da tabela `system_settings`
2. **Fallback**: Se não encontrar no banco, usa valores do código
3. **Application Fee**: Sempre usa valor da bolsa específica (dinâmico)
4. **Scholarship Fee**: Sempre usa valor do sistema (fixo)

## Vantagens

- ✅ **Centralizado**: Um lugar para gerenciar todas as taxas
- ✅ **Flexível**: Application Fee dinâmica, outras fixas
- ✅ **Seguro**: Fallback para valores padrão
- ✅ **Escalável**: Fácil adicionar novas taxas
- ✅ **Auditável**: Histórico no banco de dados

## Exemplo de Uso

```typescript
import { useFeeConfig } from '../hooks/useFeeConfig';

const { getFeeAmount, formatFeeAmount } = useFeeConfig();

// Application Fee (dinâmica - da bolsa)
const appFee = studentInfo?.scholarship?.application_fee_amount || getFeeAmount('application_fee');

// Scholarship Fee (fixa - do sistema)
const scholarshipFee = getFeeAmount('scholarship_fee'); // Sempre $400 (ou valor configurado)

// Formatação
const formattedFee = formatFeeAmount(scholarshipFee); // "$400.00"
```
