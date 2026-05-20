# Roteiro de Testes — QA
### Funcionalidade: Envio de Documentos e Aprovação de Aplicações

> **Ambiente:** Staging (Netlify preview)  
> **Data:** 20/05/2026  
> **Versão testada:** branch `fix-fee`

---

## Antes de começar

Você vai precisar de **dois acessos** para os testes:

| Perfil | E-mail | O que é |
|--------|--------|---------|
| **Aluno de teste** | `stiliyan8277@uorak.com` | Conta de aluno para simular o fluxo do estudante |
| **Admin** | _(pedir para o dev)_ | Conta de administrador da plataforma |

> Dica: use dois navegadores diferentes (ex: Chrome e Edge) para manter os dois acessos abertos ao mesmo tempo.

---

## O que mudou nessa versão

Antes, o aluno precisava enviar **3 documentos** no cadastro:
- Passaporte
- Diploma
- Comprovante Financeiro (Bank Statement)

Agora, o aluno envia **apenas o Passaporte** no cadastro. O Diploma e o Comprovante Financeiro passam a ser solicitados separadamente depois, pelo sistema de "Solicitações de Documentos".

---

## TESTE 1 — Tela de envio de documentos (visão do aluno)

**Login:** `stiliyan8277@uorak.com`

### Passos:
1. Acesse o sistema pelo link de staging
2. Faça login com o e-mail do aluno
3. Siga o processo de cadastro até chegar na etapa **"Documents"** (etapa 3)

### O que você deve ver: ✅
- Aparece **apenas um campo** de upload: **Passport**
- **Não aparecem** campos para Diploma ou Bank Statement
- O botão de enviar está **cinza/desabilitado** enquanto não selecionar o arquivo

### O que NÃO deve aparecer: ❌
- Campo de "High School Diploma" para upload
- Campo de "Bank Statement" ou "Proof of Funds" para upload
- Mensagem dizendo que faltam 2 ou 3 documentos

---

## TESTE 2 — Enviando o Passaporte

**Continuando da tela de documentos...**

### Passos:
1. Clique no botão de upload e selecione **qualquer imagem ou PDF** (pode ser um arquivo qualquer para teste)
2. Clique em **"Upload Documents"**

### O que você deve ver durante o envio: ✅
- Aparece uma tela de carregamento com um **spinner** enquanto sobe o arquivo
- Depois aparece uma tela com uma **animação de lupa** e uma mensagem dizendo que está analisando o documento
- Essa tela some automaticamente após alguns segundos

### O que você deve ver depois: ✅
- A tela muda para mostrar **suas bolsas** (aplicações em andamento)
- Aparece uma mensagem de "under review" ou "em análise"

### O que NÃO deve acontecer: ❌
- Tela travar ou ficar em loading infinito
- Mensagem de erro vermelha na tela
- Pedir para enviar mais documentos além do passaporte

---

## TESTE 3 — Reenviar o Passaporte

**Ainda logado como aluno, na tela de revisão das bolsas...**

### Passos:
1. Procure o link **"Re-upload Passport"** abaixo do título da tela
2. Clique nele

### O que você deve ver: ✅
- O formulário de upload aparece novamente, com o campo de Passport
- Você consegue selecionar um novo arquivo e reenviar

### O que NÃO deve acontecer: ❌
- Link não aparece
- Clicar no link não faz nada
- Aparece tela em branco ou erro

---

## TESTE 4 — Solicitações de Documentos (Diploma e Bank Statement)

**Ainda logado como aluno, no dashboard...**

### Passos:
1. Vá para o **Dashboard do aluno** (página principal após login)
2. Procure a seção de **"Document Requests"** ou **"Solicitações de Documentos"**

### O que você deve ver: ✅
- Aparece um card com a solicitação de **"High School Diploma"**
- Aparece um card com a solicitação de **"Bank Statement / Proof of Funds"**
- Você consegue clicar e fazer upload nesses cards

### O que NÃO deve aparecer: ❌
- Essa seção completamente vazia (sem as duas solicitações)
- Erro ao tentar abrir os cards

---

## TESTE 5 — Aprovação de documentos (visão do Admin)

**Login: conta de Admin**

### Passos:
1. Faça login como Admin
2. Encontre o aluno `stiliyan8277@uorak.com`
3. Abra o **detalhe do aluno**
4. Procure a seção de **"Documents"** ou **"Documentos"**

### O que você deve ver: ✅
- Aparece o documento **Passport** enviado pelo aluno
- O status está como **"under review"** (em análise)
- Existem botões de **"Approve"** e **"Reject"** ao lado do Passport

### Passos (continuação):
5. Clique em **"Approve"** no Passport

### O que você deve ver: ✅
- O status do Passport muda para **"Approved"**

---

## TESTE 6 — Aprovar a Aplicação (Admin)

**Continuando no detalhe do aluno, após aprovar o Passport...**

### Passos:
1. Desça a página até a seção **"Application Approval"**

### O que você deve ver: ✅
- A mensagem diz: **"All documents are approved. You can now approve this application."**
- O botão **"Approve Application"** está **clicável** (não está cinza)

### Passos (continuação):
2. Clique em **"Approve Application"**

### O que você deve ver: ✅
- A aplicação muda para o status **"Approved"**
- Aparece confirmação visual (ícone verde ou mensagem de sucesso)

### O que NÃO deve acontecer: ❌
- Mensagem dizendo **"Missing required documents: funds_proof, diploma"**
- Botão de aprovação **travado/cinza** mesmo com o Passport aprovado
- Qualquer erro vermelho na tela

---

## TESTE 7 — Kanban de Aplicações (Admin)

**Ainda no painel Admin...**

### Passos:
1. Acesse a visão de **Kanban** das aplicações
2. Procure a coluna que antes se chamava "BDP Collection"

### O que você deve ver: ✅
- A coluna agora se chama **"Passport Collection"**
- O aluno de teste aparece nessa coluna (se ainda não foi aprovado)
- Ao passar o mouse na coluna, aparece a descrição: **"Pending: Passport upload"**

### O que NÃO deve aparecer: ❌
- Coluna com nome "BDP Collection"
- Descrição mencionando "Bank Statement, Diploma & Passport"

---

## Como registrar os resultados

Para cada teste, anote:

- **✅ Passou** — tudo funcionou como descrito
- **❌ Falhou** — algo diferente aconteceu (descrever o que viu)
- **⚠️ Diferente** — funcionou mas algo ficou estranho (descrever)

**Modelo de registro:**

```
TESTE 1 — ✅ Passou
TESTE 2 — ❌ Falhou
  O que aconteceu: apareceu erro vermelho "Unable to upload" após selecionar o arquivo
  Navegador: Chrome 124
  Screenshot: [anexar]
TESTE 3 — ⚠️ Diferente
  O que aconteceu: o link "Re-upload Passport" apareceu mas estava em inglês, esperava em português
```

---

## Informações para incluir no relatório

- Navegador usado (Chrome, Edge, Firefox, Safari)
- Se testou no celular ou computador
- Screenshots ou vídeo curto dos erros encontrados
- Horário aproximado dos testes (para cruzar com os logs do sistema)
