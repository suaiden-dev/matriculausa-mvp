# Sistema de Notificação para Universidades - Resgate de Descontos

## Visão Geral

Este sistema notifica automaticamente as universidades quando um aluno resgata um desconto de tuition através da Matrícula Coin Store. A notificação é enviada via MailerSend usando uma Edge Function do Supabase.

## Como Funciona

### Fluxo Completo

1. **Aluno resgata desconto** → `redeem_tuition_discount()` é chamada
2. **Créditos são deduzidos** → Saldo do usuário é atualizado
3. **Resgate é registrado** → Nova entrada em `tuition_redemptions`
4. **Conta da universidade é atualizada** → `university_rewards_account` é modificada
5. **NOTIFICAÇÃO É ENVIADA** → Email para universidade via Edge Function
6. **Universidade recebe notificação** → Pode revisar no painel

### Componentes do Sistema

#### 1. Edge Function: `notify-university-discount-redemption`
- **Localização**: `project/supabase/functions/notify-university-discount-redemption/index.ts`
- **Função**: Envia email de notificação para universidades via MailerSend
- **Acionamento**: Chamada automaticamente após resgate bem-sucedido

#### 2. Serviço: `TuitionRewardsService`
- **Localização**: `project/src/services/TuitionRewardsService.ts`
- **Função**: Gerencia resgates e chama a notificação
- **Método**: `redeemTuitionDiscount()` + `notifyUniversityOfRedemption()`

#### 3. Função do Banco: `redeem_tuition_discount`
- **Localização**: `project/supabase/migrations/20250202000000_create_tuition_rewards_system.sql`
- **Função**: Processa o resgate no banco de dados
- **Nota**: Inclui comentário sobre onde a notificação é enviada

## Configuração

### Variáveis de Ambiente Necessárias

```bash
# MailerSend
MAILERSEND_API_KEY=sua_chave_api_aqui
MAILERSEND_URL=https://api.mailersend.com/v1/email

# Email do Remetente
FROM_EMAIL=support@matriculausa.com
FROM_NAME=Matrícula USA

# Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### Deploy da Edge Function

```bash
# Navegar para o diretório do projeto
cd project

# Deploy da função de notificação
supabase functions deploy notify-university-discount-redemption
```

## Uso

### Chamada Automática

A notificação é enviada automaticamente quando:

```typescript
// No frontend, ao resgatar um desconto
const result = await TuitionRewardsService.redeemTuitionDiscount(
  userId,
  universityId,
  discountId
);

// A notificação é enviada automaticamente após o sucesso
// Não é necessário fazer nada adicional
```

### Chamada Manual (se necessário)

```typescript
// Chamar diretamente a Edge Function
const { data, error } = await supabase.functions.invoke('notify-university-discount-redemption', {
  body: {
    student_id: 'uuid-do-aluno',
    student_name: 'Nome do Aluno',
    student_email: 'aluno@email.com',
    university_id: 'uuid-da-universidade',
    university_name: 'Nome da Universidade',
    university_email: 'admissions@universidade.edu', // opcional
    discount_amount: 500,
    discount_type: 'Tuition Discount',
    cost_coins: 1000,
    redemption_id: 'uuid-do-resgate'
  }
});
```

## Estrutura do Email

### Assunto
```
New Tuition Discount Redemption - [Nome do Aluno]
```

### Conteúdo
- **Header**: Título com ícone de graduação
- **Informações do Aluno**: Nome e email
- **Detalhes do Desconto**: Valor, tipo e moedas gastas
- **ID do Resgate**: Para referência no sistema
- **Próximos Passos**: O que a universidade deve fazer
- **Footer**: Informações de contato e copyright

### Estilo
- Design responsivo
- Cores da marca (azul #0052cc)
- Layout profissional e limpo
- Informações organizadas em tabela

## Tratamento de Erros

### Fallbacks Implementados

1. **Email da Universidade**: Se não fornecido, busca no banco de dados
2. **Email Padrão**: Se não encontrado, gera email baseado no nome da universidade
3. **Dados do Aluno**: Se não encontrados, usa valores padrão
4. **Falha na Notificação**: Não falha o resgate, apenas registra warning

### Logs e Monitoramento

- Logs detalhados em cada etapa
- Status de sucesso/erro para cada notificação
- Rastreamento do email enviado
- Métricas de envio

## Testes

### Teste Local

```bash
# Testar a Edge Function localmente
supabase functions serve notify-university-discount-redemption

# Fazer POST para http://localhost:54321/functions/v1/notify-university-discount-redemption
```

### Teste de Produção

```bash
# Deploy e teste
supabase functions deploy notify-university-discount-redemption

# Verificar logs
supabase functions logs notify-university-discount-redemption
```

## Manutenção

### Monitoramento

- Verificar logs da Edge Function regularmente
- Monitorar taxa de sucesso das notificações
- Verificar status do MailerSend

### Atualizações

- Manter dependências atualizadas
- Revisar templates de email periodicamente
- Atualizar variáveis de ambiente conforme necessário

## Troubleshooting

### Problemas Comuns

1. **Email não enviado**: Verificar `MAILERSEND_API_KEY`
2. **Erro de CORS**: Verificar configuração de origem
3. **Dados faltando**: Verificar payload enviado
4. **Falha no MailerSend**: Verificar status da API

### Soluções

1. **Verificar logs**: `supabase functions logs notify-university-discount-redemption`
2. **Testar API**: Verificar status do MailerSend
3. **Validar payload**: Confirmar dados enviados
4. **Revisar configuração**: Verificar variáveis de ambiente

## Próximos Passos

### Melhorias Futuras

1. **Templates personalizados** por universidade
2. **Notificações em lote** para múltiplos resgates
3. **Confirmação de leitura** via webhook
4. **Relatórios de notificações** enviadas
5. **Integração com outros sistemas** de email

### Expansão

1. **Outros tipos de notificação** (pagamentos, documentos, etc.)
2. **Múltiplos idiomas** para universidades internacionais
3. **Preferências de notificação** configuráveis
4. **Histórico de notificações** enviadas
