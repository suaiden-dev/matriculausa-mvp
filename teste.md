Analisando as 4 edge functions de checkout do Stripe para explicar como funciona o controle de markup por ambiente:


[4 tools called]


Verificando como funciona a detecção de ambiente:


[1 tool called]


Verificando como funciona a detecção de ambiente:


[1 tool called]


Criando um documento explicativo sobre como funciona o controle de markup:


[1 tool called]


## Explicação simples

### Como funciona a validação

1. Detecção automática de ambiente
   - As edge functions verificam os headers da requisição (referer, origin, host)
   - Se contém matriculausa.com → PRODUÇÃO
   - Se contém staging-matriculausa.netlify.app → STAGING
   - Caso contrário → TEST/LOCALHOST

2. Controle do markup (mesma lógica nas 4 edge functions)
   typescript
   // Linha ~249 em cada edge function:
   const enableMarkupEnv = Deno.env.get('ENABLE_STRIPE_FEE_MARKUP');
   const shouldApplyMarkup = 
     enableMarkupEnv === 'true'   ? true  // Força ativar
     : enableMarkupEnv === 'false' ? false // Força desativar
     : !config.environment.isProduction;   // Auto: desativa só em produção
   

### Comportamento atual

| Ambiente | Markup está ativo? | Por quê? |
|----------|-------------------|----------|
| Localhost (localhost:5173) | Sim | Detecção automática (não é produção) |
| Produção (matriculausa.com) | Não | Detecção automática (é produção) |

### Para ativar em produção

1. Acesse Supabase Dashboard
2. Vá em Project Settings → Edge Functions → Secrets
3. Adicione:
   - Nome: ENABLE_STRIPE_FEE_MARKUP
   - Valor: true
4. Aguarde alguns minutos para propagar

### Onde está implementado

A mesma lógica está nas 4 edge functions:
- stripe-checkout-selection-process-fee (linhas 249-254, 309-314)
- stripe-checkout-application-fee (linhas 309-315)
- stripe-checkout-i20-control-fee (linhas 208-214, 295-301)
- stripe-checkout-scholarship-fee (linhas 243-249, 311-317)

Criei o arquivo EXPLICACAO_MARKUP_STRIPE.md com a documentação completa. Quer que eu mostre algum trecho específico do código?

# 📋 Explicação: Controle de Markup das Taxas do Stripe

## 🎯 Como Funciona

### 1. *Detecção Automática de Ambiente*

As 4 edge functions (stripe-checkout-selection-process-fee, stripe-checkout-application-fee, stripe-checkout-i20-control-fee, stripe-checkout-scholarship-fee) detectam automaticamente o ambiente através dos *headers da requisição*:

typescript
// Detecção baseada em:
- referer (header HTTP)
- origin (header HTTP)  
- host (header HTTP)

// Ambientes detectados:
✅ PRODUÇÃO: se contém "matriculausa.com"
✅ STAGING: se contém "staging-matriculausa.netlify.app"
✅ TEST/LOCALHOST: qualquer outro caso (localhost:5173, etc)


### 2. *Lógica de Controle do Markup*

Em todas as 4 edge functions, existe esta lógica (linhas ~249-254, ~309-315, etc):

typescript
// 1. Verifica variável de ambiente ENABLE_STRIPE_FEE_MARKUP
const enableMarkupEnv = Deno.env.get('ENABLE_STRIPE_FEE_MARKUP');

// 2. Decisão em 3 níveis:
const shouldApplyMarkup = 
  enableMarkupEnv === 'true'   // ✅ Se definido como 'true', SEMPRE ativa
    ? true 
    : enableMarkupEnv === 'false'  // ❌ Se definido como 'false', SEMPRE desativa
      ? false 
      : !config.environment.isProduction;  // 🔄 Se não definido, usa detecção automática
                                           //    - PRODUÇÃO: desativado
                                           //    - TEST/STAGING: ativado


### 3. *Comportamento Atual*

| Ambiente | Variável ENABLE_STRIPE_FEE_MARKUP | Markup Aplicado? |
|----------|--------------------------------------|------------------|
| *Localhost* (localhost:5173) | Não definida | ✅ *SIM* (detecção automática) |
| *Staging* | Não definida | ✅ *SIM* (detecção automática) |
| *Produção* | Não definida | ❌ *NÃO* (detecção automática) |
| *Qualquer* | true | ✅ *SIM* (força ativação) |
| *Qualquer* | false | ❌ *NÃO* (força desativação) |

## 🔧 Como Ativar Markup em Produção

### *Opção 1: Ativar via Variável de Ambiente (Recomendado)*

1. Acesse o *Supabase Dashboard*
2. Vá em *Project Settings* → *Edge Functions* → *Secrets*
3. Adicione uma nova variável:
   - *Nome*: ENABLE_STRIPE_FEE_MARKUP
   - *Valor*: true
4. Faça o deploy das edge functions novamente (ou aguarde alguns minutos para a variável ser propagada)

### *Opção 2: Manter Desativado em Produção*

Se você *não* adicionar a variável ENABLE_STRIPE_FEE_MARKUP, o sistema continuará:
- ✅ Aplicando markup em *localhost/staging* (para testes)
- ❌ *NÃO* aplicando markup em *produção* (proteção automática)

## 📍 Onde Está Implementado

A mesma lógica está presente nas 4 edge functions:

1. ✅ stripe-checkout-selection-process-fee/index.ts (linhas 249-254, 309-314)
2. ✅ stripe-checkout-application-fee/index.ts (linhas 309-315)
3. ✅ stripe-checkout-i20-control-fee/index.ts (linhas 208-214, 295-301)
4. ✅ stripe-checkout-scholarship-fee/index.ts (linhas 243-249, 311-317)

## 🔍 Logs para Debug

Quando a edge function roda, você verá nos logs:


✅ Markup ATIVADO (ambiente: test)
⚠ Markup DESATIVADO (ambiente: production)


Isso indica qual decisão foi tomada.

## ⚠ Importante

- A variável ENABLE_STRIPE_FEE_MARKUP é *opcional*
- Se não existir, o sistema usa detecção automática (seguro para produção)
- Se existir e for true, *força ativação* em todos os ambientes
- Se existir e for false, *força desativação* em todos os ambientes

## 🎯 Resumo Simples

*Atualmente:*
- Localhost: ✅ Markup ativo (para você testar)
- Produção: ❌ Markup desativado (proteção automática)

*Para ativar em produção:*
- Adicione ENABLE_STRIPE_FEE_MARKUP=true no Supabase Secrets