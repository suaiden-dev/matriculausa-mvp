# 📊 Teste do Sistema de UTM Tracking - Brant Immigration

## ✅ Implementação Completa

Todos os componentes do sistema de UTM tracking foram implementados com sucesso:

### Arquivos Criados

1. ✅ **`src/types/utm.ts`** - Tipos e interfaces TypeScript
2. ✅ **`src/utils/utmTracker.ts`** - Lógica de tracking e captura
3. ✅ **`supabase/migrations/20251125000000_create_utm_attributions_table.sql`** - Tabela do banco de dados

### Arquivos Modificados

1. ✅ **`src/App.tsx`** - Captura automática de UTMs em mudanças de rota
2. ✅ **`src/hooks/useAuth.tsx`** - Persistência no banco de dados
3. ✅ **`src/pages/Auth.tsx`** - Leitura e limpeza no registro

---

## 🧪 Como Testar

### Passo 1: Executar a Migration

Primeiro, você precisa aplicar a migration ao banco de dados:

```bash
# No diretório project/
npx supabase db push
```

Ou se preferir aplicar manualmente via Supabase Dashboard:
1. Vá para o Supabase Dashboard
2. Navegue até SQL Editor
3. Execute o conteúdo do arquivo `supabase/migrations/20251125000000_create_utm_attributions_table.sql`

### Passo 2: Testar Captura de UTMs

#### URL de Teste (Brant Immigration)

Acesse a aplicação com esta URL de exemplo:

```
http://localhost:5173/register?utm_source=brant&utm_medium=cpc&utm_campaign=summer_2025&utm_term=immigration&utm_content=landing_page_v1
```

**Importante:** O sistema **APENAS** captura UTMs se `utm_source=brant`

#### Verificar Captura no Console do Navegador

Após acessar a URL acima, abra o DevTools (F12) e veja o console:

```
[utmTracker] ✅ UTMs da Brant Immigration detectados: {
  utm_source: "brant",
  utm_medium: "cpc",
  utm_campaign: "summer_2025",
  utm_term: "immigration",
  utm_content: "landing_page_v1"
}
[utmTracker] ✅ UTMs salvos no localStorage: {...}
```

#### Verificar no localStorage

No DevTools, vá para Application > Local Storage:

Chave: `matriculausa:utm-attribution`

Valor esperado (JSON):
```json
{
  "utm_source": "brant",
  "utm_medium": "cpc",
  "utm_campaign": "summer_2025",
  "utm_term": "immigration",
  "utm_content": "landing_page_v1",
  "landing_page": "/register?utm_source=brant&...",
  "last_touch_page": "/register?utm_source=brant&...",
  "referrer": "",
  "capturedAt": "2025-11-25T12:30:00.000Z"
}
```

### Passo 3: Testar Registro de Usuário

1. Preencha o formulário de registro com dados válidos
2. Clique em "Create Student Account"
3. Verifique os logs no console:

```
📊 [AUTH] UTM parameters detectados: {...}
[Auth] 📊 Persistindo atribuição UTM para usuário: uuid-do-usuario
[Auth] ✅ Atribuição UTM salva com sucesso
📊 [AUTH] UTM parameters limpos do localStorage
```

### Passo 4: Verificar no Banco de Dados

Execute esta query no Supabase SQL Editor:

```sql
-- Ver todas as atribuições UTM
SELECT 
  id,
  email,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_term,
  utm_content,
  landing_page,
  last_touch_page,
  referrer,
  captured_at,
  created_at
FROM utm_attributions
ORDER BY created_at DESC
LIMIT 10;
```

Deve retornar algo como:

| email | utm_source | utm_medium | utm_campaign | landing_page |
|-------|------------|------------|--------------|--------------|
| test@example.com | brant | cpc | summer_2025 | /register?utm_source=... |

---

## 🧪 Cenários de Teste

### Cenário 1: UTM da Brant Immigration ✅

**URL:** `?utm_source=brant&utm_medium=cpc`

**Esperado:** UTMs capturados e salvos

### Cenário 2: UTM de Outra Fonte ❌

**URL:** `?utm_source=google&utm_medium=cpc`

**Esperado:** UTMs **NÃO** capturados (filtro específico para Brant)

### Cenário 3: Navegação Sem UTMs

**Fluxo:**
1. Acesse `/register?utm_source=brant&utm_medium=cpc`
2. Navegue para `/scholarships`
3. Volte para `/register`

