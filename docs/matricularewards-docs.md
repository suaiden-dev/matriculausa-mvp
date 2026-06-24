# MatriculaRewards — Documentação

## O que é

O MatriculaRewards é o programa de indicação e fidelidade da MatriculaUSA. Estudantes ganham **Matricula Coins** ao indicar amigos para a plataforma e podem trocar essas moedas por **descontos na mensalidade** em universidades parceiras.

É uma forma de recompensar quem cresce junto com a plataforma — quanto mais você indica, mais você economiza.

---

## Como funciona para o estudante

**1. Ganhar coins**

Cada estudante tem um código único de indicação. Quando um amigo se cadastra usando esse código e completa o pagamento da última taxa do processo, o estudante que indicou recebe automaticamente **100 Matricula Coins**.

**2. Usar os coins**

Os coins viram desconto direto na mensalidade da universidade. A conversão é simples: **1 coin = $1 de desconto**.

O estudante escolhe um valor (ex: $50, $100, $200) e seleciona a universidade onde quer aplicar. A universidade recebe a solicitação, aplica o desconto na próxima mensalidade e depois solicita o reembolso para a MatriculaUSA.

---

## Como funciona para a universidade

As universidades precisam aderir ao programa para participar. Após a adesão, elas passam a aparecer na lista de universidades parceiras visível para todos os estudantes.

Quando um estudante resgata um desconto, a universidade recebe uma notificação por email com os detalhes. Ela então aplica o desconto para o aluno e solicita o reembolso via dashboard. O time da MatriculaUSA aprova e efetua o pagamento.

---

## Fluxo resumido

```
Estudante indica amigo
    → Amigo conclui o processo e paga a última taxa
        → Estudante recebe 100 coins automaticamente
            → Estudante solicita desconto na mensalidade
                → Universidade aplica o desconto
                    → MatriculaUSA reembolsa a universidade
```

---

## Onde cada ator acessa

| Ator | Onde acessa |
|---|---|
| **Estudante** | Dashboard → MatriculaRewards (ver coins e indicações) / Rewards Store (resgatar) |
| **Universidade** | Dashboard da escola → University Rewards |
| **Admin** | Admin Dashboard → MatriculaRewards (visão geral, payouts, métricas) |

---

## Regras importantes

- Indicações só são confirmadas após o pagamento da última taxa do amigo indicado (o processo varia por aluno)
- Coins não expiram (a menos que o resgate seja cancelado, nesse caso são estornados)
- Resgate mínimo: 10 coins ($10 de desconto)
- A universidade precisa estar cadastrada e aprovada no programa para receber resgates
- O desconto é aplicado na mensalidade — não é cashback direto para o estudante

---

## Visão do admin

O painel administrativo mostra:

- Total de usuários ativos no programa
- Quantidade de indicações realizadas e taxa de conversão
- Coins emitidos vs. coins resgatados
- Ranking dos estudantes que mais indicam
- Solicitações de payout das universidades (aprovação manual)
- Histórico completo de resgates

