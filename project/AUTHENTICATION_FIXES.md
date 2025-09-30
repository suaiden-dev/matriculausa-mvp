# 🔧 Correções de Autenticação Microsoft e Supabase

## Problemas Identificados e Soluções

### 1. **Erro AADSTS90023 - Cross-origin token redemption**

**Problema**: A aplicação está configurada como "Web" no Azure AD, mas está tentando usar fluxos de SPA.

**Solução Implementada**:
- ✅ Sistema híbrido que detecta automaticamente se deve usar fluxo Web App ou SPA
- ✅ Configuração centralizada em `src/lib/microsoftAuthConfig.ts`
- ✅ Diagnóstico automático de problemas de configuração

### 2. **Múltiplas instâncias GoTrueClient**

**Problema**: Criação de múltiplas instâncias do cliente Supabase em diferentes arquivos.

**Solução Implementada**:
- ✅ Cliente Supabase centralizado em `src/lib/supabaseClient.ts`
- ✅ Configuração otimizada para evitar instâncias duplicadas
- ✅ Função para limpar instâncias duplicadas

### 3. **Falha na renovação de tokens**

**Problema**: Falta do `client_secret` para aplicações Web ou configuração incorreta.

**Solução Implementada**:
- ✅ Sistema de renovação híbrido (Web App + SPA)
- ✅ Detecção automática do tipo de fluxo
- ✅ Fallback para MSAL quando necessário

## Arquivos Modificados

### Novos Arquivos:
- `src/lib/supabaseClient.ts` - Cliente Supabase centralizado
- `src/lib/microsoftAuthConfig.ts` - Configuração centralizada Microsoft
- `src/components/Microsoft/AuthDiagnostic.tsx` - Componente de diagnóstico

### Arquivos Atualizados:
- `src/lib/graphService.ts` - Sistema de renovação híbrido
- `src/hooks/useMicrosoftConnection.ts` - Uso da configuração centralizada
- `src/lib/supabase.ts` - Re-exportação do cliente centralizado

## Como Usar

### 1. **Para Aplicações Web (com client_secret)**:
```env
VITE_AZURE_CLIENT_ID=your_client_id
VITE_AZURE_CLIENT_SECRET=your_client_secret
VITE_AZURE_REDIRECT_URI=https://your-domain.com/microsoft-email
```

### 2. **Para Aplicações SPA (sem client_secret)**:
```env
VITE_AZURE_CLIENT_ID=your_client_id
VITE_AZURE_REDIRECT_URI=https://your-domain.com/microsoft-email
# NÃO configure VITE_AZURE_CLIENT_SECRET
```

### 3. **Diagnóstico de Problemas**:
```tsx
import { AuthDiagnostic } from './components/Microsoft/AuthDiagnostic';

// Usar o componente para diagnosticar problemas
<AuthDiagnostic onClose={() => setShowDiagnostic(false)} />
```

## Configuração no Azure AD

### Para Aplicações Web:
1. **Tipo**: Web
2. **URIs de Redirecionamento**: 
   - `https://your-domain.com/microsoft-email`
   - `http://localhost:5173/microsoft-email` (desenvolvimento)
3. **Concessão Implícita**: 
   - ✅ Tokens de acesso
   - ✅ Tokens de ID
4. **Client Secret**: Configurado

### Para Aplicações SPA:
1. **Tipo**: Single-page application
2. **URIs de Redirecionamento**: 
   - `https://your-domain.com/microsoft-email`
   - `http://localhost:5173/microsoft-email` (desenvolvimento)
3. **Concessão Implícita**: 
   - ✅ Tokens de acesso
   - ✅ Tokens de ID
4. **Client Secret**: NÃO configurado

## Benefícios das Correções

### ✅ **Resolução do AADSTS90023**
- Sistema detecta automaticamente o tipo de fluxo
- Configuração híbrida funciona para ambos os tipos
- Mensagens de erro mais claras

### ✅ **Eliminação de Múltiplas Instâncias**
- Cliente Supabase centralizado
- Configuração otimizada
- Limpeza automática de instâncias duplicadas

### ✅ **Renovação de Tokens Robusta**
- Sistema híbrido Web App + SPA
- Fallback automático
- Diagnóstico de problemas

### ✅ **Melhor Experiência do Desenvolvedor**
- Diagnóstico automático de problemas
- Mensagens de erro claras
- Configuração centralizada

## Próximos Passos

1. **Teste a aplicação** com as novas configurações
2. **Verifique os logs** - devem estar mais limpos
3. **Use o componente AuthDiagnostic** se houver problemas
4. **Configure as variáveis de ambiente** conforme o tipo de aplicação

## Monitoramento

Para monitorar se as correções estão funcionando:

```javascript
// Verificar se há instâncias duplicadas
console.log('MSAL instances:', Object.keys(window).filter(k => k.includes('msal')));
console.log('Supabase instances:', Object.keys(window).filter(k => k.includes('supabase')));

// Diagnosticar problemas
import { diagnoseAuthIssues } from './src/lib/microsoftAuthConfig';
console.log('Auth issues:', diagnoseAuthIssues());
```

## Troubleshooting

### Se ainda houver erros AADSTS90023:
1. Verifique se o tipo de aplicação no Azure AD está correto
2. Confirme se as variáveis de ambiente estão configuradas
3. Use o componente AuthDiagnostic para diagnóstico detalhado

### Se ainda houver múltiplas instâncias:
1. Limpe o localStorage: `localStorage.clear()`
2. Recarregue a página
3. Use a função `clearSupabaseInstances()` se necessário

### Se a renovação de tokens falhar:
1. Verifique se o refresh token está sendo salvo corretamente
2. Confirme se a configuração do Azure AD está correta
3. Use o sistema de diagnóstico para identificar problemas
