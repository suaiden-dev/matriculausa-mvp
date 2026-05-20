import { describe, it, expect } from 'vitest';
import {
  REQUIRED_DOCUMENT_TYPES,
  getMissingRequiredDocs,
  canApproveApplication,
  buildDocumentEntries,
  buildAnalysisWebhookPayload,
} from '../documentRequirements';

// ---------------------------------------------------------------------------
// REQUIRED_DOCUMENT_TYPES
// ---------------------------------------------------------------------------

describe('REQUIRED_DOCUMENT_TYPES', () => {
  it('contém apenas passport — diploma e funds_proof foram removidos', () => {
    expect(REQUIRED_DOCUMENT_TYPES).toEqual(['passport']);
  });

  it('NÃO contém diploma', () => {
    expect(REQUIRED_DOCUMENT_TYPES).not.toContain('diploma');
  });

  it('NÃO contém funds_proof', () => {
    expect(REQUIRED_DOCUMENT_TYPES).not.toContain('funds_proof');
  });
});

// ---------------------------------------------------------------------------
// getMissingRequiredDocs
// ---------------------------------------------------------------------------

describe('getMissingRequiredDocs', () => {
  it('retorna [] quando passport está presente', () => {
    const docs = [{ type: 'passport', status: 'under_review' }];
    expect(getMissingRequiredDocs(docs)).toEqual([]);
  });

  it('retorna ["passport"] quando não há documentos', () => {
    expect(getMissingRequiredDocs([])).toEqual(['passport']);
  });

  it('retorna [] quando passport + diploma estão presentes (aluno histórico)', () => {
    // Alunos antigos têm diploma no JSONB — não deve quebrar
    const docs = [
      { type: 'passport', status: 'approved' },
      { type: 'diploma', status: 'approved' },
      { type: 'funds_proof', status: 'approved' },
    ];
    expect(getMissingRequiredDocs(docs)).toEqual([]);
  });

  it('é case-insensitive no tipo do documento', () => {
    const docs = [{ type: 'PASSPORT', status: 'under_review' }];
    expect(getMissingRequiredDocs(docs)).toEqual([]);
  });

  it('retorna ["passport"] quando só há diploma e funds_proof (nunca deve acontecer no novo fluxo)', () => {
    const docs = [
      { type: 'diploma', status: 'approved' },
      { type: 'funds_proof', status: 'approved' },
    ];
    expect(getMissingRequiredDocs(docs)).toEqual(['passport']);
  });
});

// ---------------------------------------------------------------------------
// canApproveApplication
// ---------------------------------------------------------------------------

describe('canApproveApplication', () => {
  it('retorna true quando passport está approved', () => {
    const docs = [{ type: 'passport', status: 'approved' }];
    expect(canApproveApplication(docs)).toBe(true);
  });

  it('retorna false quando passport está under_review', () => {
    const docs = [{ type: 'passport', status: 'under_review' }];
    expect(canApproveApplication(docs)).toBe(false);
  });

  it('retorna false quando passport está rejected', () => {
    const docs = [{ type: 'passport', status: 'rejected' }];
    expect(canApproveApplication(docs)).toBe(false);
  });

  it('retorna false quando não há documentos', () => {
    expect(canApproveApplication([])).toBe(false);
  });

  it('retorna true quando passport approved + diploma/funds_proof antigos presentes (backward compat)', () => {
    // Aluno histórico com os 3 docs — não deve bloquear aprovação
    const docs = [
      { type: 'passport', status: 'approved' },
      { type: 'diploma', status: 'approved' },
      { type: 'funds_proof', status: 'approved' },
    ];
    expect(canApproveApplication(docs)).toBe(true);
  });

  it('retorna true quando passport approved mesmo que diploma seja rejected (não é mais obrigatório)', () => {
    const docs = [
      { type: 'passport', status: 'approved' },
      { type: 'diploma', status: 'rejected' },
    ];
    expect(canApproveApplication(docs)).toBe(true);
  });

  it('retorna false quando passport está ausente mas funds_proof está approved', () => {
    const docs = [{ type: 'funds_proof', status: 'approved' }];
    expect(canApproveApplication(docs)).toBe(false);
  });

  it('é case-insensitive no status', () => {
    const docs = [{ type: 'passport', status: 'APPROVED' }];
    expect(canApproveApplication(docs)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildDocumentEntries
// ---------------------------------------------------------------------------

describe('buildDocumentEntries', () => {
  it('retorna apenas a entrada de passport', () => {
    const entries = buildDocumentEntries('https://storage/passport.pdf');
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe('passport');
    expect(entries[0].url).toBe('https://storage/passport.pdf');
  });

  it('NÃO inclui diploma', () => {
    const entries = buildDocumentEntries('https://storage/passport.pdf');
    expect(entries.map((e) => e.type)).not.toContain('diploma');
  });

  it('NÃO inclui funds_proof', () => {
    const entries = buildDocumentEntries('https://storage/passport.pdf');
    expect(entries.map((e) => e.type)).not.toContain('funds_proof');
  });

  it('filtra entrada se url for string vazia', () => {
    const entries = buildDocumentEntries('');
    expect(entries).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildAnalysisWebhookPayload
// ---------------------------------------------------------------------------

describe('buildAnalysisWebhookPayload', () => {
  it('contém user_id, student_name e passport_url', () => {
    const payload = buildAnalysisWebhookPayload('user-123', 'John Doe', 'https://storage/pass.pdf');
    expect(payload).toMatchObject({
      user_id: 'user-123',
      student_name: 'John Doe',
      passport_url: 'https://storage/pass.pdf',
    });
  });

  it('NÃO contém diploma_url', () => {
    const payload = buildAnalysisWebhookPayload('u', 'n', 'url');
    expect(payload).not.toHaveProperty('diploma_url');
  });

  it('NÃO contém funds_proof_url', () => {
    const payload = buildAnalysisWebhookPayload('u', 'n', 'url');
    expect(payload).not.toHaveProperty('funds_proof_url');
  });
});
