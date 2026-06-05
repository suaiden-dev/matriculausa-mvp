# Relatório Técnico: Falha de Sincronização e Debug da Tag de Débito

## 1. O Problema Identificado
O sistema de "Debt Tag" (Tag de Dívida) no Kanban Administrativo não está aparecendo para alunos que claramente possuem débitos (ex: Maria Clara Marcial Santos).

## 2. Bloqueio no Ambiente de Desenvolvimento
Apesar de múltiplas tentativas de atualização do arquivo `StudentCard.tsx` com logs de depuração e alertas (`window.alert`), o ambiente local do usuário parece estar preso em uma versão antiga do código.

### Evidências:
- **Logs de HMR**: O console mostra que a última atualização bem-sucedida do Vite para este arquivo foi às `19:59:34`. Edições feitas às `20:11` e `20:14` não foram refletidas.
- **Inexistência de Logs**: O comando `console.log` adicionado no topo do componente não aparece no console do navegador, confirmando que o arquivo carregado é uma versão anterior.
- **Falha do `npm run dev`**: Houve um registro de falha do comando de desenvolvimento com código de saída 1, o que pode indicar um erro de sintaxe persistente ou travamento do observador de arquivos (`chokidar`) no Windows.

## 3. Diagnóstico da Lógica de Débito (Maria Clara)
Baseado na inspeção do banco de dados (via MCP):
- **Maria Clara Marcial Santos**:
    - `student_process_type`: `enrolled` (Legado/Manualmente inserido).
    - `placement_fee_flow`: `true`.
    - `is_placement_fee_paid`: `false`.
    - `placement_fee_pending_balance`: `0.00`.
    - **Causa da Tag Ausente**: No código original, o sistema confiava no `placement_fee_pending_balance`. Como ele está `0.00`, mesmo a flag de pagamento sendo `false`, o sistema ignorava o débito. A nova lógica (ainda não aplicada com sucesso) ignora o balanço zerado e aplica um valor padrão de $550 caso a flag de pago seja falsa e o aluno já tenha passado do estágio de Placement.

## 4. Plano de Ação para o Usuário
Para destravar o ambiente e permitir a correção, siga estes passos:

1. **Parar Processos**: Encerre o terminal do `npm run dev`.
2. **Forçar Gravação**: Eu irei reenviar o código completo do `StudentCard.tsx` agora.
3. **Reiniciar**: Execute `npm run dev` novamente.
4. **Validar**: Abra o Kanban e verifique se aparece no console a mensagem: `[StudentCard] Mounting card for: Maria Clara...`.

---

## 5. Código da Tag de Débito Proativa Recuperada (feat/kanban-universidades)

Abaixo está o código completo do cálculo do `totalDebt` e a renderização correspondente da tag vermelha conforme constava na branch `feat/kanban-universidades`:

### Cálculo de `totalDebt` (`StudentCard.tsx`):
```tsx
  // Lógica de Débito Proativa
  const totalDebt = React.useMemo(() => {
    // Alunos MIGMA gerenciam taxas no próprio sistema — sem exibição de débito
    if ((student as any).source === 'migma') return 0;

    try {
      let total = 0;

      // 1. Balanço pendente direto do banco (Placement Fee parcial ou outras)
      const pendingBalance = Number(student.placement_fee_pending_balance || 0);
      total += pendingBalance;

      // Se não sabemos o estágio atual, retornamos apenas o balanço pendente
      if (!propCurrentStageKey) return total;

      const stages = APPLICATION_FLOW_STAGES.map(s => s.key);
      const currentIndex = stages.indexOf(propCurrentStageKey);
      
      // 2. Verificação Proativa de Taxas (Baseado em estágios passados)
      
      // A. Selection Fee ($400)
      const selectionPaid = student.has_paid_selection_process_fee || (student as any).source === 'migma';
      const selectionIndex = stages.indexOf('selection_fee');
      if (!selectionPaid && currentIndex > selectionIndex && selectionIndex !== -1) {
        total += 400;
      }

      // B. Application Fee ($350) - Cobrada após aprovação da bolsa
      const appFeeIndex = stages.indexOf('application_fee');
      if (!student.is_application_fee_paid && currentIndex > appFeeIndex && appFeeIndex !== -1) {
        total += 350;
      }

      // C. Placement Fee / Scholarship Fee
      if (student.placement_fee_flow) {
        const placementIndex = stages.indexOf('placement_fee');
        if (!student.is_placement_fee_paid && currentIndex > placementIndex && placementIndex !== -1) {
          if (pendingBalance === 0) {
            // Prioridade: override > placement_fee_amount da scholarship > $550 padrão
            const overrideAmt = student.fee_override_placement_fee != null ? Number(student.fee_override_placement_fee) : null;
            const scholarshipAmt = student.placement_fee_amount ? Number(student.placement_fee_amount) : null;
            total += overrideAmt ?? scholarshipAmt ?? 550;
          }
        }
      } else {
        // Fluxo Antigo (Scholarship Fee $1600)
        const scholarshipIndex = stages.indexOf('scholarship_fee');
        if (!student.is_scholarship_fee_paid && currentIndex > scholarshipIndex && scholarshipIndex !== -1) {
          total += 1600;
        }
      }

      // D. Control Fee / I-20 Fee
      const isTransferInactiveVisa = student.student_process_type === 'transfer' && student.visa_transfer_active === false;
      const i20Index = stages.indexOf('i20_fee');

      if (isTransferInactiveVisa) {
        // Transfer com visa inativo: Reinstatement Fee ($500) + Control Fee ($1800)
        if (!student.has_paid_reinstatement_package && currentIndex > i20Index && i20Index !== -1) {
          total += 500;
        }
        if (!student.has_paid_i539_cos_package && currentIndex > i20Index && i20Index !== -1) {
          total += 1800;
        }
      } else {
        // Outros (initial, change_of_status): I-20 / DS-160 fee
        const isI20Applicable =
          student.student_process_type === 'initial' ||
          student.student_process_type === 'change_of_status';
        const i20Paid = student.has_paid_i20_control_fee || student.has_paid_ds160_package || student.has_paid_i539_cos_package;
        const i20Amount = student.fee_override_i20_fee != null ? Number(student.fee_override_i20_fee) : 250;
        if (!i20Paid && isI20Applicable && currentIndex > i20Index && i20Index !== -1) {
          total += i20Amount;
        }
      }

      return total;
    } catch (err) {
      console.error('[StudentCard] Erro no cálculo de débito:', err);
      return 0;
    }
  }, [
    student.placement_fee_pending_balance,
    student.has_paid_selection_process_fee,
    student.is_application_fee_paid,
    student.is_placement_fee_paid,
    student.is_scholarship_fee_paid,
    student.has_paid_reinstatement_package,
    student.has_paid_i539_cos_package,
    student.has_paid_i20_control_fee,
    student.has_paid_ds160_package,
    student.fee_override_placement_fee,
    student.fee_override_i20_fee,
    student.placement_fee_amount,
    student.placement_fee_flow,
    student.student_process_type,
    student.visa_transfer_active,
    student.source,
    propCurrentStageKey
  ]);
```

### Renderização no Card (rodapé, dentro do flex de badges):
```tsx
  {totalDebt > 0 && (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
      <AlertCircle className="w-3 h-3" />
      Debt: ${totalDebt.toFixed(0)}
    </span>
  )}
```

---
*Assinado: Antigravity AI Debugger*

