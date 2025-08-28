#!/bin/bash

# Script para deploy das Edge Functions do Zelle
# Execute este script na raiz do projeto

echo "🚀 Deployando Edge Functions do Zelle..."

# Verificar se o Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado. Instale primeiro:"
    echo "npm install -g supabase"
    exit 1
fi

# Verificar se estamos no diretório correto
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Execute este script na raiz do projeto (onde está supabase/config.toml)"
    exit 1
fi

echo "📁 Deployando create-zelle-payment..."
supabase functions deploy create-zelle-payment

echo "📁 Deployando validate-zelle-payment-result..."
supabase functions deploy validate-zelle-payment-result

echo "✅ Deploy concluído!"
echo ""
echo "🔧 Próximos passos:"
echo "1. Execute as migrações SQL no Supabase"
echo "2. Configure o n8n para receber webhooks em: https://nwh.suaiden.com/webhook/zelle-global"
echo "3. Configure o n8n para retornar resultados para validate-zelle-payment-result"
echo ""
echo "📚 Documentação: project/ZELLE_PAYMENT_INTEGRATION.md"
