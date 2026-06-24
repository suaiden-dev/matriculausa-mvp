# Emails de notificação — Traduções

Referência: análise do sistema de emails do projeto Lush New (lushamericatranslations.com), que já opera o mesmo fluxo com a Alpha Translations.

---

## O que a Lush envia (referência)

| Email | Gatilho | Destinatário |
|-------|---------|--------------|
| Pedido confirmado | Pagamento capturado (PayPal/Zelle aprovado) | Aluno |
| Zelle aprovado | Admin ou IA aprova o comprovante | Aluno |
| Zelle rejeitado | Admin ou IA rejeita o comprovante | Aluno |
| Em tradução | Status Alpha muda para "Em Tradução" | Aluno |
| Em certificação | Status Alpha muda para "Em Certificação" | Aluno |
| Documento pronto | Status Alpha muda para "Finalizado" / "Concluído" | Aluno |
| Novo pedido | Pagamento confirmado | Admin |
| Comprovante Zelle pendente | Aluno envia comprovante | Admin |

---

## Arquitetura da Lush (padrão a replicar)

```
Edge function (ex: capture-paypal-order)
  └─ chama send-email (edge function dedicada)
        └─ SMTP direto (Gmail, porta 587 STARTTLS)
              └─ template TypeScript → HTML string
                    └─ layout centralizado (logo, cores, footer)
```

- Templates são **funções TypeScript** que retornam HTML string — não arquivos `.html` separados
- Layout centralizado em `email-helpers.ts` (logo, header navy `#1e3a5f`, footer)
- Envio **fire-and-forget** com `.catch()` logado — não bloqueia a resposta da função
- Status da Alpha são verificados via cron a cada 10 min → `sync-alpha-status` → envia emails dos status notificáveis

---

## O que o MatriculaUSA deve implementar

### Emails do aluno

#### 1. Pagamento confirmado
**Gatilho:** `stripe-webhook` / `parcelow-webhook` / `approve-zelle-payment-automatic` marca `payment_status = 'paid'`

```
Assunto: Seu pedido de tradução foi confirmado — Matricula USA
Corpo:
  - Nome do aluno
  - Nome do documento
  - Valor pago + método
  - ID do pedido
  - CTA: "Ver meu pedido →" → /student/dashboard/translations
```

#### 2. Documento enviado para tradução
**Gatilho:** `send-to-alpha` executa com sucesso (retorna `alpha_project_number`)

```
Assunto: Seu documento foi enviado para tradução — Matricula USA
Corpo:
  - Nome do aluno
  - Nome do documento
  - Prazo estimado (se disponível)
  - Número do projeto Alpha (#XXXXX)
  - CTA: "Acompanhar status →" → /student/dashboard/translations
```

#### 3. Em tradução / Em certificação
**Gatilho:** `sync-alpha-status` detecta mudança de status para esses valores

```
Assunto: Seu documento está sendo traduzido — Matricula USA
Corpo:
  - Nome do documento
  - Status atual com descrição humana
  - CTA: "Ver andamento →"
```

#### 4. Documento pronto (mais importante)
**Gatilho:** `sync-alpha-status` detecta `translation_status = 'Finalizado'`

```
Assunto: Sua tradução certificada está pronta — Matricula USA
Corpo:
  - Nome do aluno
  - Nome do documento
  - CTA principal: "Baixar documento →" → /student/dashboard/translations
  - Nota: o arquivo fica disponível no painel por X dias
```

#### 5. Comprovante Zelle recebido (confirmação ao aluno)
**Gatilho:** aluno envia comprovante Zelle com sucesso

```
Assunto: Comprovante recebido — em análise
Corpo:
  - Confirmação de que o comprovante foi recebido
  - Prazo estimado de análise (ex: até 24h)
  - CTA: "Ver pedido →"
```

#### 6. Comprovante Zelle rejeitado
**Gatilho:** admin rejeita o comprovante manualmente

```
Assunto: Ação necessária: comprovante Zelle não aprovado — Matricula USA
Corpo:
  - Motivo (campo `notes` do admin)
  - Instrução clara de como reenviar
  - CTA: "Reenviar comprovante →"
```

---

### Emails do admin

#### 7. Novo pedido criado (Stripe / Parcelow)
**Gatilho:** pagamento confirmado pelo webhook

```
Assunto: Novo pedido de tradução — #ORDER_ID
Corpo:
  - Email do aluno
  - Documento + tipo + páginas
  - Valor + método de pagamento
  - Link para painel admin
```

#### 8. Comprovante Zelle pendente de revisão
**Gatilho:** aluno envia comprovante

```
Assunto: Comprovante Zelle aguardando revisão — #ORDER_ID
Corpo:
  - Email do aluno
  - Valor declarado
  - Link direto para o comprovante (URL assinada do Storage)
  - Link para painel admin → pedido específico
```

---

## Implementação sugerida

### Nova edge function: `send-translation-email`

Análoga ao `send-email` da Lush. Aceita:
```typescript
{
  type: 'payment_confirmed' | 'sent_to_alpha' | 'status_update' | 'doc_ready'
       | 'zelle_received' | 'zelle_rejected'
       | 'admin_new_order' | 'admin_zelle_pending',
  translation_order_id: string,
  extra?: { notes?: string } // para zelle_rejected
}
```

Internamente: busca os dados do pedido + perfil do aluno → seleciona o template → chama `send-email`.

### Onde chamar cada email

| Email | Onde adicionar a chamada |
|-------|--------------------------|
| `payment_confirmed` | `stripe-webhook`, `parcelow-webhook`, `approve-zelle-payment-automatic` |
| `sent_to_alpha` | `send-to-alpha` (após sucesso na Alpha API) |
| `status_update` / `doc_ready` | `sync-alpha-status` (loop de status notificáveis) |
| `zelle_received` | `approve-zelle-payment-automatic` (antes da análise) |
| `zelle_rejected` | edge function de rejeição manual do admin |
| Admin emails | mesmo local dos emails do aluno, chamada em paralelo |

### Evitar email duplicado

- Checar `alpha_synced_at` ou adicionar coluna `last_status_email_sent` na `translation_orders`
- `sync-alpha-status` já tem lógica de "mudou desde a última sync" — usar o mesmo gate

### Provider de email

A Lush usa SMTP direto (Gmail). O MatriculaUSA já tem infraestrutura de email própria (`send-email` edge function com SMTP). Reusar essa função — não criar nova dependência.

---

## Status da Alpha → label para o email

```typescript
const STATUS_LABELS: Record<string, { subject: string; body: string; isComplete: boolean }> = {
  'Em Análise':       { subject: 'Documento recebido e em análise', body: 'Sua tradução foi recebida e será iniciada em breve.', isComplete: false },
  'Em Tradução':      { subject: 'Seu documento está sendo traduzido', body: 'Nosso tradutor já começou a trabalhar no seu documento.', isComplete: false },
  'Em Certificação':  { subject: 'Documento em processo de certificação', body: 'A tradução foi concluída e está em certificação.', isComplete: false },
  'Finalizado':       { subject: 'Sua tradução certificada está pronta', body: 'O documento traduzido está disponível no seu painel.', isComplete: true },
};
```

---

## Prioridade de implementação

1. **`payment_confirmed`** — aluno precisa saber que o pagamento foi aceito (confiança)
2. **`doc_ready`** — email mais importante; aluno está esperando este
3. **`zelle_received` + `zelle_rejected`** — expectativa de tempo + ação corretiva
4. **`sent_to_alpha`** — confirma que o processo começou
5. Admin emails — operacional interno
6. Status intermediários (`Em Tradução`, `Em Certificação`) — nice to have
