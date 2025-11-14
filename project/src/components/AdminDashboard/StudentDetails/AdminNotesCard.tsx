import React from 'react';
import { FileText, Edit3, Save, X } from 'lucide-react';

interface AdminNote {
  id: string;
  content: string;
  created_at: string;
  created_by_name: string;
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

/**
 * AdminNotesCard - Manages administrative notes about the student
 * Platform admins only - allows CRUD operations on notes
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-[#05294E]" />
          Admin Notes
        </h3>
        <button
          onClick={() => onAddNoteToggle(true)}
          className="px-3 py-1 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Note</span>
        </button>
      </div>
      <div className="space-y-4">
        {/* Formulário para adicionar nova nota */}
        {isAddingNote && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4" style={{ pointerEvents: 'auto', zIndex: 10 }}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Add a new note
            </label>
            <textarea
              value={newNoteContent || ''}
              onChange={(e) => {
                const value = e.target.value;
                console.log('Textarea onChange:', value);
                onNewNoteChange(value);
              }}
              onKeyPress={(e) => {
                e.stopPropagation();
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              onKeyUp={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onFocus={(e) => {
                e.stopPropagation();
              }}
              placeholder="Enter your note about this student..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] resize-none bg-white text-slate-900 outline-none"
              rows={3}
              disabled={savingNotes}
              autoFocus
              style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1000 }}
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-slate-500">
                These notes are only visible to platform administrators.
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => { onAddNoteToggle(false); onNewNoteChange(''); }}
                  disabled={savingNotes}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Cancel</span>
                </button>
                <button
                  onClick={async () => { await onAddNote(); onAddNoteToggle(false); }}
                  disabled={savingNotes || !newNoteContent.trim()}
                  className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingNotes ? 'Adding...' : 'Add Note'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de notas existentes */}
        <div className="space-y-3">
          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note, index) => (
                <div key={note.id} className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full flex-shrink-0 mt-2"></div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{note.created_by_name}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(note.created_at).toLocaleString('pt-BR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                        #{notes.length - index}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onEditNote(note.id)}
                          disabled={savingNotes || editingNoteId === note.id}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit note"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteNote(note.id)}
                          disabled={savingNotes || editingNoteId === note.id}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete note"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Conteúdo da nota - modo visualização ou edição */}
                  {editingNoteId === note.id ? (
                    <div className="ml-4 space-y-3">
                      <textarea
                        value={editingNoteContent || ''}
                        onChange={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEditNoteContentChange(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                        }}
                        onKeyUp={(e) => {
                          e.stopPropagation();
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] resize-none text-sm bg-white text-slate-900 outline-none"
                        rows={3}
                        disabled={savingNotes}
                        autoFocus
                        style={{ pointerEvents: 'auto' }}
                      />
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={onSaveEditNote}
                          disabled={savingNotes || !editingNoteContent.trim()}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-3 h-3" />
                          <span>{savingNotes ? 'Saving...' : 'Save'}</span>
                        </button>
                        <button
                          onClick={onCancelEditNote}
                          disabled={savingNotes}
                          className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-3 h-3" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-900 text-sm whitespace-pre-wrap ml-4">
                      {note.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No notes added yet</p>
              <p className="text-xs text-slate-400 mt-1">Add your first note above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

AdminNotesCard.displayName = 'AdminNotesCard';

export default AdminNotesCard;

