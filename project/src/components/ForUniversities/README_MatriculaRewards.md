# 🎯 Programa Matricula Rewards - Componentes

## 📋 Visão Geral

Este diretório contém os componentes necessários para implementar o **Programa Matricula Rewards** - um sistema onde universidades podem optar por participar de um programa de referência estudantil com benefícios financeiros.

## 🚀 Componentes Disponíveis

### 1. `UniversityProgramOptInModal.tsx`
**Modal principal** que explica o programa e pergunta se a universidade aceita participar.

**Funcionalidades:**
- ✅ Explicação completa do programa Matricula Rewards
- ✅ Processo de 3 etapas para universidades
- ✅ Benefícios claros e exemplos práticos
- ✅ Botões SIM/NÃO para aceitar ou recusar
- ✅ Design responsivo e profissional

**Props:**
```typescript
interface UniversityProgramOptInModalProps {
  isOpen: boolean;           // Controla se o modal está aberto
  onClose: () => void;       // Função para fechar o modal
  onAccept: () => void;      // Função executada quando aceita
  onDecline: () => void;     // Função executada quando recusa
}
```

### 2. `UniversityProgramOptInDemo.tsx`
**Componente de demonstração** para testar e visualizar o modal em ação.

**Funcionalidades:**
- 🎯 Simulação completa do fluxo
- 📊 Visualização do resultado da escolha
- 📖 Instruções de uso
- 🔄 Botão para resetar a demonstração

## 🎨 Como Usar

### Implementação Básica

```typescript
import React, { useState } from 'react';
import UniversityProgramOptInModal from './UniversityProgramOptInModal';

const YourComponent: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAccept = () => {
    // Universidade aceitou participar
    console.log('Universidade aceitou!');
    // Redirecionar para processo de inscrição
    // ou mostrar formulário de cadastro
  };

  const handleDecline = () => {
    // Universidade não quer participar
    console.log('Universidade recusou!');
    // Mostrar mensagem ou redirecionar
  };

  return (
    <div>
      {/* Botão "Join Program" original */}
      <button onClick={() => setIsModalOpen(true)}>
        Join Program
      </button>

      {/* Modal de opt-in */}
      <UniversityProgramOptInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </div>
  );
};
```

### Substituindo o Botão "Join Program"

**Antes (fluxo direto):**
```typescript
<button onClick={handleJoinProgram}>
  Join Program
</button>
```

**Depois (com opt-in):**
```typescript
<button onClick={() => setIsModalOpen(true)}>
  Join Program
</button>

<UniversityProgramOptInModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onAccept={handleJoinProgram}  // Só executa se aceitar
  onDecline={handleDecline}     // Executa se recusar
/>
```

## 🔄 Fluxo de Usuário

### 1. Universidade Acessa
- Universidade clica em "Join Program"
- Modal abre automaticamente

### 2. Lê Sobre o Programa
- Explicação clara do Matricula Rewards
- Como funciona para universidades
- Benefícios e exemplos práticos

### 3. Decide Participar
- **SIM**: Continua para processo de inscrição
- **NÃO**: Modal fecha, universidade não participa

### 4. Resultado
- **Aceitou**: Redireciona para cadastro/inscrição
- **Recusou**: Mostra mensagem ou fecha

## 🎯 Casos de Uso

### ✅ Universidade Aceita
```typescript
const handleAccept = () => {
  // 1. Salvar escolha no banco de dados
  saveUniversityChoice('accepted');
  
  // 2. Redirecionar para processo de inscrição
  navigate('/university-registration');
  
  // 3. Mostrar mensagem de sucesso
  showSuccessMessage('Bem-vindo ao programa Matricula Rewards!');
};
```

### ❌ Universidade Recusa
```typescript
const handleDecline = () => {
  // 1. Salvar escolha no banco de dados
  saveUniversityChoice('declined');
  
  // 2. Mostrar mensagem explicativa
  showInfoMessage('Entendemos sua decisão. Você pode participar a qualquer momento.');
  
  // 3. Opcional: oferecer mais informações
  showContactInfo();
};
```

## 🎨 Personalização

### Cores e Estilo
O componente usa as cores padrão do projeto:
- **Primária**: `#05294E` (azul escuro)
- **Secundária**: `#D0151C` (vermelho)
- **Gradientes**: Combinações das cores principais

### Responsividade
- ✅ Mobile-first design
- ✅ Breakpoints: `md:` (768px+)
- ✅ Scroll automático para conteúdo longo

### Ícones
Usa `lucide-react` para ícones consistentes:
- `Coins`, `Users`, `DollarSign`
- `CheckCircle`, `XCircle`, `X`

## 🧪 Testando

### 1. Demo Interativo
Execute o `UniversityProgramOptInDemo` para ver o modal em ação.

### 2. Testes de Integração
```typescript
// Teste de aceitação
fireEvent.click(screen.getByText('SIM, quero participar'));
expect(handleAccept).toHaveBeenCalled();

// Teste de recusa
fireEvent.click(screen.getByText('NÃO, não quero participar'));
expect(handleDecline).toHaveBeenCalled();
```

## 📱 Compatibilidade

- ✅ **React**: 18+
- ✅ **TypeScript**: 4.5+
- ✅ **Tailwind CSS**: 3.0+
- ✅ **Lucide React**: 0.263+
- ✅ **Navegadores**: Chrome, Firefox, Safari, Edge

## 🚀 Próximos Passos

### Implementação Completa
1. ✅ Criar componentes (FEITO)
2. 🔄 Integrar com sistema existente
3. 🔄 Adicionar persistência de escolha
4. 🔄 Implementar fluxo de inscrição
5. 🔄 Adicionar analytics e tracking

### Melhorias Futuras
- 📊 Dashboard para universidades participantes
- 💰 Sistema de pagamentos automático
- 📧 Notificações por email
- 🔔 Lembretes para universidades não participantes

## 📞 Suporte

Para dúvidas ou sugestões sobre estes componentes:
- 📧 Abra uma issue no repositório
- 💬 Entre em contato com a equipe de desenvolvimento
- 📖 Consulte a documentação do projeto

---

**🎯 Objetivo**: Transformar o botão "Join Program" em um processo de opt-in claro e transparente, explicando os benefícios do Matricula Rewards para universidades.
