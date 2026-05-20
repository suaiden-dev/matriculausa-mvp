import { describe, it, expect } from 'vitest';
import { groupUploadsBySubmission, getFileName } from '../documentUploadUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUpload(
  id: string,
  uploaded_at: string,
  status: 'under_review' | 'approved' | 'rejected',
  reviewed_at?: string | null,
): ReturnType<typeof groupUploadsBySubmission>['currentGroup'][number] {
  return { id, uploaded_at, status, reviewed_at: reviewed_at ?? null, file_url: `storage/${id}.pdf` };
}

// ---------------------------------------------------------------------------
// groupUploadsBySubmission
// ---------------------------------------------------------------------------

describe('groupUploadsBySubmission', () => {
  // ── edge cases ──────────────────────────────────────────────────────────

  it('retorna grupos vazios para lista vazia', () => {
    const result = groupUploadsBySubmission([]);
    expect(result.closedGroups).toHaveLength(0);
    expect(result.currentGroup).toHaveLength(0);
  });

  it('arquivo sem reviewed_at vai para currentGroup', () => {
    const uploads = [makeUpload('1', '2025-01-01T10:00:00Z', 'under_review')];
    const { closedGroups, currentGroup } = groupUploadsBySubmission(uploads);
    expect(currentGroup).toHaveLength(1);
    expect(closedGroups).toHaveLength(0);
  });

  // ── submissão simples: 1 arquivo aprovado ───────────────────────────────

  it('1 arquivo aprovado forma 1 closedGroup', () => {
    const uploads = [
      makeUpload('1', '2025-01-01T10:00:00Z', 'approved', '2025-01-01T15:00:00Z'),
    ];
    const { closedGroups, currentGroup } = groupUploadsBySubmission(uploads);
    expect(closedGroups).toHaveLength(1);
    expect(closedGroups[0]).toHaveLength(1);
    expect(currentGroup).toHaveLength(0);
  });

  // ── caso real: 10 arquivos rejeitados na mesma rodada ───────────────────

  it('10 arquivos rejeitados com o mesmo reviewed_at agrupam em 1 closedGroup', () => {
    const reviewTime = '2025-01-01T15:39:00Z';
    const uploads = Array.from({ length: 10 }, (_, i) =>
      makeUpload(
        String(i),
        `2025-01-01T04:${String(i).padStart(2, '0')}:00Z`,
        'rejected',
        reviewTime,
      ),
    );
    const { closedGroups, currentGroup } = groupUploadsBySubmission(uploads);
    expect(closedGroups).toHaveLength(1);
    expect(closedGroups[0]).toHaveLength(10);
    expect(currentGroup).toHaveLength(0);
  });

  // ── resubmissão: 1ª rodada rejeitada, 2ª em análise ────────────────────

  it('arquivos enviados APÓS a rejeição vão para currentGroup (resubmissão)', () => {
    const uploads = [
      // 1ª rodada — rejeitada às 15h
      makeUpload('a1', '2025-01-01T10:00:00Z', 'rejected', '2025-01-01T15:00:00Z'),
      makeUpload('a2', '2025-01-01T10:05:00Z', 'rejected', '2025-01-01T15:00:00Z'),
      // 2ª rodada — enviada às 16h, sem revisão ainda
      makeUpload('b1', '2025-01-01T16:00:00Z', 'under_review'),
      makeUpload('b2', '2025-01-01T16:05:00Z', 'under_review'),
    ];
    const { closedGroups, currentGroup } = groupUploadsBySubmission(uploads);
    expect(closedGroups).toHaveLength(1);
    expect(closedGroups[0]).toHaveLength(2);
    expect(currentGroup).toHaveLength(2);
    expect(currentGroup.map(u => u.id)).toEqual(['b1', 'b2']);
  });

  // ── histórico com duas rodadas fechadas + rodada atual ──────────────────

  it('2 rodadas rejeitadas + rodada atual pendente formam 2 closedGroups e currentGroup corretos', () => {
    const uploads = [
      // rodada 1 — rejeitada às 12h do dia 1
      makeUpload('r1a', '2025-01-01T08:00:00Z', 'rejected', '2025-01-01T12:00:00Z'),
      makeUpload('r1b', '2025-01-01T08:10:00Z', 'rejected', '2025-01-01T12:00:00Z'),
      // rodada 2 — rejeitada às 12h do dia 2
      makeUpload('r2a', '2025-01-01T14:00:00Z', 'rejected', '2025-01-02T12:00:00Z'),
      // rodada 3 — ainda em análise
      makeUpload('r3a', '2025-01-02T16:00:00Z', 'under_review'),
      makeUpload('r3b', '2025-01-02T16:10:00Z', 'under_review'),
    ];
    const { closedGroups, currentGroup } = groupUploadsBySubmission(uploads);
    expect(closedGroups).toHaveLength(2);
    expect(closedGroups[0].map(u => u.id)).toEqual(['r1a', 'r1b']);
    expect(closedGroups[1].map(u => u.id)).toEqual(['r2a']);
    expect(currentGroup.map(u => u.id)).toEqual(['r3a', 'r3b']);
  });

  // ── aprovação: currentGroup vazio após aprovação ─────────────────────────

  it('rodada aprovada não gera currentGroup', () => {
    const uploads = [
      makeUpload('x1', '2025-01-01T09:00:00Z', 'approved', '2025-01-01T11:00:00Z'),
      makeUpload('x2', '2025-01-01T09:05:00Z', 'approved', '2025-01-01T11:00:00Z'),
    ];
    const { closedGroups, currentGroup } = groupUploadsBySubmission(uploads);
    expect(closedGroups).toHaveLength(1);
    expect(closedGroups[0]).toHaveLength(2);
    expect(currentGroup).toHaveLength(0);
  });

  // ── rodada mista (parte aprovada, parte rejeitada) ───────────────────────

  it('rodada com arquivos aprovados E rejeitados fecha como closedGroup', () => {
    const reviewTime = '2025-01-01T15:00:00Z';
    const uploads = [
      makeUpload('m1', '2025-01-01T10:00:00Z', 'approved', reviewTime),
      makeUpload('m2', '2025-01-01T10:05:00Z', 'rejected', reviewTime),
    ];
    const { closedGroups, currentGroup } = groupUploadsBySubmission(uploads);
    expect(closedGroups).toHaveLength(1);
    expect(closedGroups[0]).toHaveLength(2);
    expect(currentGroup).toHaveLength(0);
  });

  // ── arquivos fora de ordem devem ser ordenados corretamente ─────────────

  it('ordena uploads por uploaded_at independente da ordem de entrada', () => {
    const reviewTime = '2025-01-01T15:00:00Z';
    const uploads = [
      makeUpload('late', '2025-01-01T10:30:00Z', 'rejected', reviewTime),
      makeUpload('early', '2025-01-01T09:00:00Z', 'rejected', reviewTime),
    ];
    const { closedGroups } = groupUploadsBySubmission(uploads);
    expect(closedGroups[0][0].id).toBe('early');
    expect(closedGroups[0][1].id).toBe('late');
  });
});

