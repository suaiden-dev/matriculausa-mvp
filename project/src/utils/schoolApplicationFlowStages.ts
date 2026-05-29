/**
 * schoolApplicationFlowStages.ts
 *
 * Utilitário de estágios exclusivo para o kanban da universidade (School Dashboard).
 * Encapsula as correções de posicionamento específicas do contexto escolar sem
 * alterar o comportamento do kanban do admin.
 *
 * Regras de negócio específicas da escola:
 *  - i20_fee: NUNCA é auto-completado via status 'enrolled' ou linearização se a
 *    taxa não foi paga. O status 'enrolled' prematuro não deve pular etapas de
 *    cobrança obrigatórias.
 *  - student_sends_letter: usa verificação null-safe para visa_transfer_active
 *    (!== true), tratando null/undefined como visto inativo (expirado).
 *  - reinstatement_fee: mesma correção null-safe (=== true para skip).
 *  - i20_fee isApplicable: mesma correção null-safe.
 */

import {
  APPLICATION_FLOW_STAGES,
  ApplicationFlowStageKey,
  StageStatus,
  getStepStatus,
} from './applicationFlowStages';
import { StudentRecord } from '../components/AdminDashboard/hooks/useStudentApplicationsQueries';

// ─── Helpers internos ──────────────────────────────────────────────────────────

function i20FeePaid(student: StudentRecord): boolean {
  return (
    !!student.has_paid_i20_control_fee ||
    !!(student as any).has_paid_ds160_package ||
    !!(student as any).has_paid_i539_cos_package
  );
}

/**
 * Raw status do i20_fee com correções específicas da escola:
 *  - Usa !== true (null-safe) para visa_transfer_active
 *  - Remove 'enrolled' do alreadyProgressed (taxa real é o sinal correto)
 */
function getSchoolI20FeeRaw(student: StudentRecord): StageStatus {
  const isApplicable =
    student.student_process_type === 'initial' ||
    student.student_process_type === 'change_of_status' ||
    // !== true: trata null/undefined/false como visto inativo
    (student.student_process_type === 'transfer' &&
      (student as any).visa_transfer_active !== true);

  if (!isApplicable) return 'skipped';

  // 'enrolled' omitido intencionalmente: veja comentário no topo do arquivo
  const alreadyProgressed =
    !!(student as any).sevis_transfer_completed || !!(student as any).visa_approved;

  if (alreadyProgressed) return 'completed';

  return i20FeePaid(student) ? 'completed' : 'pending';
}

/**
 * Raw status do student_sends_letter com correção null-safe para visa_transfer_active.
 * Garante que transfer com visto null/undefined seja tratado como expirado,
 * mantendo o card em Transfer Form até o I-20 fee ser pago.
 */
function getSchoolStudentSendsLetterRaw(student: StudentRecord): StageStatus {
  if (student.student_process_type !== 'transfer') return 'skipped';
  if ((student as any).sevis_transfer_completed) return 'completed';

  // !== true: null/undefined/false = visto inativo/expirado
  const isExpiredVisaTransfer =
    student.student_process_type === 'transfer' &&
    (student as any).visa_transfer_active !== true;

  const paid = i20FeePaid(student);

  const status = (student as any).transfer_form_status as string | null;
  if (status === 'approved') {
    return isExpiredVisaTransfer && !paid ? 'in_progress' : 'completed';
  }
  if (status === 'returned' || status === 'sent') return 'in_progress';
  return 'pending';
}

// ─── API pública ───────────────────────────────────────────────────────────────

/**
 * Determina o status de um estágio para o kanban da universidade.
 *
 * Para estágios com lógica específica da escola (i20_fee, student_sends_letter),
 * aplica as correções isoladas. Para todos os demais, delega ao getStepStatus
 * compartilhado.
 */
export function getSchoolStepStatus(
  student: StudentRecord,
  step: ApplicationFlowStageKey
): StageStatus {
  // ── i20_fee: lógica totalmente substituída ────────────────────────────────
  if (step === 'i20_fee') {
    const raw = getSchoolI20FeeRaw(student);
    if (raw === 'skipped') return 'skipped';

    // Gate obrigatório: taxa não paga → nunca auto-completar (ignora linearização
    // e status enrolled prematuro)
    if (!i20FeePaid(student)) return raw; // 'pending'

    // Taxa paga: usa linearização normal via getStepStatus (delegação)
    return getStepStatus(student as any, step);
  }

  // ── student_sends_letter: usa verificação null-safe ───────────────────────
  if (step === 'student_sends_letter') {
    const raw = getSchoolStudentSendsLetterRaw(student);
    if (raw === 'skipped') return 'skipped';

    // Se 'in_progress' ou 'pending', retorna direto sem linearização adicional
    if (raw !== 'completed') {
      // Verifica se linearização promoveria indevidamente
      // Apenas retorna 'completed' se o status bruto já for 'completed'
      return raw;
    }

    // completed: delega ao getStepStatus para manter linearização consistente
    return getStepStatus(student as any, step);
  }

  // ── reinstatement_fee: null-safe (escola pode ter visa_transfer_active = null)
  if (step === 'reinstatement_fee') {
    // === true para skip: null/undefined/false = aplicável (visto inativo)
    if (
      student.student_process_type !== 'transfer' ||
      (student as any).visa_transfer_active === true
    ) {
      return 'skipped';
    }
    // Não pago → pending, pago → completed (sem linearização especial)
    return (student as any).has_paid_reinstatement_package ? 'completed' : 'pending';
  }

  // ── Todos os demais estágios: delegação ao getStepStatus compartilhado ────
  return getStepStatus(student as any, step);
}

/**
 * Organiza estudantes por estágio para o kanban da universidade.
 * Usa getSchoolStepStatus para posicionamento correto.
 */
export function buildSchoolStageMap(
  students: StudentRecord[],
  visibleStageKeys: ApplicationFlowStageKey[]
): Map<ApplicationFlowStageKey, StudentRecord[]> {
  const stageMap = new Map<ApplicationFlowStageKey, StudentRecord[]>();
  visibleStageKeys.forEach(key => stageMap.set(key, []));

  for (const student of students) {
    let placed = false;

    for (const key of visibleStageKeys) {
      const stageDef = APPLICATION_FLOW_STAGES.find(s => s.key === key);
      if (!stageDef) continue;

      // Pula estágios que requerem tipo específico
      if (
        stageDef.requiresTransfer &&
        student.student_process_type !== 'transfer'
      ) {
        continue;
      }
      if (
        (stageDef as any).requiresProcessType &&
        student.student_process_type !== (stageDef as any).requiresProcessType
      ) {
        continue;
      }

      const status = getSchoolStepStatus(student, key);

      if (status === 'skipped') continue;

      if (status !== 'completed') {
        stageMap.get(key)!.push(student);
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Fallback: coloca na última coluna visível
      const lastKey = visibleStageKeys[visibleStageKeys.length - 1];
      stageMap.get(lastKey)?.push(student);
    }
  }

  return stageMap;
}
