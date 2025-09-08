# 🔄 **Exemplo: Substituindo StripeCheckout pelo ScholarshipConfirmationModal**

## 📍 **Arquivo: ApplicationFeePage.tsx**

### **ANTES: Usando StripeCheckout diretamente**
```typescript
// ANTES: Fluxo direto para Stripe
<StripeCheckout
  productId="applicationFee"
  paymentType="application_fee"
  feeType="application_fee"
  buttonText={`Pay Application Fee ($${selectedScholarshipId && cart.find(item => item.scholarships.id === selectedScholarshipId)?.scholarships.application_fee_amount 
    ? Number(cart.find(item => item.scholarships.id === selectedScholarshipId)?.scholarships.application_fee_amount).toFixed(2)
    : '350.00'
  })`}
  successUrl={`${window.location.origin}/student/dashboard/application-fee-success?session_id={CHECKOUT_SESSION_ID}`}
  cancelUrl={`${window.location.origin}/student/dashboard/application-fee-error`}
  disabled={!selectedScholarshipId}
  beforeCheckout={createOrGetApplication}
  metadata={{ 
    selected_scholarship_id: selectedScholarshipId,
    student_process_type: localStorage.getItem('studentProcessType') || null,
  }}
  scholarshipData={selectedScholarshipId ? {
    title: cart.find(item => item.scholarships.id === selectedScholarshipId)?.scholarships.title || '',
    universityName: cart.find(item => item.scholarships.id === selectedScholarshipId)?.scholarships.universities?.name || 
                   cart.find(item => item.scholarships.id === selectedScholarshipId)?.scholarships.university_name || 'Unknown University',
    applicationFeeAmount: cart.find(item => item.scholarships.id === selectedScholarshipId)?.scholarships.application_fee_amount || 350.00
  } : undefined}
/>
```

### **DEPOIS: Usando ScholarshipConfirmationModal**
```typescript
// DEPOIS: Novo fluxo com modal de confirmação
import { ScholarshipConfirmationModal } from '../../components/ScholarshipConfirmationModal';

// Adicionar estado para o modal
const [showConfirmationModal, setShowConfirmationModal] = useState(false);
const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);

// Função para abrir o modal
const handleApplyScholarship = () => {
  if (!selectedScholarshipId) return;
  
  const scholarship = cart.find(item => item.scholarships.id === selectedScholarshipId)?.scholarships;
  if (scholarship) {
    setSelectedScholarship(scholarship);
    setShowConfirmationModal(true);
  }
};

// Função para processar checkout Stripe
const handleStripeCheckout = async () => {
  if (!selectedScholarship) return;
  
  try {
    // Criar aplicação primeiro
    const result = await createOrGetApplication();
    if (!result?.applicationId) {
      throw new Error('Não foi possível criar a aplicação');
    }

    // Redirecionar para Stripe com os parâmetros corretos
    const params = new URLSearchParams({
      productId: 'applicationFee',
      paymentType: 'application_fee',
      feeType: 'application_fee',
      successUrl: `${window.location.origin}/student/dashboard/application-fee-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/student/dashboard/application-fee-error`,
      selected_scholarship_id: selectedScholarship.id,
      student_process_type: localStorage.getItem('studentProcessType') || '',
      application_id: result.applicationId
    });
    
    window.location.href = `/checkout/stripe?${params.toString()}`;
  } catch (error) {
    console.error('Erro ao processar checkout:', error);
  }
};

// Substituir o StripeCheckout pelo botão que abre o modal
<button
  onClick={handleApplyScholarship}
  disabled={!selectedScholarshipId}
  className="w-full bg-green-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
>
  {`Pay Application Fee ($${selectedScholarshipId && cart.find(item => item.scholarships.id === selectedScholarshipId)?.scholarships.application_fee_amount 
    ? Number(cart.find(item => item.scholarships.id === selectedScholarshipId)?.scholarships.application_fee_amount).toFixed(2)
    : '350.00'
  })`}
</button>

// Adicionar o modal no final do componente
{selectedScholarship && (
  <ScholarshipConfirmationModal
    isOpen={showConfirmationModal}
    onClose={() => setShowConfirmationModal(false)}
    scholarship={selectedScholarship}
    onStripeCheckout={handleStripeCheckout}
  />
)}
```

## 🔧 **Implementação Completa da ApplicationFeePage**

```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { ScholarshipConfirmationModal } from '../../components/ScholarshipConfirmationModal';
import { Scholarship } from '../../types';

const ApplicationFeePage: React.FC = () => {
  // ... estados existentes ...
  
  // NOVOS estados para o modal
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);

  // ... lógica existente ...

  // NOVA função para abrir o modal
  const handleApplyScholarship = () => {
    if (!selectedScholarshipId) return;
    
    const scholarship = cart.find(item => item.scholarships.id === selectedScholarshipId)?.scholarships;
    if (scholarship) {
      setSelectedScholarship(scholarship);
      setShowConfirmationModal(true);
    }
  };

  // NOVA função para processar checkout Stripe
  const handleStripeCheckout = async () => {
    if (!selectedScholarship) return;
    
    try {
      // Criar aplicação primeiro
      const result = await createOrGetApplication();
      if (!result?.applicationId) {
        throw new Error('Não foi possível criar a aplicação');
      }

      // Redirecionar para Stripe com os parâmetros corretos
      const params = new URLSearchParams({
        productId: 'applicationFee',
        paymentType: 'application_fee',
        feeType: 'application_fee',
        successUrl: `${window.location.origin}/student/dashboard/application-fee-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/student/dashboard/application-fee-error`,
        selected_scholarship_id: selectedScholarship.id,
        student_process_type: localStorage.getItem('studentProcessType') || '',
        application_id: result.applicationId
      });
      
      window.location.href = `/checkout/stripe?${params.toString()}`;
    } catch (error) {
      console.error('Erro ao processar checkout:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* ... conteúdo existente ... */}
      
      <div className="mt-6">
        {/* SUBSTITUIR StripeCheckout por este botão */}
        <button
          onClick={handleApplyScholarship}
          disabled={!selectedScholarshipId}
          className="w-full bg-green-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {`Pay Application Fee ($${selectedScholarshipId && cart.find(item => item.scholarships.id === selectedScholarshipId)?.scholarships.application_fee_amount 
            ? Number(cart.find(item => item.scholarships.id === selectedScholarshipId)?.scholarships.application_fee_amount).toFixed(2)
            : '350.00'
          })`}
        </button>
      </div>

      {/* ADICIONAR o modal no final */}
      {selectedScholarship && (
        <ScholarshipConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          scholarship={selectedScholarship}
          onStripeCheckout={handleStripeCheckout}
        />
      )}
    </div>
  );
};
```

## ✅ **Benefícios da Mudança**

1. **UX Melhorada**: Usuário vê todas as informações antes de pagar
2. **Valor Dinâmico**: `application_fee_amount` da bolsa específica
3. **Escolha de Método**: Stripe ou Zelle
4. **Contexto Mantido**: Usuário vê bolsa + universidade + valor
5. **Fluxo Inteligente**: Modal unificado substitui múltiplos passos

## 🎯 **Próximos Passos**

1. **Implementar** esta mudança na `ApplicationFeePage`
2. **Testar** com diferentes valores de `application_fee_amount`
3. **Aplicar** o mesmo padrão em outras páginas
4. **Verificar** se o redirecionamento para Stripe funciona corretamente

---

**🎉 Agora você tem um exemplo completo de como implementar o modal!**
