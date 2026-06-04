# Tasks — Agency Dashboard (Trello)

## 1. Dashboard Principal da Agência

### 1.1 Reestruturar layout do dashboard
- Remover as 3 abas superiores (Add Seller / Generate registration links, Manage Users / View and manage sellers, Analytics Dashboard)
- Deixar "Manage Sellers" como seção principal (mais abaixo na página)
- Remover seção "My Students" (ou reposicionar se necessário)
- Manter navegação limpa e direta

### 1.2 Cards informativos no topo do dashboard
- **Card de Comissão**: valor total de comissões acumuladas
- **Card de Número de Estudantes**: total de alunos vinculados à agência
- **Card de Saldo Disponível para Saque**: valor disponível para retirada dentro da plataforma

### 1.3 Painel de Vendas e Registros
- Criar tabela/painel com todas as vendas e registros da agência
- Mostrar qual seller está atribuído a cada venda/registro
- Permitir ao gestor visualizar:
  - Se os vendedores estão gerando links
  - Quantos alunos estão entrando por link de cada vendedor
  - Se o aluno completou a compra (pagou)



### 1.4 Adicionar "Direct Sales" para agências
- Permitir que a agência registre vendas diretas (sem vendedor intermediário)

---

## 2. Gestão de Vendedores

### 2.1 Melhorar cadastro de vendedores
- Revisar fluxo de criação de vendedor
- Adicionar botão "Adicionar Vendedor" visível e acessível

### 2.2 Adicionar informações das agências no dashboard
- Exibir dados da agência (nome, logo, contato) no dashboard

---

## 3. Onboarding e Perfil da Agência

### 3.1 Forçar upload de logo da empresa
- Tornar o upload da logo obrigatório no onboarding
- Bloquear conclusão do onboarding sem logo

### 3.2 Corrigir: informações do onboarding não estão sendo puxadas
- Bug: dados preenchidos no onboarding não aparecem no dashboard
- Investigar se o problema está na query ou no mapeamento de campos

### 3.3 Adicionar seção "Como funciona o sistema de afiliados"
- Criar seção explicativa no dashboard ou onboarding
- Descrever regras de comissionamento, fluxo de vendas, e como acompanhar resultados

---

## 4. Comissionamento

### 4.1 Padronizar regras de comissão
- Comissão baseada na **Selection Process Fee** (entrada automática do aluno)
- Valor fixo: **$100 por aluno**
- Opção de configurar: comissão só é paga quando o aluno pagar a última taxa

### 4.2 Corrigir taxas antigas no sistema
- Atualizar as regras de comissionamento individualizadas por tipo de taxa
- Taxas atuais (todas zeradas, precisam ser configuradas):
  - Selection Process Fee
  - Scholarship Fee
  - I-20 Control Fee
  - Application Fee
- Definir se será fixo ($) ou percentual (%) por tipo

### 4.3 Configurar regras da agência antes da aprovação
- Antes de aprovar uma agência, admin deve poder configurar:
  - Tipo de comissão (fixo/percentual)
  - Valores por tipo de taxa
  - Regra de quando a comissão é liberada

---

## 5. Payment Management (Agência)

### 5.1 Melhorar página de Payment Management
- Analisar estado atual do sistema de pagamento da agência
- Verificar se o fluxo de saque funciona corretamente
- Melhorar UX da página

---

## 6. Admin Dashboard — Gestão de Agências

### 6.1 Organizar página de Agencies no admin dashboard
- Melhorar listagem de agências
- Facilitar visualização de status (pendente, ativa, inativa)
- Acesso rápido às configurações de comissão de cada agência

---

## Prioridade Sugerida

| Prioridade | Tasks |
|-----------|-------|
| **Alta** | 1.1, 1.2, 3.2, 4.1, 4.2 |
| **Média** | 1.3, 2.1, 2.2, 3.1, 4.3, 5.1 |
| **Baixa** | 1.4, 3.3, 6.1 |
