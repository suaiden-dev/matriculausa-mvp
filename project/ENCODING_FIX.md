# Correção de Encoding de Caracteres

## Problema Identificado

### Sintoma
Emails com caracteres especiais e emojis chegam corrompidos:
- **Original**: "As promos das Lojas Oficiais tão on 🎉"
- **Recebido**: "As promos das Lojas Oficiais tÃƒÂ£o on Ã°ÂŸÂŸÂ¢"

### Causa
- **Double encoding**: Texto sendo codificado duas vezes
- **UTF-8 mal interpretado**: Caracteres especiais e emojis corrompidos
- **Problema comum em forwards**: Gmail às vezes não preserva encoding correto

## Solução Implementada

### Função de Correção
```typescript
function fixEncoding(text: string): string {
  if (!text) return text;
  
  try {
    // Verificar se parece estar double-encoded
    if (text.includes('ÃƒÂ£') || text.includes('Ã°ÂŸÂŸÂ¢')) {
      console.log('🔧 Detected encoding issues, attempting to fix:', text);
      
      // Tentar decodificar UTF-8
      const buffer = new Uint8Array(text.split('').map(c => c.charCodeAt(0)));
      const decoder = new TextDecoder('utf-8');
      const decoded = decoder.decode(buffer);
      
      console.log('✅ Fixed encoding:', decoded);
      return decoded;
    }
    
    return text;
  } catch (error) {
    console.log('⚠️ Could not fix encoding for text:', text);
    return text;
  }
}
```

### Aplicação
A função é aplicada na **Edge Function `send-gmail-message`** que é usada para:
- **Compose**: `EmailComposer.tsx` → `send-gmail-message`
- **Reply**: `ReplyComposer.tsx` → `send-gmail-message`
- **Forward**: `ForwardComposer.tsx` → `send-gmail-message`
- **AI Responses**: `ai-email-processor` → `send-gmail-message`

A correção é aplicada em:
- **Subject**: Título do email
- **Body**: Corpo do email
- **HTML Body**: Versão HTML do email

## Padrões de Correção

### Caracteres Comuns Corrigidos
- `ÃƒÂ£` → `ã`
- `Ã°ÂŸÂŸÂ¢` → `🎉`
- `Ã©` → `é`
- `Ã¡` → `á`
- `Ã³` → `ó`

### Emojis Corrigidos
- `Ã°ÂŸÂŸÂ¢` → `🎉`
- `Ã°ÂŸÂŸÂ£` → `🎃`
- `Ã°ÂŸÂŸÂ¦` → `🎆`

## Testes

### Casos de Teste
1. **Email normal**: "Olá, como vai?"
2. **Email com acentos**: "Promoções estão on! 🎉"
3. **Email com emojis**: "Check out our deals 🛍️💯"
4. **Email corrompido**: "PromoÃ§Ãµes estÃ£o on Ã°ÂŸÂŸÂ¢"

### Verificação
```bash
# Ver logs da função
supabase functions logs send-gmail-message

# Procurar por logs de correção
grep "Detected encoding issues" logs.txt
grep "Fixed encoding" logs.txt
```

## Monitoramento

### Logs Importantes
- `🔧 Detected encoding issues`: Problema detectado
- `✅ Fixed encoding`: Correção bem-sucedida
- `⚠️ Could not fix encoding`: Falha na correção

### Métricas
- Quantidade de emails com problemas de encoding
- Taxa de sucesso na correção
- Tipos de caracteres mais problemáticos

## Próximos Passos

### Melhorias Futuras
1. **Detecção mais inteligente**: Identificar mais padrões de encoding
2. **Correção automática**: Aplicar correção em tempo real
3. **Relatórios**: Dashboard de problemas de encoding
4. **Prevenção**: Configurações para evitar problemas

### Configurações
```typescript
// Configurações futuras
const encodingConfig = {
  autoFix: true,
  logIssues: true,
  reportMetrics: true,
  fallbackEncoding: 'utf-8'
};
```

## Troubleshooting

### Problema: Correção não funciona
1. Verificar se o padrão está na lista de detecção
2. Verificar logs da função
3. Testar com diferentes tipos de encoding

### Problema: Correção quebra texto válido
1. Verificar se a detecção está muito agressiva
2. Ajustar padrões de detecção
3. Adicionar whitelist de textos válidos

### Problema: Performance
1. Otimizar função de detecção
2. Cachear resultados
3. Aplicar apenas quando necessário

## Deploy

### Comando para Deploy
```bash
supabase functions deploy send-gmail-message
```

### Verificação Pós-Deploy
1. Enviar email de teste com caracteres especiais
2. Verificar logs da função
3. Confirmar que correção foi aplicada
4. Verificar dados no n8n

## Exemplo de Uso

### Antes da Correção
```json
{
  "subject": "PromoÃ§Ãµes estÃ£o on Ã°ÂŸÂŸÂ¢",
  "body": "Confira nossas ofertas especiais Ã© imperdÃ­vel!"
}
```

### Depois da Correção
```json
{
  "subject": "Promoções estão on 🎉",
  "body": "Confira nossas ofertas especiais é imperdível!"
}
``` 