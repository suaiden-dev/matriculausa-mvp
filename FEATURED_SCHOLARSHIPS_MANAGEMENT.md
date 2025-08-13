# Gerenciamento de Bolsas em Destaque

## Visão Geral

Esta funcionalidade permite que administradores gerenciem quais bolsas aparecem na seção "Destaques da Semana" da página principal de bolsas. As bolsas em destaque são exibidas separadamente das bolsas gerais, evitando duplicação e proporcionando uma experiência de usuário mais organizada.

## Funcionalidades

### 1. Página Dedicada de Administração
- **Rota**: `/admin/dashboard/featured-scholarships`
- **Acesso**: Apenas usuários com role `admin`
- **Localização**: Menu lateral do AdminDashboard

### 2. Gerenciamento de Destaques
- **Limite**: Máximo de 6 bolsas em destaque simultaneamente
- **Controle**: Marcar/desmarcar bolsas como destaque
- **Ordenação**: Reordenar bolsas em destaque usando setas para cima/baixo
- **Modal**: Interface para adicionar novas bolsas aos destaques

### 3. Filtros e Busca
- **Busca**: Por título, universidade ou área de estudo
- **Filtros**: Todas as bolsas, Em Destaque, Não Destacadas
- **Estatísticas**: Contadores em tempo real

## Estrutura do Banco de Dados

### Tabela `scholarships`
```sql
-- Colunas adicionadas
is_highlighted BOOLEAN DEFAULT FALSE
featured_order INTEGER
```

### Índices Criados
```sql
-- Índice simples para is_highlighted
CREATE INDEX idx_scholarships_is_highlighted ON scholarships(is_highlighted);

-- Índice para featured_order
CREATE INDEX idx_scholarships_featured_order ON scholarships(featured_order);

-- Índice composto para consultas otimizadas
CREATE INDEX idx_scholarships_highlighted_ordered ON scholarships(is_highlighted, featured_order) 
WHERE is_highlighted = TRUE;
```

## Arquivos Modificados

### 1. Nova Página
- `project/src/pages/AdminDashboard/FeaturedScholarshipsManagement.tsx`

### 2. Roteamento
- `project/src/pages/AdminDashboard/index.tsx` - Adicionada nova rota
- `project/src/pages/AdminDashboard/AdminDashboardLayout.tsx` - Adicionado item de menu

### 3. Tipos e Hooks
- `project/src/types/index.ts` - Adicionada propriedade `featured_order`
- `project/src/hooks/useScholarships.ts` - Incluída nova coluna nas consultas

### 4. Páginas Existentes
- `project/src/pages/Scholarships.tsx` - Atualizada para usar `featured_order`
- `project/src/pages/AdminDashboard.tsx` - Função `toggleScholarshipHighlight` atualizada

### 5. Migrações do Banco
- `supabase/migrations/20250121000000_add_is_highlighted_to_scholarships.sql`
- `supabase/migrations/20250121000001_add_featured_order_to_scholarships.sql`

## Como Usar

### Para Administradores

1. **Acessar a Página**:
   - Faça login como admin
   - Navegue para `/admin/dashboard/featured-scholarships`

2. **Adicionar Bolsa aos Destaques**:
   - Clique em "Adicionar Destaque"
   - Selecione uma bolsa da lista
   - Confirme a adição

3. **Reordenar Destaques**:
   - Use as setas ↑↓ para mover bolsas para cima/baixo
   - A ordem é salva automaticamente

4. **Remover Destaque**:
   - Clique em "Remover" na bolsa desejada
   - A bolsa volta para a lista geral

### Para Usuários Finais

- As bolsas em destaque aparecem na seção "Destaques da Semana"
- A lista "Todas as Bolsas" não inclui bolsas em destaque
- A contagem é precisa e não há duplicação

## Benefícios da Implementação

### 1. **Controle Administrativo**
- Administradores podem escolher quais bolsas destacar
- Controle total sobre a ordem de exibição
- Interface intuitiva e responsiva

### 2. **Experiência do Usuário**
- Sem duplicação de conteúdo
- Destaques organizados e visíveis
- Contagem precisa de bolsas disponíveis

### 3. **Performance**
- Índices otimizados para consultas
- Separação clara entre dados destacados e gerais
- Cache inteligente nos hooks

### 4. **Manutenibilidade**
- Código bem estruturado e documentado
- Separação de responsabilidades
- Reutilização de componentes existentes

## Próximos Passos Sugeridos

### 1. **Funcionalidades Avançadas**
- Agendamento automático de destaques
- Histórico de mudanças
- Notificações para usuários sobre novos destaques

### 2. **Analytics**
- Métricas de visualização por destaque
- A/B testing de diferentes ordens
- Relatórios de performance

### 3. **Integração**
- API para gerenciamento externo
- Webhooks para mudanças
- Sincronização com sistemas externos

## Testes

### Cenários Testados
- ✅ Adicionar bolsa aos destaques
- ✅ Remover bolsa dos destaques
- ✅ Reordenar bolsas em destaque
- ✅ Limite máximo de 6 destaques
- ✅ Filtros e busca funcionando
- ✅ Responsividade em diferentes dispositivos

### Dados de Teste
- 6 bolsas marcadas como destaque
- Ordem definida de 1 a 6
- Todas as bolsas ativas e funcionais

## Conclusão

A implementação do sistema de gerenciamento de bolsas em destaque resolve completamente o problema de duplicação identificado anteriormente. A solução é robusta, escalável e proporciona uma experiência de usuário superior tanto para administradores quanto para usuários finais.

O sistema mantém a consistência dos dados, oferece controle total aos administradores e garante que as bolsas em destaque sejam exibidas de forma organizada e sem duplicação na interface principal.
