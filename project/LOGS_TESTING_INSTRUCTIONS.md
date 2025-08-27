# 🔍 **INSTRUÇÕES PARA TESTAR OS LOGS - Mapeamento do Problema**

## 📋 **O QUE FOI IMPLEMENTADO**

### **1. Logs no Dashboard Principal (`AffiliateAdminDashboard/index.tsx`)**
- ✅ Logs detalhados para `loadAffiliateAdminData`
- ✅ Logs para chamadas das funções SQL
- ✅ Logs para processamento de dados
- ✅ Logs para estado final

### **2. Logs no SellerManagement (`SellerManagement.tsx`)**
- ✅ Logs detalhados para `deactivateSeller`
- ✅ Logs para cada passo da desativação
- ✅ Logs para `loadSellers`
- ✅ Logs para filtros e estado

---

## 🧪 **COMO TESTAR - PASSO A PASSO**

### **PASSO 1: Abrir o Console do Navegador**
1. **F12** → Console
2. **Limpar logs** (botão 🗑️)
3. **Verificar se não há erros** (deve estar limpo)

### **PASSO 2: Acessar o Affiliate Admin Dashboard**
1. **Login como affiliate_admin**
2. **Navegar para `/affiliate-admin/dashboard`**
3. **Verificar logs no console:**

```
🔄 [DASHBOARD] Starting to load affiliate admin data
🔄 [DASHBOARD] User ID: [uuid]
🔄 [DASHBOARD] User Role: affiliate_admin
🔄 [DASHBOARD] Calling get_admin_analytics_fixed with admin_user_id: [uuid]
✅ [DASHBOARD] Analytics data loaded successfully: [dados]
🔄 [DASHBOARD] Calling get_admin_sellers_analytics_fixed with admin_user_id: [uuid]
✅ [DASHBOARD] Sellers data loaded successfully: [dados]
🔄 [DASHBOARD] Processing analytics data...
📊 [DASHBOARD] Processed analytics: {total_sellers: X, active_sellers: Y, ...}
🔄 [DASHBOARD] Processing sellers data...
👥 [DASHBOARD] Processed sellers: {count: X, sellers: [...]}
🔄 [DASHBOARD] Setting final stats and state...
📊 [DASHBOARD] Final stats to be set: {totalSellers: X, activeSellers: Y, ...}
👥 [DASHBOARD] Setting sellers state with count: X
✅ [DASHBOARD] Data loading completed successfully
```

### **PASSO 3: Verificar Contador de Sellers**
1. **Observar o número no dashboard principal**
2. **Anotar o valor** (ex: "3 Active Sellers")
3. **Verificar se corresponde aos logs**

### **PASSO 4: Ir para "Manage Sellers"**
1. **Clicar na aba "Manage Sellers"**
2. **Verificar logs no console:**

```
🔄 [SELLER_MANAGEMENT] useEffect triggered - calling loadSellers
🔄 [SELLER_MANAGEMENT] dataLoadedRef.current: false
🔄 [SELLER_MANAGEMENT] isInitialized.current: false
🔄 [SELLER_MANAGEMENT] First time loading sellers
🔄 [SELLER_MANAGEMENT] loadSellers called - fetching sellers from database
🔄 [SELLER_MANAGEMENT] Current state: {localModifications: 0, sellersCount: 0, forceRefresh: false}
🔄 [SELLER_MANAGEMENT] Fetching sellers from database with is_active = true
🔄 [SELLER_MANAGEMENT] Processing seller data from database
📊 [SELLER_MANAGEMENT] Raw sellers data from database: {count: X, sellers: [...]}
🔄 [SELLER_MANAGEMENT] Filtering out deactivated sellers from database results
🔄 [SELLER_MANAGEMENT] Filtered sellers from database: {total: X, active: Y, deactivated: Z, deactivatedIds: [...]}
🔄 [SELLER_MANAGEMENT] Setting sellers in local state
✅ [SELLER_MANAGEMENT] Sellers state updated with X sellers
✅ [SELLER_MANAGEMENT] Final sellers count in state: X
🔄 [SELLER_MANAGEMENT] loadSellers finished (success or error)
```

### **PASSO 5: Desativar um Seller**
1. **Clicar em "Deactivate" em um seller**
2. **Confirmar a desativação**
3. **Verificar logs no console:**

