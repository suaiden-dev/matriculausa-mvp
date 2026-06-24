# Integração Matricula USA × Migma — Mapeamento Automático de Documentos

**Data:** 23/06/2026  
**Versão da edge function:** `receive-migma-package` v8

---

## Contexto

Quando a Migma envia um pacote de documentos de um aluno via webhook (`receive-migma-package`), o sistema da Matricula USA recebia e armazenava o pacote na tabela `migma_packages` (incluindo ZIP e lista de arquivos), mas **os documentos não apareciam automaticamente nos slots de revisão do painel admin**.

O admin precisava abrir o ZIP manualmente, identificar cada documento e fazer o upload individual em cada slot — processo manual, lento e sujeito a erro.

---

## O que foi implementado

### 1. Mapeamento automático de arquivos → slots de revisão

Ao receber um pacote, a edge function agora executa automaticamente a função `mapFilesToDocumentRequests()`, que:

1. Busca o `scholarship_application` do aluno → obtém o `university_id` via join em `scholarships`
2. Carrega todos os `document_requests` globais (`is_global = true`, `status = 'open'`) daquela universidade
3. Para cada arquivo do pacote, encontra o slot correspondente e insere em `document_request_uploads`

Os documentos aparecem imediatamente no painel admin com status `under_review`, prontos para revisão.

---

### 2. Regras de mapeamento

#### Formulários assinados (`type: "formulario"`)

**Todos os arquivos com `type: "formulario"` são mapeados automaticamente para o slot "Application Form"**, independente do nome do arquivo.

Eles são inseridos em ordem numérica (01_, 02_, 03_...) conforme o prefixo do nome original.

Exemplo:
| Arquivo Migma | Slot no Matricula USA |
|---|---|
| `01_Application_for_Admission.pdf` | Application Form |
| `02_I20_Request_Form.pdf` | Application Form |
| `03_Letter_of_Recommendation.pdf` | Application Form |
| `04_Affidavit_of_Financial_Support.pdf` | Application Form |
| `05_Tuition_Refund_Policy.pdf` | Application Form |
| `06_Statement_of_Institutional_Purpose.pdf` | Application Form |
| `07_Scholarship_Support_Compliance_Agreement.pdf` | Application Form |

#### Documentos do aluno (`type: "documento"`)

Mapeamento por keyword matching no nome do arquivo:

| Nome do arquivo (padrões) | Slot no Matricula USA |
|---|---|
| `passport`, `selfie`, `f1_visa` | Passport and Visa |
| `i94` | I-94 |
| `current_i20` | I-20 |
| `history_diploma`, `diploma` | Bachelor's Diploma |
| `bank_statement` | Bank Statement / Proof of Funds |
| `address_us` | Proof of address in the US |
| `address_br` | Proof of address in Home Country |
| `translated_transcript`, `academic_transcript` | Translated Academic Transcript |

#### Mapeamento de `process_type` → tipo de aluno

| `process_type` no payload Migma | Tipo de aluno no Matricula USA |
|---|---|
| `transfer` | `transfer` |
| `cos` | `change_of_status` |
| `initial` / `initial_f1` | `initial` |
| `eb2` / `eb3` | `initial` |

Apenas os slots aplicáveis ao tipo de processo do aluno são considerados no matching.

---

### 3. Campo `filename` em `document_request_uploads`

Foi adicionada a coluna `filename text` na tabela `document_request_uploads`.

**Motivação:** As URLs dos formulários assinados usam UUIDs como nome do arquivo (ex: `97d197a8-..._signed.pdf`), não o nome original. Sem guardar o nome original, o painel admin exibiria o UUID em vez de `02_I20_Request_Form.pdf`.

A edge function agora salva `filename: file.name` ao inserir cada upload. O painel exibe esse nome diretamente quando disponível.

---

### 4. Campos inseridos em `document_request_uploads`

```json
{
  "document_request_id": "<uuid do slot correspondente>",
  "uploaded_by": "<user_id local do aluno>",
  "file_url": "<url do arquivo no storage Migma>",
  "filename": "<nome original do arquivo, ex: 02_I20_Request_Form.pdf>",
  "source": "migma",
  "status": "under_review",
  "is_admin_upload": false
}
```

---

## Fluxo completo após a integração

```
Migma envia webhook POST /receive-migma-package
        │
        ▼
Salva em migma_packages (ZIP, lista de arquivos, etc.)
        │
        ▼
mapFilesToDocumentRequests()
  ├─ Busca university_id do aluno
  ├─ Carrega document_requests globais da universidade
  ├─ Para cada arquivo:
  │    ├─ type = "formulario" → slot "Application Form"
  │    └─ type = "documento"  → keyword matching
  └─ Insere em document_request_uploads (status: under_review)
        │
        ▼
Admin abre painel do aluno
  └─ Cada slot de Global Document Requests já mostra o arquivo
     com botões Approve / Reject
```

---

## O que NÃO é mapeado automaticamente

Arquivos sem correspondência de keyword não são inseridos em nenhum slot e ficam apenas no pacote original (`migma_packages.files`). O admin pode visualizá-los via download do ZIP.

Slots que não existem na universidade do aluno também são ignorados silenciosamente.

---

## Requisitos do payload Migma

Para que o mapeamento funcione corretamente, o payload deve incluir:

```json
{
  "student_email": "email cadastrado no Matricula USA",
  "process_type": "transfer | cos | initial | initial_f1 | eb2 | eb3",
  "files": [
    {
      "name": "01_Application_for_Admission.pdf",
      "url": "https://...",
      "type": "formulario | documento",
      "category": "formularios | documentos"
    }
  ]
}
```

- `student_email` deve corresponder exatamente ao email cadastrado em `user_profiles.email` no Matricula USA
- `process_type` é usado para filtrar os slots aplicáveis — se ausente, todos os slots da universidade são considerados
- `type` de cada arquivo é o campo mais importante: `"formulario"` vai sempre para Application Form; `"documento"` usa keyword matching no `name`
