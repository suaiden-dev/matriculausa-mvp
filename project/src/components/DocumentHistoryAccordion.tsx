import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Download, ExternalLink } from 'lucide-react';

interface DocumentUpload {
  id: string;
  file_url: string;
  status: 'approved' | 'rejected' | 'under_review';
  uploaded_at: string;        // when the file was submitted
  rejected_at?: string | null;  // when it was rejected (different from upload time)
  approved_at?: string | null;  // when it was approved
  rejection_reason?: string | null;
  is_admin_upload?: boolean;
  uploaded_by_name?: string;
  uploaded_by_type?: 'student' | 'admin' | 'university';
}

interface DocumentHistoryAccordionProps {
  uploads: DocumentUpload[];
  /** Se true, mostra apenas uploads anteriores ao mais recente (útil quando o ativo já é exibido acima) */
  skipFirst?: boolean;
  /** Nome legível do documento (ex: "Passaporte", "Diploma") exibido no cabeçalho */
  documentLabel?: string;
  /** Callback para abrir o modal de visualização do sistema */
  onViewDocument?: (doc: { file_url: string; filename: string }) => void;
}

const STATUS_CONFIG = {
  approved: {
    label: 'Aprovado',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 border-green-200',
    iconClass: 'text-green-500',
  },
  rejected: {
    label: 'Rejeitado',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 border-red-200',
    iconClass: 'text-red-500',
  },
  under_review: {
    label: 'Em revisão',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    iconClass: 'text-yellow-500',
  },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const DocumentHistoryAccordion: React.FC<DocumentHistoryAccordionProps> = ({ uploads, skipFirst = false, documentLabel, onViewDocument }) => {
  const [open, setOpen] = useState(false);

  const sorted = [...uploads].sort(
    (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
  );

  const history = skipFirst ? sorted.slice(1) : sorted;

  if (history.length === 0) return null;

  return (
    <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-600"
      >
        <span>
          Histórico de envios
          {documentLabel && <span className="text-slate-800 font-semibold"> — {documentLabel}</span>}
          <span className="ml-1 text-slate-400">({history.length})</span>
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <ul className="divide-y divide-slate-100">
          {history.map((upload, idx) => {
            const cfg = STATUS_CONFIG[upload.status] ?? STATUS_CONFIG.under_review;
            const Icon = cfg.icon;
            const hasFile = !!upload.file_url;
            return (
              <li key={upload.id} className="px-4 py-3 bg-white flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400 font-medium">#{history.length - idx}</span>
                    {documentLabel && (
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {documentLabel}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.className}`}>
                      <Icon className={`w-3 h-3 ${cfg.iconClass}`} />
                      {cfg.label}
                    </span>
                    {upload.uploaded_by_name ? (
                      <span className="text-xs text-slate-500 italic">
                        {upload.uploaded_by_type === 'admin' ? 'Admin' : upload.uploaded_by_type === 'university' ? 'University' : 'Student'}: {upload.uploaded_by_name}
                      </span>
                    ) : upload.is_admin_upload ? (
                      <span className="text-xs text-slate-400 italic">enviado pelo admin</span>
                    ) : null}
                  </div>
                  {/* Dates: always show upload time; show decision time separately when available */}
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs text-slate-400">
                      Enviado: {formatDate(upload.uploaded_at)}
                    </span>
                    {upload.rejected_at && (
                      <span className="text-xs text-red-400">
                        Rejeitado: {formatDate(upload.rejected_at)}
                      </span>
                    )}
                    {upload.approved_at && (
                      <span className="text-xs text-green-500">
                        Aprovado: {formatDate(upload.approved_at)}
                      </span>
                    )}
                  </div>
                </div>

                {upload.rejection_reason && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                    <span className="font-semibold">Motivo: </span>{upload.rejection_reason}
                  </p>
                )}

                {hasFile && (
                  <div className="flex items-center gap-2 pt-0.5">
                    {onViewDocument ? (
                      <button
                        type="button"
                        onClick={() => onViewDocument({
                          file_url: upload.file_url,
                          filename: documentLabel
                            ? `${documentLabel} - versão anterior`
                            : 'Documento anterior',
                        })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#05294E] text-white hover:bg-[#041f38] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver documento
                      </button>
                    ) : (
                      <a
                        href={upload.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#05294E] text-white hover:bg-[#041f38] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver documento
                      </a>
                    )}
                    <a
                      href={upload.file_url}
                      download
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default DocumentHistoryAccordion;