// ---------------------------------------------------------------------------
// getFileName
// ---------------------------------------------------------------------------

describe('getFileName', () => {
  it('extrai nome do arquivo de um path com timestamp underscore', () => {
    expect(getFileName('user123/1779164388763_passport.pdf')).toBe('passport.pdf');
  });

  it('extrai nome do arquivo de um path com timestamp hífen', () => {
    expect(getFileName('user123/1779164388763-passport.pdf')).toBe('passport.pdf');
  });

  it('retorna o último segmento se não houver timestamp', () => {
    expect(getFileName('user123/passport.pdf')).toBe('passport.pdf');
  });

  it('decodifica caracteres URL-encoded no nome do arquivo', () => {
    expect(getFileName('user123/1779164388763_Carta%20de%20Recomenda%C3%A7%C3%A3o.pdf')).toBe(
      'Carta de Recomendação.pdf',
    );
  });

  it('retorna o valor original se o input não contiver barra', () => {
    expect(getFileName('passport.pdf')).toBe('passport.pdf');
  });

  it('não remove timestamp curto (menos de 10 dígitos)', () => {
    expect(getFileName('user123/123456789_passport.pdf')).toBe('123456789_passport.pdf');
  });

  it('lida com URL completa do Supabase storage', () => {
    const url =
      'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/user123/1779164388763_application_form.pdf';
    expect(getFileName(url)).toBe('application_form.pdf');
  });
});
