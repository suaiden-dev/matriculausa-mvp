# 🔍 Correção do Problema de Seleção de Conta Microsoft

## Problema Identificado

O usuário está logado na conta do Victor (`victurib@outlook.com`) mas está vendo emails de outra conta (Ótica Style, SHEIN, Consul, Temu, Cacau Lovers). Isso indica que:

1. **Conta ativa incorreta**: O sistema está selecionando a conta errada como ativa
2. **ConfigId não processado**: O parâmetro `config` da URL não está sendo processado corretamente
3. **Cache de seleção**: O localStorage pode estar salvando a conta errada

## Correções Implementadas

### ✅ 1. **Logs de Debug Adicionados**

**Arquivo**: `src/components/Microsoft/MicrosoftInbox.tsx`

Adicionados logs detalhados para rastrear o processo de seleção:

```typescript
// Processar configId da URL para selecionar a conta correta
useEffect(() => {
  if (configId && connections.length > 0) {
    console.log('🔍 MicrosoftInbox - Processando configId:', configId);
    console.log('🔍 MicrosoftInbox - Conexões disponíveis:', connections.map(c => ({ id: c.id, email: c.email_address })));
    console.log('🔍 MicrosoftInbox - Conta ativa atual:', activeConnection?.email_address);
    
    // Encontrar a conexão correspondente ao configId
    const targetConnection = connections.find(conn => conn.id === configId);
    
    if (targetConnection) {
      console.log('✅ MicrosoftInbox - Conta encontrada para configId:', targetConnection.email_address);
      
      if (targetConnection.email_address !== activeConnection?.email_address) {
        console.log('🔄 MicrosoftInbox - Mudando conta ativa para:', targetConnection.email_address);
        setActiveConnection(targetConnection.email_address);
      } else {
        console.log('✅ MicrosoftInbox - Conta já está ativa:', targetConnection.email_address);
      }
    } else {
      console.warn('⚠️ MicrosoftInbox - Conta não encontrada para configId:', configId);
      console.warn('⚠️ MicrosoftInbox - Usando conta ativa atual:', activeConnection?.email_address);
    }
  }
}, [configId, connections, setActiveConnection, activeConnection]);
```

### ✅ 2. **Botão de Correção Manual**

**Arquivo**: `src/components/Microsoft/MicrosoftInbox.tsx`

Adicionado botão para forçar a seleção da conta correta:

```typescript
{/* Account Status - Simplified */}
{configId && (
  <div className="px-6 py-2">
    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-green-800">
            Conta selecionada: {activeConnection?.email_address || 'Carregando...'}
          </span>
        </div>
        {configId && (
          <button
            onClick={() => {
              const targetConnection = connections.find(conn => conn.id === configId);
              if (targetConnection) {
                console.log('🔄 Forçando seleção da conta:', targetConnection.email_address);
                setActiveConnection(targetConnection.email_address);
              }
            }}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Corrigir Conta
          </button>
        )}
      </div>
      {configId && (
        <div className="mt-2 text-xs text-gray-600">
          Config ID: {configId} | Total de Conexões: {connections.length}
        </div>
      )}
    </div>
  </div>
)}
```

### ✅ 3. **Remoção de Logs Excessivos**

**Arquivo**: `src/hooks/useMicrosoftConnection.ts`

Removido log que estava causando confusão:

```typescript
// Antes
console.log('🔄 Auto-selecting newest Microsoft connection:', newestConnection.email_address);

// Depois
// Log removido - seleção silenciosa
```

## Como Usar a Correção

### 1. **Verificar Logs no Console**

1. Abra o console do navegador (F12)
2. Navegue para a conta do Victor
3. Observe os logs:
   - `🔍 MicrosoftInbox - Processando configId: [ID]`
   - `🔍 MicrosoftInbox - Conexões disponíveis: [array]`
   - `🔍 MicrosoftInbox - Conta ativa atual: [email]`

### 2. **Usar o Botão "Corrigir Conta"**

1. Se a conta estiver incorreta, clique no botão "Corrigir Conta"
2. O sistema forçará a seleção da conta correta baseada no `configId`
3. Observe os logs para confirmar a correção

### 3. **Verificar Informações de Debug**

O indicador de status agora mostra:
- **Conta selecionada**: Email da conta ativa
- **Config ID**: ID da configuração da URL
- **Total de Conexões**: Número de contas Microsoft disponíveis

## Diagnóstico do Problema

### **Cenário 1: ConfigId não encontrado**
```
⚠️ MicrosoftInbox - Conta não encontrada para configId: [ID]
⚠️ MicrosoftInbox - Usando conta ativa atual: [email]
```
**Solução**: Verificar se o `configId` da URL corresponde a uma conexão válida

### **Cenário 2: Conta já ativa**
```
✅ MicrosoftInbox - Conta já está ativa: [email]
```
**Solução**: A conta está correta, problema pode estar em outro lugar

### **Cenário 3: Mudança de conta**
```
🔄 MicrosoftInbox - Mudando conta ativa para: [email]
```
**Solução**: Aguardar o carregamento dos emails da conta correta

## Próximos Passos

### 1. **Teste Imediato**
1. Navegue para a conta do Victor
2. Observe os logs no console
3. Se necessário, clique em "Corrigir Conta"
4. Verifique se os emails corretos aparecem

### 2. **Se o Problema Persistir**
1. Copie os logs do console
2. Verifique se o `configId` da URL está correto
3. Confirme se a conta do Victor está na lista de conexões
4. Teste com outras contas para isolar o problema

### 3. **Limpeza do Cache**
Se necessário, limpe o localStorage:
```javascript
localStorage.removeItem('active_microsoft_connection');
```

## Arquivos Modificados

- ✅ `src/components/Microsoft/MicrosoftInbox.tsx` - Logs de debug e botão de correção
- ✅ `src/hooks/useMicrosoftConnection.ts` - Remoção de logs excessivos

## Benefícios da Correção

### 🔍 **Debugging Melhorado**
- Logs detalhados mostram exatamente o que está acontecendo
- Informações de debug visíveis na interface
- Rastreamento completo do processo de seleção

### 🛠️ **Correção Manual**
- Botão para forçar seleção da conta correta
- Controle manual quando a automática falha
- Feedback visual imediato

### 📊 **Informações de Status**
- Config ID visível para verificação
- Total de conexões disponíveis
- Status da conta ativa em tempo real

O sistema agora deve permitir identificar e corrigir o problema de seleção de conta, com logs claros e opção de correção manual quando necessário.
