# 🔧 Correção do Problema de Múltiplas Contas Microsoft

## Problema Identificado

O usuário identificou corretamente que o sistema funcionava com uma conta Microsoft, mas falhava com múltiplas contas conectadas. O problema estava na **gestão de refresh tokens** e **seleção de contas** no MSAL.

### 🎯 **Causa Raiz:**
1. **MSAL sempre usava `accounts[0]`** - Primeira conta encontrada
2. **Múltiplas instâncias MSAL** - Cada conta criava sua própria instância
3. **Refresh token incorreto** - Token da conta errada sendo usado
4. **Conflitos de cache** - Cache MSAL com contas conflitantes

## Correções Implementadas

### ✅ 1. **MSALAccountManager - Gerenciador Centralizado**

**Arquivo**: `src/lib/msalAccountManager.ts` (novo)

Criado gerenciador centralizado para múltiplas contas:

```typescript
export class MSALAccountManager {
  // Instância MSAL centralizada
  async getMSALInstance(): Promise<PublicClientApplication>
  
  // Encontrar conta específica por email
  async findAccountByEmail(email: string): Promise<AccountInfo | null>
  
  // Obter token para conta específica
  async getTokenForAccount(email: string, scopes: string[]): Promise<string | null>
  
  // Limpar contas antigas para evitar conflitos
  async cleanupOldAccounts(): Promise<void>
}
```

### ✅ 2. **Seleção Correta de Conta no GraphService**

**Arquivo**: `src/lib/graphService.ts`

**Antes** (problemático):
```typescript
// Sempre usava a primeira conta
const response = await msalInstance.acquireTokenSilent({
  scopes: config.scopes,
  account: accounts[0], // ❌ Sempre primeira conta
  forceRefresh: true
});
```

**Depois** (corrigido):
```typescript
// Buscar conta específica baseada no configId
const accountManager = MSALAccountManager.getInstance();
const targetEmail = await this.getEmailForConfigId(this.configId);
const accessToken = await accountManager.getTokenForAccount(targetEmail, config.scopes);
```

### ✅ 3. **Limpeza de Cache MSAL**

**Arquivo**: `src/hooks/useMicrosoftConnection.ts`

Adicionada limpeza automática de cache:

```typescript
// Limpar cache MSAL se há muitas contas
if ((window as any).msalInstance) {
  const accounts = (window as any).msalInstance.getAllAccounts();
  if (accounts.length > 3) {
    console.log('🧹 Limpando cache MSAL para evitar conflitos');
    await (window as any).msalInstance.clearCache();
  }
}
```

### ✅ 4. **Gestão de Instâncias MSAL**

**Arquivo**: `src/lib/graphService.ts`

**Antes**:
- Cada conta criava sua própria instância MSAL
- Conflitos entre instâncias
- Cache duplicado

**Depois**:
- Instância MSAL centralizada
- Limpeza automática de contas antigas
- Gestão unificada de cache

## Como Funciona Agora

### 🔄 **Fluxo de Renovação de Token:**

1. **Identificar conta específica**:
   ```typescript
   // Buscar email baseado no configId
   const { data: configData } = await supabase
     .from('email_configurations')
     .select('email_address')
     .eq('id', this.configId)
     .single();
   ```

2. **Encontrar conta no MSAL**:
   ```typescript
   // Buscar conta específica no MSAL
   const targetAccount = accounts.find(acc => 
     acc.username === configData.email_address
   );
   ```

3. **Obter token correto**:
   ```typescript
   // Usar conta específica para renovar token
   const response = await msalInstance.acquireTokenSilent({
     scopes: config.scopes,
     account: targetAccount, // ✅ Conta específica
     forceRefresh: true
   });
   ```

### 🧹 **Limpeza Automática:**

- **Limite de contas**: Máximo 5 contas no MSAL
- **Limpeza automática**: Remove contas antigas
- **Cache unificado**: Uma instância MSAL para todas as contas

## Benefícios da Correção

### ✅ **Múltiplas Contas Funcionando**
- Cada conta usa seu próprio token
- Sem conflitos entre contas
- Renovação de token correta

### ✅ **Performance Melhorada**
- Instância MSAL centralizada
- Cache otimizado
- Menos requisições desnecessárias

### ✅ **Estabilidade**
- Limpeza automática de cache
- Gestão de conflitos
- Fallbacks para casos de erro

## Testando a Correção

### 1. **Teste com Múltiplas Contas**:
1. Conecte 2+ contas Microsoft
2. Navegue entre elas
3. Verifique se cada conta mostra seus próprios emails
4. Observe logs no console

### 2. **Teste de Renovação de Token**:
1. Aguarde token expirar (1 hora)
2. Tente acessar emails
3. Verifique se token é renovado automaticamente
4. Confirme que conta correta é usada

### 3. **Teste de Limpeza de Cache**:
1. Conecte várias contas (5+)
2. Observe limpeza automática nos logs
3. Verifique se sistema continua funcionando

## Logs Esperados

### ✅ **Sucesso**:
```
🎯 Buscando token para conta específica: victurib@outlook.com
🎯 Conta MSAL encontrada: victurib@outlook.com
✅ Token obtido para conta: victurib@outlook.com
✅ Token renewed successfully via MSAL
```

### ⚠️ **Limpeza de Cache**:
```
🧹 Limpando contas antigas do MSAL
🧹 Limpando cache MSAL para evitar conflitos
```

### ❌ **Erro de Conta**:
```
❌ Email da conta não encontrado para configId: [ID]
❌ Falha ao obter token para conta: [email]
```

## Arquivos Modificados

- ✅ `src/lib/msalAccountManager.ts` - Gerenciador centralizado (novo)
- ✅ `src/lib/graphService.ts` - Seleção correta de conta
- ✅ `src/hooks/useMicrosoftConnection.ts` - Limpeza de cache

## Próximos Passos

1. **Teste o sistema** com múltiplas contas conectadas
2. **Monitore os logs** para confirmar que contas corretas são selecionadas
3. **Verifique renovação de tokens** após 1 hora
4. **Reporte qualquer problema** com logs específicos

O sistema agora deve funcionar corretamente com múltiplas contas Microsoft, resolvendo o problema de refresh tokens e seleção de contas que você identificou.
