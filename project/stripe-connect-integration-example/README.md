# 🚀 Stripe Connect Integration - Exemplo Completo

Este projeto demonstra uma integração completa do **Stripe Connect** para plataformas, implementando todas as funcionalidades solicitadas no prompt.

## ✨ Funcionalidades Implementadas

### 🏢 **Criação de Contas Conectadas**
- ✅ Criação usando propriedades `controller` (sem `type` no nível superior)
- ✅ Configuração de taxas, perdas e dashboard
- ✅ Onboarding hospedado pela Stripe

### 📦 **Gerenciamento de Produtos**
- ✅ Criação de produtos em contas conectadas
- ✅ Uso correto do header `Stripe-Account`
- ✅ Listagem de produtos por conta

### 💳 **Processamento de Pagamentos**
- ✅ Direct Charge com application fee
- ✅ Checkout hospedado pelo Stripe
- ✅ Integração com webhooks

### 🔄 **Onboarding e Status**
- ✅ Stripe Account Links para onboarding
- ✅ Verificação de status diretamente da API
- ✅ Interface para acompanhar progresso

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Stripe**: API v2025-07-30.basil (mais recente)
- **Estilo**: Design limpo e responsivo

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta Stripe (modo restrito é suficiente para testes)
- Chaves de API do Stripe
- Conhecimento básico de JavaScript/Node.js

## 🚀 Instalação e Configuração

### 1. **Clone o Projeto**
```bash
git clone <seu-repositorio>
cd stripe-connect-integration-example
```

### 2. **Instale as Dependências**
```bash
npm install
```

### 3. **Configure as Variáveis de Ambiente**
Crie um arquivo `.env` baseado no `.env.example`:

```bash
# Chaves do Stripe
STRIPE_SECRET_KEY=sk_test_sua_chave_aqui
STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_aqui

# Stripe Connect
STRIPE_CONNECT_CLIENT_ID=ca_sua_chave_aqui

# Webhook
STRIPE_WEBHOOK_SECRET=whsec_seu_secret_aqui

# Servidor
PORT=3000
NODE_ENV=development
```

### 4. **Configure o Stripe Dashboard**

#### **A. Obter Chaves de API**
1. Acesse [dashboard.stripe.com](https://dashboard.stripe.com)
2. Vá para **Developers** → **API keys**
3. Copie as chaves **Publishable** e **Secret**

#### **B. Configurar Stripe Connect**
1. Vá para **Connect** → **Settings** → **Integration**
2. Copie o **Client ID** (começa com `ca_`)
3. Configure as URLs de redirecionamento

#### **C. Configurar Webhook**
1. Vá para **Developers** → **Webhooks**
2. Crie um endpoint: `https://seu-dominio.com/webhook`
3. Copie o **Signing secret**

### 5. **Inicie o Servidor**
```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

### 6. **Acesse a Aplicação**
Abra [http://localhost:3000](http://localhost:3000) no navegador

## 🔧 Como Usar

### **1. Criar Conta Conectada**
1. Preencha o nome e email da empresa
2. Clique em "Criar Conta Conectada"
3. A conta será criada e você receberá um ID
4. Clique no link de onboarding para completar a verificação

### **2. Criar Produtos**
1. Insira o ID da conta conectada
2. Preencha nome, descrição e preço do produto
3. Clique em "Criar Produto"
4. O produto será criado na conta conectada

### **3. Listar Produtos**
1. Insira o ID da conta conectada
2. Clique em "Listar Produtos"
3. Os produtos aparecerão em uma grade visual

### **4. Processar Pagamento**
1. Insira o ID da conta conectada e do produto
2. Clique em "Criar Sessão de Checkout"
3. Será redirecionado para o checkout do Stripe
4. Use cartões de teste para simular pagamentos

## 📚 Estrutura do Código

### **Frontend (`index.html`)**
- Interface limpa e responsiva
- Formulários para todas as operações
- Exibição visual de produtos e status

### **JavaScript (`stripe-connect.js`)**
- Lógica de frontend completa
- Chamadas para API backend
- Tratamento de erros e sucessos

### **Backend (`server.js`)**
- API REST completa
- Integração com Stripe
- Webhooks para eventos
- Validações e tratamento de erros

## 🔍 Exemplos de Uso da API

### **Criar Conta Conectada**
```bash
curl -X POST http://localhost:3000/api/create-connected-account \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Universidade XYZ",
    "business_email": "contato@universidade.com"
  }'
