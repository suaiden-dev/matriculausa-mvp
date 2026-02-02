# Correção: Parcelow URL Truncada

## Problema

A Parcelow estava truncando as URLs de redirecionamento de sucesso, removendo o parâmetro `payment_method=parcelow`. 

**Exemplo de URL esperada:**
```
http://localhost:5173/student/dashboard/selection-process-fee-success?reference=sp_ml13mjsb&payment_method=parcelow
```

**URL recebida (truncada):**
```
http://localhost:5173/student/dashboard/selection-process-fee-success?reference=sp_ml13mjsb&payment_
```

Isso fazia com que as páginas de sucesso não conseguissem detectar que era um pagamento Parcelow e ficassem esperando um `session_id` do Stripe que nunca chegava, resultando na tela de erro.

## Solução

Modificamos a lógica de detecção de pagamento Parcelow em todas as páginas de sucesso para **não depender** do parâmetro `payment_method` na URL.

### Nova Lógica de Detecção

1. **Detecção primária**: Se houver `reference` E NÃO houver `session_id`, assumir que é Parcelow
2. **Fallback**: Se houver `payment_method=parcelow` explicitamente, também detectar como Parcelow

```typescript
// Detectar se é pagamento Parcelow
// Se houver reference e NÃO houver session_id, é Parcelow
// (A Parcelow trunca a URL, então não podemos depender do payment_method)
if (reference && !sessionId) {
  console.log('[Parcelow] Pagamento Parcelow detectado (via reference)');
  verifyParcelowPayment(reference);
  return;
}

// Fallback: se tiver payment_method=parcelow explicitamente
if (paymentMethod === 'parcelow' && reference) {
  console.log('[Parcelow] Pagamento Parcelow detectado (via payment_method)');
  verifyParcelowPayment(reference);
  return;
}
```

## Arquivos Modificados

1. ✅ `src/pages/StudentDashboard/SelectionProcessFeeSuccess.tsx`
2. ✅ `src/pages/StudentDashboard/ScholarshipFeeSuccess.tsx`
3. ✅ `src/pages/StudentDashboard/I20ControlFeeSuccess.tsx`
4. ✅ `src/pages/StudentDashboard/ApplicationFeeSuccess.tsx`

## Como Funciona Agora

### Fluxo Parcelow
1. Usuário completa pagamento na Parcelow
2. Parcelow redireciona para: `...?reference=sp_xxxxx&payment_` (truncado)
3. Página de sucesso detecta `reference` sem `session_id`
4. Inicia polling para verificar status do pagamento no banco
5. Quando webhook da Parcelow atualiza o status para "paid", mostra animação de sucesso

### Fluxo Stripe (não afetado)
1. Usuário completa pagamento no Stripe
2. Stripe redireciona para: `...?session_id=cs_xxxxx`
3. Página de sucesso detecta `session_id` sem `reference`
4. Verifica sessão do Stripe normalmente

## Teste

Para testar, basta fazer um pagamento via Parcelow e verificar se:
1. A página de sucesso carrega corretamente
2. O polling inicia automaticamente
3. Quando o webhook processar, a animação de sucesso aparece
4. Após 6 segundos, redireciona para a página apropriada

## Data
2026-01-30
