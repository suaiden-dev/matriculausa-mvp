/**
 * Stripe Connect Integration - Exemplo Completo
 * 
 * Este arquivo demonstra como integrar Stripe Connect em uma aplicação
 * usando a API mais recente (2025-07-30.basil)
 */

// Configuração do Stripe
// ⚠️ IMPORTANTE: Substitua pela sua chave pública do Stripe
const stripe = Stripe('pk_test_...'); // PLACEHOLDER: Sua chave pública do Stripe

// Configuração da API
const API_BASE_URL = 'http://localhost:3000'; // PLACEHOLDER: URL da sua API

/**
 * 1. CRIAR CONTA CONECTADA
 * 
 * Cria uma nova conta conectada usando as propriedades controller
 * conforme especificado no prompt
 */
async function createConnectedAccount() {
    const businessName = document.getElementById('businessName').value;
    const businessEmail = document.getElementById('businessEmail').value;
    
    if (!businessName || !businessEmail) {
        showError('Por favor, preencha todos os campos');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/create-connected-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                business_name: businessName,
                business_email: businessEmail
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(`Conta conectada criada com sucesso! ID: ${result.account_id}`);
            
            // Criar link de onboarding
            await createOnboardingLink(result.account_id);
        } else {
            showError(`Erro ao criar conta: ${result.error}`);
        }
    } catch (error) {
        showError(`Erro na requisição: ${error.message}`);
    }
}

/**
 * 2. CRIAR LINK DE ONBOARDING
 * 
 * Cria um link para que a conta conectada complete o onboarding
 */
async function createOnboardingLink(accountId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/create-onboarding-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                account_id: accountId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Link de onboarding criado! Redirecionando...');
            
            // Redirecionar para o onboarding
            setTimeout(() => {
                window.open(result.onboarding_url, '_blank');
            }, 1000);
            
            // Atualizar status da conta
            updateAccountStatus(accountId);
        } else {
            showError(`Erro ao criar link de onboarding: ${result.error}`);
        }
    } catch (error) {
        showError(`Erro na requisição: ${error.message}`);
    }
}

/**
 * 3. ATUALIZAR STATUS DA CONTA
 * 
 * Verifica o status atual da conta conectada diretamente da API
 * conforme especificado no prompt
 */
async function updateAccountStatus(accountId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/account-status/${accountId}`);
        const result = await response.json();
        
        if (result.success) {
            const statusDiv = document.getElementById('accountStatus');
            const statusClass = getStatusClass(result.account.charges_enabled);
            const statusText = getStatusText(result.account.charges_enabled);
            
            statusDiv.innerHTML = `
                <div class="status ${statusClass}">
                    <strong>Status da Conta:</strong> ${statusText}
                </div>
                <p><strong>ID da Conta:</strong> ${result.account.id}</p>
                <p><strong>Nome:</strong> ${result.account.business_profile?.name || 'N/A'}</p>
                <p><strong>Email:</strong> ${result.account.email || 'N/A'}</p>
                <p><strong>Cobranças Habilitadas:</strong> ${result.account.charges_enabled ? 'Sim' : 'Não'}</p>
                <p><strong>Repasses Habilitados:</strong> ${result.account.payouts_enabled ? 'Sim' : 'Não'}</p>
            `;
        } else {
            showError(`Erro ao obter status: ${result.error}`);
        }
    } catch (error) {
        showError(`Erro na requisição: ${error.message}`);
    }
}

/**
 * 4. CRIAR PRODUTO
 * 
 * Cria um produto na conta conectada usando o header Stripe-Account
 */
async function createProduct() {
    const name = document.getElementById('productName').value;
    const description = document.getElementById('productDescription').value;
    const price = document.getElementById('productPrice').value;
    const accountId = document.getElementById('connectedAccountId').value;
    
    if (!name || !description || !price || !accountId) {
        showError('Por favor, preencha todos os campos');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/create-product`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                description: description,
                price: parseInt(price),
                account_id: accountId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(`Produto criado com sucesso! ID: ${result.product.id}`);
            document.getElementById('productResult').innerHTML = `
                <div class="success">
                    <strong>Produto Criado:</strong><br>
                    <strong>ID:</strong> ${result.product.id}<br>
                    <strong>Nome:</strong> ${result.product.name}<br>
                    <strong>Preço:</strong> R$ ${(result.product.default_price?.unit_amount / 100).toFixed(2)}<br>
                    <strong>Descrição:</strong> ${result.product.description}
                </div>
            `;
        } else {
            showError(`Erro ao criar produto: ${result.error}`);
        }
    } catch (error) {
        showError(`Erro na requisição: ${error.message}`);
    }
}