**Esperado:** 
- UTMs permanecem salvos no localStorage
- `last_touch_page` é atualizado para cada navegação
- `landing_page` mantém o valor original

### Cenário 4: TTL de 60 Dias

**Para testar manualmente:**
1. Salve UTMs no localStorage
2. Modifique manualmente o `capturedAt` para 70 dias atrás
3. Acesse qualquer página
4. Verifique que os UTMs foram removidos

### Cenário 5: Registro Sem UTMs

**Fluxo:**
1. Acesse `/register` (sem parâmetros UTM)
2. Registre-se normalmente

**Esperado:**
- Registro funciona normalmente
- Nenhum registro criado em `utm_attributions`

---

## 📊 Queries Úteis para Análise

### Top 5 Campanhas da Brant

```sql
SELECT 
  utm_campaign,
  COUNT(*) as total_registros,
  COUNT(DISTINCT user_id) as usuarios_unicos
FROM utm_attributions
WHERE utm_source = 'brant'
GROUP BY utm_campaign
ORDER BY total_registros DESC
LIMIT 5;
```

### Taxa de Conversão por Meio (Medium)

```sql
SELECT 
  utm_medium,
  COUNT(*) as registros,
  COUNT(DISTINCT user_id) as usuarios
FROM utm_attributions
WHERE utm_source = 'brant'
GROUP BY utm_medium
ORDER BY registros DESC;
```

### Registros nos Últimos 7 Dias

```sql
SELECT 
  DATE(created_at) as data,
  COUNT(*) as registros
FROM utm_attributions
WHERE 
  utm_source = 'brant'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY data DESC;
```

### Jornada Completa de um Usuário

```sql
SELECT 
  email,
  landing_page,
  last_touch_page,
  referrer,
  utm_campaign,
  captured_at
FROM utm_attributions
WHERE email = 'usuario@example.com';
```

---

## 🔍 Debug e Troubleshooting

### Problema: UTMs não são capturados

**Verificações:**
1. Confirme que `utm_source=brant` (case-insensitive)
2. Verifique console do navegador por erros
3. Confirme que JavaScript está habilitado
4. Verifique se localStorage não está cheio

### Problema: UTMs não são salvos no banco

**Verificações:**
1. Verifique se a migration foi executada
2. Confirme políticas RLS da tabela `utm_attributions`
3. Verifique logs no console: `[Auth] ⚠️ Não foi possível salvar...`
4. Teste query manual de inserção no SQL Editor

### Problema: UTMs são sobrescritos incorretamente

**Verificações:**
1. Verifique `capturedAt` no localStorage
2. Confirme TTL de 60 dias
3. Verifique logs: `shouldOverrideExisting()`

---

## ✅ Checklist de Validação

- [ ] Migration executada com sucesso
- [ ] Tabela `utm_attributions` existe no banco
- [ ] UTMs da Brant são capturados na URL
- [ ] UTMs de outras fontes são ignorados
- [ ] Dados salvos no localStorage
- [ ] Dados persistidos no banco após registro
- [ ] localStorage limpo após registro
- [ ] TTL de 60 dias funcionando
- [ ] Queries de análise funcionando

---

## 📝 Exemplos de URLs para Testar

### Exemplo 1: Campanha de Verão
```
/register?utm_source=brant&utm_medium=email&utm_campaign=summer_promo_2025
```

### Exemplo 2: Anúncio PPC
```
/register?utm_source=brant&utm_medium=cpc&utm_campaign=google_ads&utm_term=us_immigration&utm_content=ad_variant_a
```

### Exemplo 3: Redes Sociais
```
/register?utm_source=brant&utm_medium=social&utm_campaign=facebook_june&utm_content=carousel_post
```

### Exemplo 4: Newsletter
```
/register?utm_source=brant&utm_medium=email&utm_campaign=newsletter_weekly
```

---

## 🎯 Próximos Passos (Opcional)

1. **Dashboard de Análises:** Criar página admin para visualizar dados de UTM
2. **Relatórios Automáticos:** Configurar emails semanais com estatísticas
3. **Integração com Google Analytics:** Enviar eventos para GA4
4. **A/B Testing:** Testar diferentes variações de campanha
5. **ROI Tracking:** Conectar UTMs com pagamentos para calcular ROI

---

## 📞 Contato

Para dúvidas ou problemas com o sistema de UTM tracking, consulte:
- Documentação original em `GUIA_COMPLETO_UTM_TRACKING.md`
- Este arquivo de teste
- Código fonte nos arquivos implementados