```

### **Criar Produto**
```bash
curl -X POST http://localhost:3000/api/create-product \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Curso de Inglês",
    "description": "Curso completo de inglês online",
    "price": 5000,
    "account_id": "acct_123..."
  }'
```

### **Listar Produtos**
```bash
curl http://localhost:3000/api/list-products/acct_123...
```

## 🧪 Testes

### **Cartões de Teste**
- **Sucesso**: `4242 4242 4242 4242`
- **Falha**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### **Fluxo de Teste Recomendado**
1. Crie uma conta conectada
2. Complete o onboarding
3. Crie alguns produtos
4. Teste o checkout
5. Verifique os webhooks

## ⚠️ Pontos Importantes

### **1. Propriedades Controller**
- ✅ **USE**: `controller.fees.payer = 'account'`
- ✅ **USE**: `controller.losses.payments = 'stripe'`
- ❌ **NÃO USE**: `type: 'express'` no nível superior

### **2. Headers Stripe-Account**
- ✅ **USE**: `stripeAccount: accountId`
- ✅ **USE**: `{ stripeAccount: accountId }`

### **3. Application Fee**
- ✅ **USE**: `application_fee_amount` para monetização
- ✅ **USE**: Direct Charge para cobranças diretas

### **4. Verificação de Status**
- ✅ **USE**: `stripe.accounts.retrieve()` diretamente
- ❌ **NÃO ARMAZENE** status em banco de dados

## 🚨 Troubleshooting

### **Erro: "Invalid API key"**
- Verifique se `STRIPE_SECRET_KEY` está configurada
- Confirme se a chave está no formato correto (`sk_test_...`)

### **Erro: "Connect not enabled"**
- Ative o Stripe Connect no seu dashboard
- Complete o processo de onboarding da plataforma

### **Erro: "Account not found"**
- Verifique se o ID da conta está correto
- Confirme se a conta foi criada com sucesso

### **Webhook não funcionando**
- Verifique se `STRIPE_WEBHOOK_SECRET` está correto
- Confirme se o endpoint está acessível publicamente
- Use ngrok para testes locais

## 🔒 Segurança

### **Variáveis de Ambiente**
- Nunca commite o arquivo `.env`
- Use diferentes chaves para dev/test/prod
- Rotacione as chaves regularmente

### **Validação de Dados**
- Valide todos os inputs do usuário
- Use HTTPS em produção
- Implemente rate limiting

### **Webhooks**
- Sempre verifique a assinatura do webhook
- Use `stripe.webhooks.constructEvent()`
- Trate erros graciosamente

## 📈 Próximos Passos

### **Funcionalidades Adicionais**
- [ ] Dashboard para contas conectadas
- [ ] Relatórios e analytics
- [ ] Sistema de notificações
- [ ] Multi-idioma
- [ ] Testes automatizados

### **Melhorias de Performance**
- [ ] Cache de produtos
- [ ] Paginação de resultados
- [ ] Compressão de respostas
- [ ] CDN para assets

### **Produção**
- [ ] Logs estruturados
- [ ] Monitoramento de saúde
- [ ] Backup de dados
- [ ] CI/CD pipeline

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

## 🆘 Suporte

- **Documentação Stripe**: [stripe.com/docs](https://stripe.com/docs)
- **Stripe Connect**: [stripe.com/connect](https://stripe.com/connect)
- **Issues**: Abra uma issue no GitHub
- **Discussões**: Use as discussões do GitHub

## 🙏 Agradecimentos

- Equipe do Stripe pela excelente documentação
- Comunidade open source
- Contribuidores do projeto

---

**⭐ Se este projeto foi útil, deixe uma estrela no GitHub!**

**🚀 Happy coding!**