```
🔄 [SELLER_MANAGEMENT] Starting deactivation for seller: [id] [name]
🔄 [SELLER_MANAGEMENT] Current sellers count before deactivation: X
🔄 [SELLER_MANAGEMENT] Step 1: Updating sellers.is_active = false in database
✅ [SELLER_MANAGEMENT] Step 1 completed: seller deactivated in database
🔄 [SELLER_MANAGEMENT] Step 2: Updating user_profiles.role = deactivated_seller
✅ [SELLER_MANAGEMENT] Step 2 completed: User role updated to deactivated_seller
🔄 [SELLER_MANAGEMENT] Step 3: Updating local state - removing seller from list
🔄 [SELLER_MANAGEMENT] Local state updated: {before: X, after: Y, removed: [id]}
✅ [SELLER_MANAGEMENT] Step 3 completed: Local state updated
🔄 [SELLER_MANAGEMENT] Step 4: Tracking modifications and deactivated sellers
🔄 [SELLER_MANAGEMENT] Step 5: Persisting to localStorage
✅ [SELLER_MANAGEMENT] Steps 4-5 completed: Seller tracked and persisted
✅ [SELLER_MANAGEMENT] Added seller to local modifications and deactivated sellers: [id]
✅ [SELLER_MANAGEMENT] Seller deactivation completed successfully
✅ [SELLER_MANAGEMENT] Final sellers count after deactivation: Y
🔄 [SELLER_MANAGEMENT] Deactivation process finished (success or error)
```

### **PASSO 6: Verificar Contador Atualizado**
1. **Observar se o contador diminuiu** (ex: de 3 para 2)
2. **Verificar se o seller foi removido da lista**
3. **Anotar o novo valor**

### **PASSO 7: Sair e Voltar da Página**
1. **Navegar para outra página** (ex: Overview)
2. **Voltar para "Manage Sellers"**
3. **Verificar logs no console:**

```
🔄 [SELLER_MANAGEMENT] useEffect triggered - calling loadSellers
🔄 [SELLER_MANAGEMENT] dataLoadedRef.current: true
🔄 [SELLER_MANAGEMENT] isInitialized.current: true
🔄 [SELLER_MANAGEMENT] Skipping loadSellers - already loaded or initialized
```

### **PASSO 8: Verificar Dashboard Principal**
1. **Voltar para o dashboard principal**
2. **Verificar se o contador ainda está correto**
3. **Verificar logs no console** (deve recarregar os dados)

---

## 🔍 **O QUE PROCURAR NOS LOGS**

### **✅ SUCESSO (Problema Resolvido):**
- Dashboard carrega dados corretamente
- Contador diminui após desativação
- Seller desativado NÃO aparece ao sair/voltar
- Contador permanece correto

### **❌ PROBLEMA (Ainda Não Resolvido):**
- Dashboard falha ao carregar dados
- Contador não diminui
- Seller desativado aparece novamente
- Contador fica inconsistente

---

## 🚨 **POSSÍVEIS PROBLEMAS E SOLUÇÕES**

### **Problema 1: Funções SQL Falham**
```
❌ [DASHBOARD] Error loading analytics data: [erro]
❌ [DASHBOARD] Error loading sellers data: [erro]
```
**Solução**: Verificar se as migrações foram aplicadas corretamente

### **Problema 2: Dados Não São Processados**
```
✅ [DASHBOARD] Analytics data loaded successfully: null
✅ [DASHBOARD] Sellers data loaded successfully: []
```
**Solução**: Verificar se o `admin_user_id` está correto

### **Problema 3: Estado Local Não Atualiza**
```
🔄 [SELLER_MANAGEMENT] Local state updated: {before: X, after: X, removed: [id]}
```
**Solução**: Verificar se o `sellerId` está correto

### **Problema 4: Filtro Não Funciona**
```
📊 [SELLER_MANAGEMENT] Raw sellers data from database: {count: 8, sellers: [...]}
🔄 [SELLER_MANAGEMENT] Filtered sellers from database: {total: 8, active: 8, deactivated: 0}
```
**Solução**: Verificar se `s.is_active = true` está funcionando

---

## 📝 **RELATÓRIO DE TESTE**

### **Informações a Coletar:**
1. **Contador inicial**: [número]
2. **Contador após desativação**: [número]
3. **Contador ao sair/voltar**: [número]
4. **Seller desativado aparece novamente?**: [sim/não]
5. **Logs de erro encontrados**: [lista]
6. **Funções SQL funcionam?**: [sim/não]

### **Status Final:**
- ✅ **PROBLEMA RESOLVIDO**
- ❌ **PROBLEMA PERSISTE** (descrever comportamento)
- ⚠️ **PROBLEMA PARCIAL** (descrever o que funciona e o que não)

---

## 🎯 **OBJETIVO DO TESTE**

**Confirmar se as funções SQL criadas estão resolvendo o problema de desativação de sellers e sincronização entre o SellerManagement e o Dashboard Principal.**

**Execute o teste e me informe os resultados dos logs para podermos identificar onde ainda está o problema!** 🔍
