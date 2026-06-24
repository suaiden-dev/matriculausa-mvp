# Suaiden Kanban — Webhook de Criação de Tasks

> ⚠️ ARQUIVO PRIVADO — nunca commitar, nunca subir para o repositório.

---

## Endpoint

```
POST https://zteeqjndpdknawfvhsnp.supabase.co/functions/v1/create-task
```

---

## Autenticação

```
x-api-key: 3LgZeE11Age7hCVpL9wdCM81AOGyVJit
```

ou via header Authorization:

```
Authorization: Bearer 3LgZeE11Age7hCVpL9wdCM81AOGyVJit
```

---

## Board ID

```
f0bcf986-339c-47f1-9bbe-c4bd30ab353b
```

**Colunas criadas:** Tasks → Ready → Working → Done Branch Developer → Branch Main

---

## Payload

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| `board_id` | UUID | Sim | ID do quadro Kanban |
| `title` | string | Sim | Título da task |
| `column_id` | UUID | Não | Se omitido, usa coluna padrão do quadro (`ticket_column_id`) |
| `description` | string | Não | Aceita Markdown |
| `priority` | string | Não | `"alta"` / `"media"` / `"baixa"` |
| `sector` | string | Não | Ex: `"T.I."`, `"Financeiro"` |
| `due_date` | string | Não | Formato `YYYY-MM-DD` |
| `checklist` | string[] | Não | Array de itens — cada string vira um sub-item não concluído |

---

## Exemplo de uso (Claude criando uma task)

```json
{
  "board_id": "CONFIRMAR",
  "title": "Implementar webhook de verificação de idioma",
  "description": "Após upload em DocumentRequestsCard.tsx, chamar POST https://nwh.suaiden.com/webhook/verify-english com { url } e tratar resposta booleana.",
  "priority": "alta",
  "sector": "T.I.",
  "due_date": "2026-06-20",
  "checklist": [
    "Chamar webhook verify-english após upload",
    "Tratar resposta false → abrir modal de cotação",
    "Tratar resposta true → nenhuma ação"
  ]
}
```

---

## Regras importantes

- Se `column_id` omitido e quadro não tiver `ticket_column_id` → retorna `400`
- `due_date` inválida → retorna `400`
- `board_id` inexistente → retorna `404`
- Prioridades fora dos valores suportados → cria etiqueta cinza com o texto fornecido

---

## Como Claude usa isso

Sempre que o usuário pedir para criar tasks no Kanban, Claude:
1. Monta o payload com título, descrição, prioridade, prazo e checklist
2. Faz `POST` para o endpoint com a `x-api-key` acima
3. Confirma a criação para o usuário

Precisa do `board_id` correto — solicitar ao usuário se não informado.
