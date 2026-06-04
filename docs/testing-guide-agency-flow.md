# Testing Guide — Agency & Commission Flow

**Versão:** 1.0  
**Data:** Junho 2026  
**Destinatários:** Testers da plataforma Matricula USA

> **Atenção:** Todas as credenciais (URLs, e-mails, senhas, dados de cartão e dados de teste) serão fornecidas diretamente pelo time antes do início dos testes. Não utilize dados reais em nenhuma etapa.

---

## Visão Geral

Este guia cobre o teste completo do fluxo de agências parceiras, desde o cadastro até a verificação das comissões. Siga os passos na ordem indicada.

**Fluxo resumido:**

```
1. Cadastrar agência → 2. Onboarding (4 steps) → 3. Admin aprova + configura comissões
→ 4. Pegar link de vendas → 5. Aluno de teste faz pagamento → 6. Verificar comissões
```

---

## Pré-requisitos

- Acesso ao ambiente de testes: `https://devmatriculausa.netlify.app`
- E-mails de teste para agência, seller e aluno *(fornecidos pelo time)*
- Credenciais de admin da plataforma *(fornecidas pelo time)*
- Dados de cartão de teste Stripe *(fornecidos pelo time)*
- Dados de teste Parcelow *(fornecidos pelo time)*

---

## PARTE 1 — Cadastro da Agência

### 1.1 Acessar a página de cadastro

1. Abra o navegador e acesse: **`/agencias`**
2. Você verá uma página com duas abas: **Login** e **Request Partnership**
3. Clique na aba **Request Partnership**

### 1.2 Preencher o formulário de solicitação

Preencha os campos com dados de teste:

| Campo | Valor sugerido |
|---|---|
| Full Name | *(usar dados fornecidos pelo time)* |
| Email | *(e-mail de agência fornecido pelo time)* |
| Company Name | Test Agency LLC |
| Phone | *(usar dados fornecidos pelo time)* |
| Website | *(usar dados fornecidos pelo time)* |
| Message | Agency partnership request for testing |

4. Clique em **Send Request**
5. Verifique se aparece uma mensagem de confirmação de envio

> **O que acontece nos bastidores:** Uma `agency_request` é criada no banco. O admin precisará aprovar e enviar o convite por e-mail. Aguarde o e-mail de convite antes de continuar.

---

## PARTE 2 — Onboarding da Agência

### 2.1 Receber e aceitar o convite

1. Acesse o e-mail de testes (`tester-agency@seuemail.com`)
2. Procure por um e-mail de convite da Matricula USA
3. Clique no link de convite — ele redirecionará para **`/agency/onboarding`**
4. Crie uma senha para a conta

### 2.2 Preencher o Onboarding (4 steps)

O onboarding tem 4 etapas. Preencha todos os campos obrigatórios.

**Step 1 — Agency Profile**

| Campo | Valor sugerido |
|---|---|
| Agency Name | Test Agency LLC |
| Phone | (555) 000-0001 |
| Website | https://testagency.com |

**Step 2 — Location & Markets**

| Campo | Valor sugerido |
|---|---|
| Country | Brazil (ou país de sua preferência) |
| State/Province | São Paulo |
| City | São Paulo |
| Primary Markets | United States *(deve aparecer primeiro na lista)* |

**Step 3 — Experience & Communication**

| Campo | Valor sugerido |
|---|---|
| Years of Experience | 3-5 years |
| Channels | WhatsApp, Email |
| Languages | Portuguese, English |

**Step 4 — Goals & Description**

| Campo | Valor sugerido |
|---|---|
| Goals | Help students access US education |
| Agency Description | Test agency for QA purposes |
| Students per year | 10-50 |

5. Na última step, clique em **Complete Onboarding**
6. Você será redirecionado para **`/agency/pending-approval`**

> **O que verificar:** A página de pending approval deve aparecer corretamente, sem loops de redirecionamento. Se a página ficar em loop infinito (carregando e recarregando), isso é um bug — reporte imediatamente.

---

## PARTE 3 — Admin: Aprovar e Configurar

> Esta parte requer login com conta de **admin**.

### 3.1 Acessar o painel admin

1. Faça logout da conta da agência
2. Acesse o painel admin e navegue até **Agency Management**

### 3.2 Ver detalhes da agência antes de aprovar

1. Localize a solicitação da agência de teste na lista **Pending Requests**
2. Clique no botão de olho **(Detalhes / View)** na linha da agência
3. Um modal vai abrir com todas as informações do onboarding (Steps 1 a 4)
4. Verifique se os dados que o tester preencheu aparecem corretamente

> **O que verificar:** Todos os campos preenchidos no onboarding devem aparecer no modal. Se algum campo estiver em branco quando deveria estar preenchido, é um bug.

### 3.3 Aprovar a agência

