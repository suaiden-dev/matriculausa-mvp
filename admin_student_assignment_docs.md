# Documentação: Atribuição de Alunos por Administradores

Este documento descreve como a funcionalidade de atribuição de alunos a administradores foi implementada no banco de dados Supabase para o sistema **Matrícula USA**.

## 1. Estrutura do Banco de Dados

A atribuição é gerenciada na tabela principal de perfis de usuários.

-   **Tabela**: `public.user_profiles`
-   **Campo**: `assigned_to_admin_id` (tipo `uuid`)
-   **Relacionamento**: Este campo é uma chave estrangeira que aponta para o `id` da própria tabela `user_profiles`, representando o administrador responsável pelo aluno.

### Regras de Negócio e Segurança (RLS)

A atribuição agora é baseada em uma flag dinâmica no perfil do administrador.

#### Campo de Controle:
-   **Tabela**: `public.user_profiles`
-   **Campo**: `is_restricted_admin` (tipo `boolean`)
-   **Lógica**: Se este campo for `true`, o administrador terá as restrições abaixo aplicadas.

### Política: `Admins update policy with specific restrictions`

Esta política controla quem pode atualizar o campo `assigned_to_admin_id`. Ela foi redesenhada para ser dinâmica e escalável.

#### Lógica da Política:
Sempre que um administrador tenta atualizar um perfil de aluno, o banco de dados verifica:

1.  **O administrador é restrito?** Verifica-se se o `is_restricted_admin` é `true` para o administrador logado.
2.  **Qual a mudança solicitada?** A atualização é permitida apenas se:
    -   O administrador estiver atribuindo o aluno a **si mesmo** (`assigned_to_admin_id = seu_proprio_id`).
    -   O administrador estiver **removendo a atribuição** (`assigned_to_admin_id = NULL`).
    -   O administrador estiver atualizando outros campos do aluno (como arquivamento), mas **mantendo a atribuição original** (o valor de `assigned_to_admin_id` não muda).

#### Administradores Atualmente Restritos:
A restrição está ativa para os seguintes perfis:
-   **Romeu Chimenti Neto**
-   **Rayssa Tenório**
-   **Luiz Eduardo Miola**

### Exceção:
Qualquer administrador com `is_restricted_admin = false` (como o **Paulo Victor** ou administradores Masters) possui permissão total para atribuir qualquer aluno a qualquer outro administrador.


## 3. Fluxo de Trabalho no Sistema

1.  **Atribuição Manual**: No Kanban ou na lista de alunos, o administrador pode clicar no seletor de responsáveis.
2.  **Validação em Tempo Real**: Se um administrador restrito tentar selecionar outro colega para ser o responsável, o Supabase rejeitará a operação com um erro de violação de política de RLS.
3.  **Visualização**: Cada administrador pode filtrar o Kanban para ver apenas os alunos que estão atribuídos a ele, facilitando a gestão do fluxo de trabalho individual.

---
*Documento gerado automaticamente para fins de documentação técnica do sistema.*