/**
 * 5. LISTAR PRODUTOS
 * 
 * Lista produtos de uma conta conectada usando o header Stripe-Account
 */
async function listProducts() {
    const accountId = document.getElementById('listAccountId').value;
    
    if (!accountId) {
        showError('Por favor, insira o ID da conta conectada');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/list-products/${accountId}`);
        const result = await response.json();
        
        if (result.success) {
            displayProducts(result.products);
        } else {
            showError(`Erro ao listar produtos: ${result.error}`);
        }
    } catch (error) {
        showError(`Erro na requisição: ${error.message}`);
    }
}

/**
 * 6. EXIBIR PRODUTOS
 * 
 * Exibe os produtos em uma grade visual
 */
function displayProducts(products) {
    const productsDiv = document.getElementById('productsList');
    
    if (products.length === 0) {
        productsDiv.innerHTML = '<p>Nenhum produto encontrado.</p>';
        return;
    }
    
    let html = '<div class="products-grid">';
    
    products.forEach(product => {
        const price = product.default_price?.unit_amount || 0;
        const priceFormatted = (price / 100).toFixed(2);
        
        html += `
            <div class="product-card">
                <h3>${product.name}</h3>
                <div class="price">R$ ${priceFormatted}</div>
                <div class="description">${product.description || 'Sem descrição'}</div>
                <p><strong>ID:</strong> ${product.id}</p>
                <button class="btn" onclick="buyProduct('${product.id}', '${priceFormatted}', '${product.name}')">
                    🛒 Comprar
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    productsDiv.innerHTML = html;
}

/**
 * 7. COMPRAR PRODUTO
 * 
 * Inicia o processo de compra de um produto
 */
async function buyProduct(productId, price, productName) {
    const accountId = document.getElementById('listAccountId').value;
    
    if (!accountId) {
        showError('Por favor, insira o ID da conta conectada');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId,
                account_id: accountId,
                product_name: productName,
                price: parseFloat(price) * 100 // Converter para centavos
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Sessão de checkout criada! Redirecionando...');
            
            // Redirecionar para o checkout do Stripe
            setTimeout(() => {
                window.open(result.checkout_url, '_blank');
            }, 1000);
        } else {
            showError(`Erro ao criar checkout: ${result.error}`);
        }
    } catch (error) {
        showError(`Erro na requisição: ${error.message}`);
    }
}

/**
 * 8. CRIAR SESSÃO DE CHECKOUT
 * 
 * Cria uma sessão de checkout para processar pagamentos
 */
async function createCheckoutSession() {
    const accountId = document.getElementById('checkoutAccountId').value;
    const productId = document.getElementById('checkoutProductId').value;
    
    if (!accountId || !productId) {
        showError('Por favor, preencha todos os campos');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId,
                account_id: accountId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Sessão de checkout criada! Redirecionando...');
            
            // Redirecionar para o checkout do Stripe
            setTimeout(() => {
                window.open(result.checkout_url, '_blank');
            }, 1000);
        } else {
            showError(`Erro ao criar checkout: ${result.error}`);
        }
    } catch (error) {
        showError(`Erro na requisição: ${error.message}`);
    }
}

// Funções auxiliares
function getStatusClass(chargesEnabled) {
    if (chargesEnabled) return 'active';
    return 'pending';
}

function getStatusText(chargesEnabled) {
    if (chargesEnabled) return 'Ativo - Pronto para receber pagamentos';
    return 'Pendente - Aguardando verificação';
}

function showSuccess(message) {
    const div = document.createElement('div');
    div.className = 'success';
    div.textContent = message;
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.remove();
    }, 5000);
}

function showError(message) {
    const div = document.createElement('div');
    div.className = 'error';
    div.textContent = message;
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.remove();
    }, 5000);
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Stripe Connect Integration Demo carregado!');
    console.log('📋 Configure as variáveis de ambiente e teste as funcionalidades.');
});
