# Implementação de Notificações de Verificação de Identidade (Admin)

Este documento descreve a implementação técnica das notificações de "Identity Photo Verification" integradas ao elemento "Pending Documents Review" no Dashboard administrativo.

## 1. Visão Geral
Adicionamos uma terceira fonte de dados ao componente `PendingDocumentsOverview`, permitindo que o administrador veja quando um aluno envia uma foto de identidade para aprovação, unificando isso com os documentos padrão e solicitações de documentos.

## 2. Estrutura de Dados
Os dados são extraídos da tabela `public.comprehensive_term_acceptance`.

### Colunas Utilizadas:
- `identity_photo_status`: Status da foto (`pending`, `approved`, `rejected`).
- `identity_photo_path`: Caminho do arquivo no storage (usado para verificar se há upload).
- `created_at`: Data de envio da foto.
- `user_id`: Chave estrangeira para `user_profiles`.

## 3. Desafios Técnicos e Soluções

### Erro de Ambiguidade de Relação (PGRST201)
O Supabase retornava um erro de ambiguidade ao tentar buscar `scholarship_applications` a partir de `user_profiles`, pois existem múltiplas chaves estrangeiras entre essas tabelas.
- **Solução**: Especificamos explicitamente a chave estrangeira na query:
  ```typescript
  scholarship_applications!scholarship_applications_student_id_fkey(id, status)
  ```

### Coluna de Data Incorreta
A tabela `comprehensive_term_acceptance` não possui `updated_at`.
- **Solução**: Utilizamos `created_at` para ordenação e marcação de tempo do último upload.

## 4. Lógica de Filtragem
Para que o registro apareça no painel admin, ele deve passar pelos seguintes critérios:
1. `identity_photo_status` deve ser `'pending'`.
2. `identity_photo_path` não pode ser nulo.
3. O aluno deve ter pago a taxa do processo seletivo (`has_paid_selection_process_fee = true`).
4. O email do aluno **não** deve terminar em `@uorak.com` (filtro de teste).
5. O aluno **não** deve ter status `'enrolled'` em nenhuma aplicação ativa.
6. **Nota**: Diferente dos outros documentos, permitimos que fotos de identidade apareçam mesmo se o aluno ainda não escolheu uma bolsa (sem aplicações ativas), pois a identidade é verificada logo no início do onboarding.

## 5. Unificação de Dados
Os dados de `student_documents`, `document_request_uploads` e `comprehensive_term_acceptance` são combinados em um único array no frontend (`unifiedGroups`) agrupados pelo `user_id`. Isso evita duplicar o nome do aluno no dashboard se ele tiver múltiplos itens pendentes.

## 6. Real-time (Atualização Instantânea)
Utilizamos o `channelManager` para ouvir mudanças na tabela `comprehensive_term_acceptance`.
- O componente recarrega automaticamente quando o status muda para `pending` ou quando um item deixa de ser `pending`.

## 7. Interface (UI)
- **Badge**: Adicionada uma badge na cor amarela (`bg-amber-50`) especificamente para "Identity Photo Verification".
- **Limite**: O container da lista possui um `max-height` de `440px` com `overflow-y-auto`, limitado a mostrar aproximadamente 5 itens para manter a harmonia do layout.

## 8. Detalhes de Implementação (Código)

### Interfaces Principais:
Para garantir a tipagem correta, foram criadas/atualizadas as seguintes interfaces:
- `IdentityVerification`: Estrutura de dados da tabela de fotos.
- `unifiedGroups`: Um `Map` que utiliza o `user_id` como chave para evitar duplicidade de alunos.

### Lógica de Agrupamento (`unifiedGroups`):
A unificação ocorre via `reduce`, onde:
1. Combinamos os 3 arrays (Documentos, Solicitações e Fotos).
2. Para cada item, verificamos se o `user_id` já existe no `Map`.
3. Se não existir, criamos o registro do aluno.
4. Se já existir, apenas incrementamos o `count` e adicionamos os tipos de documentos/fotos às listas internas.
5. Ordenamos o resultado final pela data de upload mais recente (`last_uploaded`).

### Helper de Link de Perfil:
O botão "Review" utiliza a função `getProfileLink`, que prioriza o `id` do perfil do aluno (`user_profiles.id`) para o redirecionamento `/admin/dashboard/students/[ID]?tab=overview`.

---
*Documentação atualizada em 24/03/2026 para garantir replicabilidade total.*
