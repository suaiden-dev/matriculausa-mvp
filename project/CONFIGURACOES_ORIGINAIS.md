# 📋 CONFIGURAÇÕES ORIGINAIS DO SISTEMA

## ⚠️ IMPORTANTE: Configurações para Reverter Após Testes

### 🔄 **POLLING (Cron Job)**
- **Configuração Original:** `*/5 * * * *` (A cada 5 minutos)
- **Configuração Atual (Teste):** `*/30 * * * * *` (A cada 30 segundos)
- **Comando para Reverter:**
  ```sql
  SELECT cron.alter_job(5, schedule => '*/5 * * * *');
  ```

### ⚡ **DELAYS DA IA**
- **Configuração Original:** 5-15 segundos
  ```typescript
  const humanDelay = Math.floor(Math.random() * 10000) + 5000; // 5-15s
  ```
- **Configuração Atual (Teste):** 1-3 segundos
  ```typescript
  const humanDelay = Math.floor(Math.random() * 2000) + 1000; // 1-3s
  ```

### 🚀 **RPM (Requests Per Minute)**
- **Configuração Original:** `rpm = 60`
- **Configuração Atual (Teste):** `rpm = 120`

### 📊 **RESUMO DAS ALTERAÇÕES**

| **Componente** | **Original** | **Teste** | **Status** |
|----------------|--------------|-----------|------------|
| **Polling** | 5 minutos | 30 segundos | ⚠️ MUDADO |
| **IA Delay** | 5-15s | 1-3s | ⚠️ MUDADO |
| **RPM** | 60 | 120 | ⚠️ MUDADO |

### 🔄 **COMANDOS PARA REVERSÃO**

#### 1. Reverter Polling:
```sql
SELECT cron.alter_job(5, schedule => '*/5 * * * *');
```

#### 2. Reverter Delays da IA:
```typescript
// Linha 844 e 872
const humanDelay = Math.floor(Math.random() * 10000) + 5000; // 5-15s
```

#### 3. Reverter RPM:
```typescript
// Linha 166
rpm = 60;
```

### 📝 **NOTAS IMPORTANTES**

- ⚠️ **NÃO ESQUECER:** Reverter após testes
- 🔄 **Polling:** 5 minutos é ideal para produção
- ⚡ **Delays:** 5-15s é mais natural para usuários
- 📊 **RPM:** 60 é suficiente e evita rate limiting

### 🎯 **OBJETIVO DOS TESTES**

- Verificar se a IA não responde aos próprios emails
- Confirmar que o parsing JSON está funcionando
- Testar velocidade de resposta
- Validar funcionamento geral do sistema

### ✅ **CHECKLIST DE REVERSÃO**

- [ ] Reverter polling para 5 minutos
- [ ] Reverter delays da IA para 5-15s
- [ ] Reverter RPM para 60
- [ ] Fazer deploy da versão de produção
- [ ] Testar configuração final

---
**Criado em:** 22/09/2025  
**Motivo:** Configuração temporária para testes  
**Reversão necessária:** ✅ SIM