1. Feche o modal de detalhes
2. Clique em **Approve** na linha da agência
3. Preencha o formulário de aprovação:
   - **Email:** deve estar pré-preenchido
   - **Full Name:** nome do responsável
   - **Company Name:** nome da empresa
   - **Commission Rules:** configure as regras (ver seção 3.4)
4. Clique em **Confirm Approval**

### 3.4 Configurar as regras de comissão

As regras de comissão definem quanto a agência recebe por cada pagamento de aluno.

**Tipos de comissão disponíveis:**

| Regra | Quando dispara | Sugestão de teste |
|---|---|---|
| Selection Process | Quando aluno paga a taxa de seleção | $100 fixo |
| Application Fee | Quando aluno paga a taxa de application | $50 fixo ou 10% |
| Placement Fee | Quando aluno paga a taxa de placement | Deixar desabilitado |
| Reinstatement | Quando aluno paga reinstatement | Deixar desabilitado |
| I-20 Control | Quando aluno paga I-20 | Deixar desabilitado |

**Para o teste, configure pelo menos:**
- `Selection Process` → Fixed → $100 → **Enabled**

> **Anote os valores configurados.** Você vai precisar deles para verificar se as comissões aparecem corretamente no dashboard da agência.

### 3.5 Editar regras de comissão após aprovação

Se precisar ajustar as regras depois de aprovar:

1. Na aba **Approved Agencies**, localize a agência
2. Clique em **Edit Commission Rules**
3. Ajuste e salve

---

## PARTE 4 — Dashboard da Agência: Seller Management

### 4.1 Fazer login como agência

1. Faça logout do admin
2. Acesse **`/agencias`** e faça login com o e-mail da agência (`tester-agency@seuemail.com`)
3. Você deve ser redirecionado para **`/agency/dashboard`**

### 4.2 Navegar até Seller Management

1. No menu lateral, clique em **Seller Management**
2. Você verá a lista de sellers (inicialmente vazia)

### 4.3 Criar um Seller

1. Clique em **Add Seller** ou **Invite Seller**
2. Preencha os dados do seller de teste:
   - **Name:** Test Seller
   - **Email:** *(e-mail de seller fornecido pelo time)*
3. O seller receberá um convite por e-mail

### 4.4 Pegar o Direct Sales Link

1. Após o seller ser criado/ativado, localize-o na lista
2. Clique em **Direct Sales Link** (ou ícone de link) na linha do seller
3. Copie o link — ele terá o formato:
   ```
   https://devmatriculausa.netlify.app/selection-fee-registration?ref=CODIGO-DO-SELLER
   ```
4. Guarde este link — você vai usá-lo como aluno de teste

> **O que verificar:** O link deve ser copiado sem erros. Se o botão de copiar não funcionar ou o link estiver vazio, é um bug.

---

## PARTE 5 — Fluxo de Pagamento do Aluno (Teste Completo)

> Faça logout da conta da agência antes de começar esta parte.

Você vai testar **3 métodos de pagamento** separadamente. Para cada um, use o link do seller copiado na Parte 4.

---

### 5.1 Teste com STRIPE (cartão de crédito)

1. Abra o link do seller em uma **aba anônima**:
   ```
   https://devmatriculausa.netlify.app/selection-fee-registration?ref=CODIGO-DO-SELLER
   ```
2. Preencha o formulário de cadastro do aluno:
   - Use um e-mail diferente a cada teste *(e-mails fornecidos pelo time)*
   - Preencha todos os campos obrigatórios
3. Na etapa de pagamento, selecione **Credit/Debit Card (Stripe)**
4. Use os dados de cartão de teste *(fornecidos pelo time)*
5. Confirme o pagamento

**O que verificar após o pagamento Stripe:**
- [ ] Página de confirmação de pagamento aparece sem erros
- [ ] E-mail de confirmação chega no e-mail do aluno
- [ ] No dashboard da agência → **Payment Management → Commission Balance** → a comissão aparece na lista
- [ ] O valor da comissão bate com a regra configurada (ex: $100)

---

### 5.2 Teste com PARCELOW (parcelamento)

1. Abra o link do seller em uma nova **aba anônima**
2. Cadastre um **novo aluno de teste** *(e-mail fornecido pelo time)*
3. Na etapa de pagamento, selecione **Parcelow**
4. Siga o fluxo do Parcelow usando os dados de teste *(fornecidos pelo time)*
5. Conclua o pagamento

**O que verificar após o pagamento Parcelow:**
- [ ] Redirecionamento de volta para a plataforma funciona corretamente
- [ ] Status do pagamento aparece como confirmado
- [ ] Comissão aparece no dashboard da agência
- [ ] Valor bate com a regra configurada

---

### 5.3 Teste com ZELLE (transferência manual)

> O Zelle é um pagamento **manual** — o admin precisa confirmar o recebimento.

