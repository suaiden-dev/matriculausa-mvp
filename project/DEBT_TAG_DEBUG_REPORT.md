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
*Assinado: Antigravity AI Debugger*
