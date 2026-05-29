import React from 'react';
import { FileText, Edit3, Save, X, Plus, Bot, User } from 'lucide-react';

interface AdminNote {
  id: string;
  content: string;
  created_at: string;
  created_by_name: string;
  created_by?: string;
}

interface AdminNotesCardProps {
  notes: AdminNote[];
  isAddingNote: boolean;
  newNoteContent: string;
  editingNoteId: string | null;
  editingNoteContent: string;
  savingNotes: boolean;
  onAddNoteToggle: (value: boolean) => void;
  onNewNoteChange: (value: string) => void;
  onAddNote: () => Promise<void>;
  onEditNote: (noteId: string) => void;
  onSaveEditNote: () => Promise<void>;
  onCancelEditNote: () => void;
  onEditNoteContentChange: (value: string) => void;
  onDeleteNote: (noteId: string) => Promise<void>;
}

/** Formata a data de forma legível em pt-BR */
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/** Extrai o primeiro nome de um email ou nome completo */
function formatAuthorName(name?: string): string {
  if (!name) return 'Admin';
  // Se for email, pegar a parte antes do @
  if (name.includes('@')) {
    const local = name.split('@')[0];
    // Capitalizar e trocar pontos/underscores por espaços
    return local.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  return name;
}

/** Determina se a nota é do sistema/AI */
function isSystemNote(note: AdminNote): boolean {
  return (
    note.created_by === 'system' ||
    note.created_by === 'antigravity-ai' ||
    note.created_by_name?.toLowerCase().includes('sistema') ||
    note.created_by_name?.toLowerCase().includes('ai assistant') ||
    note.created_by_name?.toLowerCase().includes('correção')
  );
}

/**
 * AdminNotesCard - Gerencia notas administrativas sobre o aluno
 * Visível apenas para platform admins.
 */
const AdminNotesCard: React.FC<AdminNotesCardProps> = ({
  notes,
  isAddingNote,
  newNoteContent,
  editingNoteId,
  editingNoteContent,
  savingNotes,
  onAddNoteToggle,
  onNewNoteChange,
  onAddNote,
  onEditNote,
  onSaveEditNote,
  onCancelEditNote,
  onEditNoteContentChange,
  onDeleteNote,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 opacity-80" />
          Admin Notes
          {notes.length > 0 && (
            <span className="ml-1 bg-white/20 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {notes.length}
            </span>
          )}
        </h3>
        <button
          onClick={() => onAddNoteToggle(true)}
          disabled={isAddingNote}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova nota
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Formulário nova nota */}
        {isAddingNote && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <label className="block text-sm font-medium text-amber-800">
              Adicionar nova nota
            </label>
            <textarea
              value={newNoteContent || ''}
              onChange={(e) => onNewNoteChange(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
              onKeyPress={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              placeholder="Digite sua observação sobre o aluno..."
              className="w-full px-3 py-2.5 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none bg-white text-slate-800 text-sm outline-none placeholder:text-slate-400"
              rows={3}
              disabled={savingNotes}
              autoFocus
              style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1000 }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-amber-700">
                Visível apenas para administradores da plataforma.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onAddNoteToggle(false); onNewNoteChange(''); }}
                  disabled={savingNotes}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => { await onAddNote(); onAddNoteToggle(false); }}
                  disabled={savingNotes || !newNoteContent.trim()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-3 h-3" />
                  {savingNotes ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de notas */}
        {notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((note, index) => {
              const isSystem = isSystemNote(note);
              const authorName = formatAuthorName(note.created_by_name);

              return (
                <div
                  key={note.id}
                  className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${
                    isSystem
                      ? 'bg-blue-50 border-blue-100'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  {/* Cabeçalho da nota */}
                  <div className="flex items-start justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      {/* Avatar */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSystem
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isSystem
                          ? <Bot className="w-3.5 h-3.5" />
                          : <User className="w-3.5 h-3.5" />
                        }
                      </div>

                      {/* Autor + data */}
                      <div>
                        <p className="text-sm font-semibold text-slate-800 leading-none">
                          {authorName}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDate(note.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Número da nota + ações */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full font-medium">
                        #{notes.length - index}
                      </span>
                      {!isSystem && (
                        <>
                          <button
                            onClick={() => onEditNote(note.id)}
                            disabled={savingNotes || editingNoteId === note.id}
                            className="p-1 text-slate-300 hover:text-blue-500 transition-colors disabled:opacity-40"
                            title="Editar nota"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteNote(note.id)}
                            disabled={savingNotes || editingNoteId === note.id}
                            className="p-1 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
                            title="Excluir nota"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Conteúdo */}
                  {editingNoteId === note.id ? (
                    <div className="space-y-2.5 ml-9">
                      <textarea
                        value={editingNoteContent || ''}
                        onChange={(e) => { e.stopPropagation(); onEditNoteContentChange(e.target.value); }}
                        onKeyDown={(e) => e.stopPropagation()}
                        onKeyUp={(e) => e.stopPropagation()}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 resize-none text-sm bg-white text-slate-800 outline-none"
                        rows={3}
                        disabled={savingNotes}
                        autoFocus
                        style={{ pointerEvents: 'auto' }}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={onSaveEditNote}
                          disabled={savingNotes || !editingNoteContent.trim()}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="w-3 h-3" />
                          {savingNotes ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={onCancelEditNote}
                          disabled={savingNotes}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm whitespace-pre-wrap ml-9 leading-relaxed ${
                      isSystem ? 'text-blue-700' : 'text-slate-700'
                    }`}>
                      {note.content}
                    </p>
                  )}

                  {/* Badge sistema */}
                  {isSystem && (
                    <div className="ml-9 mt-2">
                      <span className="inline-flex items-center gap-1 text-xs text-blue-500 font-medium">
                        <Bot className="w-3 h-3" />
                        Nota automática do sistema
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Nenhuma nota adicionada</p>
            <p className="text-xs text-slate-300 mt-1">Clique em "Nova nota" para começar</p>
          </div>
        )}
      </div>
    </div>
  );
};

AdminNotesCard.displayName = 'AdminNotesCard';

export default AdminNotesCard;
