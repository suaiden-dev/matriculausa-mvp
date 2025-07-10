# Tour de Onboarding - Documentação

## Visão Geral

O tour de onboarding é uma funcionalidade interativa que guia novos usuários através do processo de candidatura para bolsas de estudo. Ele foi desenvolvido usando a biblioteca `react-joyride` e oferece uma experiência visual moderna e intuitiva.

## Características Principais

### 🎨 Design Moderno
- Interface limpa e moderna com cores do projeto (#05294E)
- Animações suaves e transições elegantes
- Overlay com efeito de blur para foco no conteúdo
- Tipografia consistente com a fonte Lato

### 🧠 Lógica Inteligente
- **Detecção Dinâmica**: O tour detecta automaticamente quantas bolsas foram selecionadas
- **Adaptação de Conteúdo**: As mensagens se adaptam ao estado atual da aplicação
- **Navegação Inteligente**: Pula etapas desnecessárias baseado no progresso do usuário
- **Fallbacks**: Múltiplos seletores para encontrar elementos na página

### 📱 Responsivo
- Funciona perfeitamente em dispositivos móveis e desktop
- Ajusta automaticamente o tamanho e posicionamento dos tooltips
- Botões e textos otimizados para diferentes tamanhos de tela

## Estrutura dos Steps

### Step 0: Boas-vindas
- **Tipo**: Modal centralizado
- **Conteúdo**: Mensagem de boas-vindas com emojis e badges informativos
- **Ação**: Introduz o usuário ao processo

### Step 1: Seleção de Bolsas
- **Target**: `.scholarship-list-container, .scholarship-browser, [data-testid="scholarship-list"]`
- **Conteúdo**: Explica como selecionar bolsas
- **Adaptação**: Mostra número de bolsas selecionadas

### Step 2: Carrinho
- **Target**: `#scholarship-summary-hat-icon, .floating-cart-button, [data-testid="cart-icon"]`
- **Conteúdo**: Explica o carrinho de bolsas
- **Adaptação**: Detecta se há bolsas no carrinho

### Step 3: Próximo Passo
- **Target**: `.next-step-button, [data-testid="next-step-button"]`
- **Conteúdo**: Guia para o próximo passo
- **Adaptação**: Baseado no estado atual

### Step 4: Tipo de Estudante
- **Target**: `.student-type-form, [data-testid="student-type-form"]`
- **Conteúdo**: Explica a seleção do tipo de estudante

### Step 5: Upload de Documentos
- **Target**: `.document-upload-area, [data-testid="document-upload"]`
- **Conteúdo**: Guia para upload de documentos
- **Adaptação**: Pula se documentos já foram aprovados

### Step 6: Status de Aprovação
- **Target**: `.application-status-tracker, [data-testid="status-tracker"]`
- **Conteúdo**: Explica o acompanhamento do status

### Step 7: Pagamento
- **Target**: `.final-payment-selection-list, [data-testid="payment-section"]`
- **Conteúdo**: Guia para o pagamento final

### Step 8: Finalização
- **Target**: `.my-applications-grid, [data-testid="applications-dashboard"]`
- **Conteúdo**: Mensagem de parabéns e finalização

## Como Usar

### Para Desenvolvedores

1. **Testar o Tour**:
   ```bash
   # Em desenvolvimento, um botão "Testar Tour" aparece no canto superior direito
   # Clique nele para iniciar o tour manualmente
   ```

2. **Forçar o Tour**:
   ```bash
   # Adicione ?tour=start na URL
   http://localhost:3000/?tour=start
   ```

3. **Reiniciar o Tour**:
   ```javascript
   // No console do navegador
   localStorage.removeItem('onboardingTourCompleted');
   window.location.reload();
   ```

### Para Usuários

O tour inicia automaticamente para novos usuários. Usuários existentes podem:
- Acessar com `?tour=start` na URL
- Usar o botão "Testar Tour" (apenas em desenvolvimento)

## Personalização

### Cores e Estilos
As cores principais são definidas no objeto `joyrideStyles`:
- **Primary**: `#05294E` (azul principal do projeto)
- **Background**: `#ffffff` (branco)
- **Text**: `#1e293b` (cinza escuro)
- **Overlay**: `rgba(0, 0, 0, 0.75)` com blur

### Conteúdo
Cada step pode ser personalizado editando o array `TOUR_STEPS` no arquivo `OnboardingTour.tsx`.

### Seletores
Para adicionar novos elementos ao tour, adicione seletores CSS ou `data-testid` nos componentes correspondentes.

## Troubleshooting

### Elementos não encontrados
Se o tour não consegue encontrar um elemento:
1. Verifique se o seletor CSS está correto
2. Adicione `data-testid` ao elemento
3. Verifique se o elemento está renderizado na página atual

### Tour não inicia
1. Verifique se `localStorage.getItem('onboardingTourCompleted') !== 'true'`
2. Verifique se não há `?tour=start` na URL
3. Verifique se o componente está sendo renderizado

### Problemas de navegação
1. Verifique se os elementos de destino existem na página
2. Verifique se há conflitos de z-index
3. Verifique se o overlay está funcionando corretamente

## Performance

O tour foi otimizado para:
- Carregamento rápido
- Animações suaves
- Baixo impacto na performance
- Compatibilidade com diferentes navegadores

## Acessibilidade

O tour inclui:
- Navegação por teclado
- Textos alternativos
- Contraste adequado
- Suporte a leitores de tela
- Botões com títulos descritivos 