1. Abra o link do seller em uma nova **aba anônima**
2. Cadastre um **novo aluno de teste** *(e-mail fornecido pelo time)*
3. Na etapa de pagamento, selecione **Zelle**
4. O sistema exibirá as instruções de pagamento Zelle (e-mail ou telefone)
5. **Simule a confirmação pelo admin:**
   - Faça login como admin
   - Localize o aluno na fila de pagamentos pendentes
   - Marque o pagamento como recebido/confirmado

**O que verificar após confirmação manual Zelle:**
- [ ] Status do aluno atualiza para pago
- [ ] Comissão aparece no dashboard da agência após confirmação
- [ ] Valor bate com a regra configurada

---

## PARTE 6 — Verificação de Comissões

Esta é a parte **mais crítica** do teste. O objetivo é garantir que os valores exibidos na agência batem com o que o admin vê.

### 6.1 Verificar no Dashboard da Agência

1. Faça login como agência
2. Navegue até **Payment Management**
3. Acesse a aba **Commission Balance**

**O que verificar:**

| Item | Esperado |
|---|---|
| Active Commission Rules | Mostrar as regras configuradas pelo admin (ex: Selection Process: $100) |
| Commissions Earned | Número de comissões geradas |
| Total Accumulated | Soma de todas as comissões |
| Available Balance | Total acumulado menos saques já realizados |
| Commission History (tabela) | Uma linha por pagamento, com Date, Fee Type, Seller Code, Student Fee Paid, Commission |

**Calcule manualmente:**
- Se você fez 3 pagamentos (Stripe + Parcelow + Zelle) com comissão de $100 cada → Total Accumulated deve ser **$300**

### 6.2 Verificar no Dashboard do Admin

1. Faça login como admin
2. Acesse **Agency Management → Approved Agencies**
3. Localize a agência de teste e abra os detalhes

**O que verificar:**
- [ ] O total acumulado mostrado pelo admin bate com o que a agência vê
- [ ] O número de alunos referidos bate
- [ ] O histórico de comissões mostra os mesmos pagamentos
- [ ] Nenhum valor "fantasma" aparece (comissões duplicadas ou zeradas incorretamente)

> **Regra de ouro:** O que a agência vê deve ser exatamente o que o admin vê. Qualquer divergência é um bug.

---

## PARTE 7 — Testar Direções do Seller

O seller tem acesso a um painel próprio para acompanhar seus alunos e links.

### 7.1 Acessar como seller

1. Acesse o e-mail do seller de teste *(fornecido pelo time)*
2. Siga o link de convite e faça login
3. Explore o painel do seller

### 7.2 Checklist de UX do seller

- [ ] O seller consegue ver seu link de referral facilmente?
- [ ] O seller consegue copiar o link com 1 clique?
- [ ] O seller consegue ver quantos alunos usaram seu link?
- [ ] As instruções na página estão claras e em inglês?
- [ ] Há algum texto quebrado, cortado ou em português onde deveria ser inglês?
- [ ] Algum botão não faz nada quando clicado?
- [ ] Alguma página demora mais de 5 segundos para carregar?
- [ ] Em tela de celular (mobile), o layout está legível e usável?

---

## PARTE 8 — Checklist Final de Bugs

Ao final do teste, preencha este checklist:

### Fluxo de Cadastro
- [ ] Formulário de solicitação de parceria envia sem erros
- [ ] E-mail de convite chega em até 5 minutos
- [ ] Onboarding completa sem loops ou erros de redirecionamento
- [ ] Página pending-approval aparece corretamente após o onboarding

### Fluxo de Aprovação (Admin)
- [ ] Modal de detalhes mostra todos os dados do onboarding
- [ ] Aprovação com regras de comissão funciona
- [ ] Edição de regras após aprovação funciona

### Fluxo de Pagamento
- [ ] Stripe: pagamento processa e comissão é gerada
- [ ] Parcelow: pagamento processa e comissão é gerada
- [ ] Zelle: confirmação manual gera comissão corretamente

### Comissões
- [ ] Valores no dashboard da agência batem com as regras configuradas
- [ ] Valores no dashboard do admin batem com o dashboard da agência
- [ ] Commission History mostra: Date, Fee Type, Seller Code, Student Fee Paid, Commission
- [ ] Não há comissões duplicadas

### Seller
- [ ] Criação de seller funciona
- [ ] Link de direct sales é gerado corretamente
- [ ] Painel do seller está em inglês e sem bugs de UX

---

## Como Reportar Bugs

Para cada bug encontrado, registre:

1. **Título curto** — ex: "Comissão não aparece após pagamento Zelle"
2. **Steps para reproduzir** — o passo-a-passo exato
3. **Resultado esperado** — o que deveria acontecer
4. **Resultado obtido** — o que aconteceu de fato
5. **Screenshot ou vídeo** — se possível
6. **URL da página** — onde o bug ocorreu
7. **Método de pagamento** — se aplicável (Stripe / Parcelow / Zelle)

---

*Dúvidas? Entre em contato com o time de desenvolvimento.*
