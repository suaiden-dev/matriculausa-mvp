# Bugs & Melhorias — MatriculaUSA / Agência

---

## 🐛 BUG 1 — Tela oscilando após validação de e-mail

**Onde:** MatriculaUSA / Agências — tela de onboarding  
**Descrição:** Após o e-mail ser validado e os termos e condições aceitos, a tela fica oscilando (piscando).  
**Prioridade:** Alta  

---

## 🐛 BUG 2 — Erro ao atualizar tipo de comissionamento

**Onde:** MatriculaUSA ADM — modal de comissão  
**Descrição:** Ao atualizar o comissionamento de "Na última taxa paga" para "Quando essa taxa for paga" e salvar, apresenta erro.  
**Prioridade:** Alta  

---

## 🐛 BUG 3 — Comissão por % calculada sobre valor total com dependentes

**Onde:** MatriculaUSA ADM — regra de comissão por porcentagem  
**Descrição:** A comissão por % está sendo calculada sobre o valor total do Application Fee incluindo dependentes, em vez do valor base.  
**Detalhamento (teste realizado em 05/06/2026):**
- Valor base Application Fee: $350,00 (sem dependentes)
- Teste com 5 dependentes declarados
- Comissão configurada: 10%
- Resultado incorreto: $85,00 (calculado sobre valor com dependentes)
- Resultado esperado: $35,00 (10% sobre $350,00 base)
- Repasse MatriculaUSA: $100,00

**Prioridade:** Alta  

---

## 🐛 BUG 4 — Divergência entre aba Comissões ADM x Agência B2B

**Onde:** Aba "Comissões" — comparativo MatriculaUSA ADM vs MatriculaUSA B2B  
**Descrição:** Os valores de comissão exibidos no ADM não coincidem com os exibidos na visão da Agência B2B.  
**Prioridade:** Alta  

---

## 🐛 BUG 5 — Comissão do Seller não aparece na Agência B2B


**Onde:** MatriculaUSA B2B — aba de Comissões  
**Descrição:** Quando a venda é feita por um Seller, a comissão não é contabilizada na visão da Agência. Aparece que a venda foi efetuada, mas o valor não é exibido.  
**Detalhamento (análise de 05/06/2026):**
- Total de vendas no período: 4
  - 2 vendas diretas (pela Agência)
  - 2 vendas via Seller
- MatriculaUSA B2B: não contabiliza as vendas feitas por Seller (valor zerado)
- MatriculaUSA ADM: exibe as 4 vendas corretamente

**Comparativo:**
- ADM: 4 vendas com valores corretos
- Agência B2B: aparece a venda, mas sem valor de comissão para as vendas do Seller

**Prioridade:** Alta  

---

## 💡 MELHORIA 1 — Botão "Ajuda" cobrindo valor na aba de Comissões

**Onde:** MatriculaUSA B2B — aba de acompanhamento de comissões  
**Descrição:** O botão "Ajuda" está posicionado sobre o valor, impedindo a visualização correta.  
**Prioridade:** Média  

---

## 🐛 BUG 6 — Tela de AgencyManagement crasha com "Oops! Something went wrong"

**Onde:** MatriculaUSA ADM — página Agency Management  
**Descrição:** A página quebra com erro de renderização React, exibindo a tela azul "Oops! Something went wrong".  
**Erro no console:**
```
ReferenceError: Cannot access 'H' before initialization
    at AgencyManagement-CLZya5sE.js:1:12239

ReferenceError: Cannot access 'T' before initialization
```
**Causa técnica:** Temporal Dead Zone (TDZ) — um `useMemo` que depende do state `agencyRequests` está declarado antes do `useState` correspondente no componente.  
**Arquivo:** `project/src/pages/AdminDashboard/AgencyManagement.tsx`  
**Prioridade:** Alta (página inacessível)
