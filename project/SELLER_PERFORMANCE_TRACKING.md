# Seller Performance Tracking - Dashboard de Monitoramento

## Visão Geral

A nova funcionalidade **Seller Performance Tracking** foi implementada no dashboard de admin dos afiliados para permitir o monitoramento detalhado da performance de cada vendedor. Esta página oferece insights valiosos sobre o desempenho dos vendedores, incluindo métricas de conversão, histórico de pagamentos e análise detalhada dos estudantes referenciados.

## Funcionalidades Implementadas

### 1. **Seleção de Vendedor**
- Grid de cards mostrando todos os vendedores ativos
- Métricas rápidas: total de estudantes e receita por vendedor
- Seleção visual com destaque para o vendedor escolhido

### 2. **Métricas de Performance**
- **Total de Estudantes**: Número total de estudantes referenciados
- **Receita Total**: Valor total gerado pelo vendedor
- **Taxa de Conversão**: Percentual de estudantes que completaram pagamentos
- **Estudantes Ativos**: Contagem de estudantes com pagamentos completados
- **Pagamentos Pendentes**: Estudantes com pagamentos em processamento

### 3. **Abas de Navegação**

#### **Overview Tab**
- Resumo das atividades recentes do vendedor
- Métricas de performance calculadas
- Botões para exportar dados em CSV
- Informações sobre última referência e data de criação

#### **Students Tab**
- Lista completa de estudantes referenciados pelo vendedor
- Filtros por status de pagamento (completed, pending, cancelled)
- Busca por nome ou email do estudante
- Informações detalhadas: país, status, valor pago, aplicações
- Contagem de aplicações para bolsas por estudante

#### **Payment History Tab**
- Histórico completo de pagamentos dos estudantes referenciados
- Filtros por período (30 dias, 90 dias, 1 ano, todos)
- Detalhes: tipo de taxa, valor, status, data
- Session ID do Stripe para rastreamento

### 4. **Exportação de Dados**
- Exportação de lista de estudantes em CSV
- Exportação de histórico de pagamentos em CSV
- Arquivos nomeados com data para organização

## Estrutura Técnica

### **Arquivos Criados/Modificados**

1. **`SellerPerformanceTracking.tsx`** - Nova página principal
2. **`AffiliateAdminDashboardLayout.tsx`** - Layout atualizado com nova aba
3. **`index.tsx`** - Rotas atualizadas
4. **`20250201000001_create_seller_performance_function.sql`** - Função SQL para dados

### **Função SQL Principal**

```sql
get_seller_performance_data()
```
- Retorna métricas agregadas para todos os vendedores
- Calcula taxas de conversão automaticamente
- Ordena por receita e número de estudantes

### **Tabelas Utilizadas**

- `sellers` - Informações dos vendedores
- `affiliate_referrals` - Referências e status de pagamento
- `user_profiles` - Perfis dos estudantes
- `scholarship_applications` - Aplicações para bolsas
- `stripe_sessions` - Histórico de pagamentos

## Como Acessar

1. **Login como Affiliate Admin**
2. **Navegar para**: `/affiliate-admin/dashboard/performance`
3. **Selecionar vendedor** para monitorar
4. **Usar as abas** para diferentes visualizações

## Métricas Disponíveis para Tracking

### **Por Vendedor:**
- Total de estudantes referenciados
- Receita total gerada
- Taxa de conversão (estudantes que pagaram)
- Estudantes ativos vs. pendentes
- Data da última referência
- Tempo como vendedor

### **Por Estudante:**
- Nome, email e país
- Status do pagamento
- Valor total pago
- Número de aplicações para bolsas
- Data da referência
- Última atividade

### **Por Pagamento:**
- Nome do estudante
- Valor da taxa
- Tipo de taxa (application, scholarship, etc.)
- Status do pagamento
- Data da transação
- Session ID do Stripe

## Benefícios para o Admin

1. **Monitoramento em Tempo Real**: Acompanhe a performance dos vendedores
2. **Identificação de Problemas**: Detecte vendedores com baixa conversão
3. **Análise de Tendências**: Entenda padrões de sucesso
4. **Relatórios Exportáveis**: Gere relatórios para stakeholders
5. **Tomada de Decisão**: Base de dados para estratégias de crescimento

## Próximas Melhorias Sugeridas

1. **Gráficos e Dashboards**: Visualizações interativas com Chart.js ou D3
2. **Alertas Automáticos**: Notificações para quedas de performance
3. **Comparação Entre Períodos**: Análise de crescimento mês a mês
4. **Ranking de Performance**: Leaderboard dos melhores vendedores
5. **Integração com Analytics**: Dados de comportamento dos estudantes
6. **Relatórios Agendados**: Envio automático de relatórios por email

## Considerações de Performance

- Função SQL otimizada com índices apropriados
- Paginação implementada para grandes volumes de dados
- Filtros aplicados no frontend para melhor UX
- Cache de dados para reduzir chamadas ao banco

## Segurança

- Acesso restrito apenas para usuários com role `affiliate_admin`
- Função SQL com `SECURITY DEFINER`
- Validação de permissões em todas as operações
- Dados isolados por organização/afiliação
