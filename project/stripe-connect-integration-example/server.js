/**
 * Servidor Backend para Stripe Connect Integration
 * 
 * Este servidor implementa todas as funcionalidades necessárias para
 * Stripe Connect conforme especificado no prompt
 */

const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ⚠️ IMPORTANTE: Configure suas variáveis de ambiente
// PLACEHOLDER: Substitua pela sua chave secreta do Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', {
    apiVersion: '2025-07-30.basil' // Versão mais recente conforme especificado
});

/**
 * 1. CRIAR CONTA CONECTADA
 * 
 * Endpoint: POST /api/create-connected-account
 * 
 * Cria uma nova conta conectada usando as propriedades controller
 * conforme especificado no prompt
 */
app.post('/api/create-connected-account', async (req, res) => {
    try {
        const { business_name, business_email } = req.body;
        
        // Validação dos campos obrigatórios
        if (!business_name || !business_email) {
            return res.status(400).json({
                success: false,
                error: 'business_name e business_email são obrigatórios'
            });
        }
        
        // ⚠️ IMPORTANTE: Usar apenas propriedades controller conforme especificado
        // NÃO usar type: 'express', 'standard' ou 'custom' no nível superior
        const account = await stripe.accounts.create({
            controller: {
                // A plataforma controla a coleta de taxas - conta conectada paga as taxas
                fees: {
                    payer: 'account'
                },
                // Stripe gerencia disputas de pagamento e perdas
                losses: {
                    payments: 'stripe'
                },
                // Conta conectada recebe acesso total ao dashboard Stripe
                stripe_dashboard: {
                    type: 'full'
                }
            },
            // Informações básicas da empresa
            business_profile: {
                name: business_name,
                url: `https://${business_name.toLowerCase().replace(/\s+/g, '')}.com`
            },
            // Email da conta
            email: business_email,
            // Configurações de pagamento
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true }
            }
        });
        
        console.log('✅ Conta conectada criada:', account.id);
        
        res.json({
            success: true,
            account_id: account.id,
            account: account
        });
        
    } catch (error) {
        console.error('❌ Erro ao criar conta conectada:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 2. CRIAR LINK DE ONBOARDING
 * 
 * Endpoint: POST /api/create-onboarding-link
 * 
 * Cria um link para que a conta conectada complete o onboarding
 * usando Stripe Account Links conforme especificado
 */
app.post('/api/create-onboarding-link', async (req, res) => {
    try {
        const { account_id } = req.body;
        
        if (!account_id) {
            return res.status(400).json({
                success: false,
                error: 'account_id é obrigatório'
            });
        }
        
        // Criar link de onboarding usando Stripe Account Links
        const accountLink = await stripe.accountLinks.create({
            account: account_id,
            refresh_url: `${req.protocol}://${req.get('host')}/refresh`,
            return_url: `${req.protocol}://${req.get('host')}/return`,
            type: 'account_onboarding'
        });
        
        console.log('✅ Link de onboarding criado para conta:', account_id);
        
        res.json({
            success: true,
            onboarding_url: accountLink.url,
            account_link: accountLink
        });
        
    } catch (error) {
        console.error('❌ Erro ao criar link de onboarding:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 3. VERIFICAR STATUS DA CONTA
 * 
 * Endpoint: GET /api/account-status/:accountId
 * 
 * Verifica o status atual da conta conectada diretamente da API
 * conforme especificado no prompt
 */
app.get('/api/account-status/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        
        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: 'accountId é obrigatório'
            });
        }
        
        // ⚠️ IMPORTANTE: Sempre obter status diretamente da API
        // NÃO armazenar em banco de dados conforme especificado
        const account = await stripe.accounts.retrieve(accountId);
        
        console.log('✅ Status da conta obtido:', account.id);
        
        res.json({
            success: true,
            account: account
        });
        
    } catch (error) {
        console.error('❌ Erro ao obter status da conta:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 4. CRIAR PRODUTO
 * 
 * Endpoint: POST /api/create-product
 * 
 * Cria um produto na conta conectada usando o header Stripe-Account
 * conforme especificado no prompt
 */
app.post('/api/create-product', async (req, res) => {
    try {
        const { name, description, price, account_id } = req.body;
        
        // Validação dos campos obrigatórios
        if (!name || !description || !price || !account_id) {
            return res.status(400).json({
                success: false,
                error: 'name, description, price e account_id são obrigatórios'
            });
        }
        
        // ⚠️ IMPORTANTE: Usar stripeAccount para o header Stripe-Account
        // Conforme especificado no prompt
        const product = await stripe.products.create({
            name: name,
            description: description,
            default_price_data: {
                unit_amount: price,
                currency: 'brl',
            },
        }, {
            stripeAccount: account_id, // Usar stripeAccount para o header Stripe-Account
        });
        
        console.log('✅ Produto criado na conta conectada:', product.id);
        
        res.json({
            success: true,
            product: product
        });
        
    } catch (error) {
        console.error('❌ Erro ao criar produto:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 5. LISTAR PRODUTOS
 * 
 * Endpoint: GET /api/list-products/:accountId
 * 
 * Lista produtos de uma conta conectada usando o header Stripe-Account
 * conforme especificado no prompt
 */
app.get('/api/list-products/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        
        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: 'accountId é obrigatório'
            });
        }
        
        // ⚠️ IMPORTANTE: Usar stripeAccount para o header Stripe-Account
        // Conforme especificado no prompt
        const products = await stripe.products.list({
            limit: 100,
        }, {
            stripeAccount: accountId, // Usar stripeAccount para o header Stripe-Account
        });
        
        console.log('✅ Produtos listados da conta conectada:', accountId);
        
        res.json({
            success: true,
            products: products.data
        });
        
    } catch (error) {
        console.error('❌ Erro ao listar produtos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 6. CRIAR SESSÃO DE CHECKOUT
 * 
 * Endpoint: POST /api/create-checkout-session
 * 
 * Cria uma sessão de checkout para processar pagamentos
 * usando Direct Charge com application fee conforme especificado
 */
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { product_id, account_id, product_name, price } = req.body;
        
        // Validação dos campos obrigatórios
        if (!product_id || !account_id) {
            return res.status(400).json({
                success: false,
                error: 'product_id e account_id são obrigatórios'
            });
        }
        
        // ⚠️ IMPORTANTE: Usar hosted checkout para simplicidade
        // Conforme especificado no prompt
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: product_name || 'Produto',
                        },
                        unit_amount: price || 1000, // R$ 10,00 em centavos
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                // ⚠️ IMPORTANTE: Application Fee para monetizar a transação
                // Conforme especificado no prompt
                application_fee_amount: Math.floor((price || 1000) * 0.1), // 10% de taxa
            },
            mode: 'payment',
            success_url: `${req.protocol}://${req.get('host')}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.protocol}://${req.get('host')}/cancel`,
        }, {
            stripeAccount: account_id, // Usar stripeAccount para o header Stripe-Account
        });
        
        console.log('✅ Sessão de checkout criada:', session.id);
        
        res.json({
            success: true,
            checkout_url: session.url,
            session: session
        });
        
    } catch (error) {
        console.error('❌ Erro ao criar sessão de checkout:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 7. WEBHOOK PARA EVENTOS DO STRIPE
 * 
 * Endpoint: POST /webhook
 * 
 * Processa eventos do Stripe (pagamentos, disputas, etc.)
 */
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...'; // PLACEHOLDER
    
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('❌ Erro na verificação do webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Processar eventos
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('✅ Checkout completado:', session.id);
            // Aqui você pode implementar lógica adicional
            break;
            
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('✅ Pagamento realizado:', paymentIntent.id);
            // Aqui você pode implementar lógica adicional
            break;
            
        default:
            console.log(`ℹ️ Evento não processado: ${event.type}`);
    }
    
    res.json({ received: true });
});

/**
 * 8. PÁGINAS DE SUCESSO E CANCELAMENTO
 */
app.get('/success', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Pagamento Realizado com Sucesso</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: #059669; }
            </style>
        </head>
        <body>
            <h1 class="success">✅ Pagamento Realizado com Sucesso!</h1>
            <p>Obrigado por sua compra.</p>
            <p>Session ID: ${req.query.session_id || 'N/A'}</p>
            <a href="/">Voltar ao Demo</a>
        </body>
        </html>
    `);
});

app.get('/cancel', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Pagamento Cancelado</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .cancel { color: #dc2626; }
            </style>
        </head>
        <body>
            <h1 class="cancel">❌ Pagamento Cancelado</h1>
            <p>O pagamento foi cancelado. Tente novamente.</p>
            <a href="/">Voltar ao Demo</a>
        </body>
        </html>
    `);
});

app.get('/refresh', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Onboarding em Andamento</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            </style>
        </head>
        <body>
            <h1>🔄 Onboarding em Andamento</h1>
            <p>Continue completando o processo de verificação.</p>
            <a href="/">Voltar ao Demo</a>
        </body>
        </html>
    `);
});

app.get('/return', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Onboarding Concluído</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: #059669; }
            </style>
        </head>
        <body>
            <h1 class="success">✅ Onboarding Concluído!</h1>
            <p>Sua conta foi configurada com sucesso.</p>
            <a href="/">Voltar ao Demo</a>
        </body>
        </html>
    `);
});

// Rota raiz
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📋 Acesse: http://localhost:${PORT}`);
    console.log(`⚠️  Configure as variáveis de ambiente antes de usar!`);
});

// Tratamento de erros
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});
