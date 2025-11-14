import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface StudentRecord {
  student_id: string;
  admin_notes?: any;
}

export const useAdminNotes = (
  student: StudentRecord | null, 
  userId?: string,
  setStudent?: (student: any) => void
) => {
  const [adminNotes, setAdminNotes] = useState<any[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Carregar admin notes do student
  useEffect(() => {
    if (!student) {
      setAdminNotes([]);
      return;
    }

    // Admin notes vem do RPC get_admin_student_full_details no campo admin_notes
    // Se vier como string JSON, fazer parse; se já for array, usar diretamente
    if (student.admin_notes) {
      try {
        if (Array.isArray(student.admin_notes)) {
          setAdminNotes(student.admin_notes);
        } else if (typeof student.admin_notes === 'string') {
          const parsed = JSON.parse(student.admin_notes);
          if (Array.isArray(parsed)) {
            setAdminNotes(parsed);
          } else {
            // Fallback: criar array com nota única
            setAdminNotes([{
              id: `note-${Date.now()}`,
              content: parsed,
              created_by: 'unknown',
              created_by_name: 'Admin',
              created_at: new Date().toISOString()
            }]);
          }
        } else {
          setAdminNotes([]);
        }
      } catch (error) {
        console.error('Error parsing admin notes:', error);
        // Se não conseguir fazer parse, criar array com nota única
        setAdminNotes([{
          id: `note-${Date.now()}`,
          content: student.admin_notes,
          created_by: 'unknown',
          created_by_name: 'Admin',
          created_at: new Date().toISOString()
        }]);
      }
    } else {
      setAdminNotes([]);
    }
  }, [student?.admin_notes]);

  // Handler para adicionar nota
  const handleAddNote = useCallback(async () => {
    if (!student || !newNoteContent.trim()) return;
    
    setSavingNotes(true);
    try {
      // Obter informações do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || 'Admin';

      const newNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        content: newNoteContent.trim(),
        created_by: userId || user?.id || 'unknown',
        created_by_name: userEmail,
        created_at: new Date().toISOString()
      };

      const updatedNotes = [newNote, ...adminNotes];
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          admin_notes: JSON.stringify(updatedNotes),
          updated_at: new Date().toISOString()
        })
        .eq('id', student.student_id);

      if (error) throw error;
      
      setAdminNotes(updatedNotes);
      setNewNoteContent('');
      setIsAddingNote(false);
      
      // Atualizar o estado do student se setStudent for fornecido
      if (setStudent) {
        setStudent((prev: any) => prev ? { ...prev, admin_notes: JSON.stringify(updatedNotes) } : prev);
      }
    } catch (err) {
      console.error('Error adding note:', err);
      alert('Erro ao adicionar nota: ' + (err as any)?.message);
    } finally {
      setSavingNotes(false);
    }
  }, [student, newNoteContent, userId, adminNotes, setStudent]);

  // Handler para iniciar edição de nota
  const handleEditNote = useCallback((noteId: string) => {
    const note = adminNotes.find(n => n.id === noteId);
    if (note) {
      setEditingNoteId(noteId);
      setEditingNoteContent(note.content);
    }
  }, [adminNotes]);

  // Handler para salvar edição de nota
  const handleSaveEditNote = useCallback(async () => {
    if (!editingNoteId || !student || !editingNoteContent.trim()) return;
    
    setSavingNotes(true);
    try {
      const updatedNotes = adminNotes.map(note => 
        note.id === editingNoteId 
          ? { ...note, content: editingNoteContent.trim() }
          : note
      );
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          admin_notes: JSON.stringify(updatedNotes),
          updated_at: new Date().toISOString()
        })
        .eq('id', student.student_id);

      if (error) throw error;
      
      setAdminNotes(updatedNotes);
      setEditingNoteId(null);
      setEditingNoteContent('');
      
      // Atualizar o estado do student se setStudent for fornecido
      if (setStudent) {
        setStudent((prev: any) => prev ? { ...prev, admin_notes: JSON.stringify(updatedNotes) } : prev);
      }
    } catch (err) {
      console.error('Error updating note:', err);
      alert('Erro ao atualizar nota: ' + (err as any)?.message);
    } finally {
      setSavingNotes(false);
    }
  }, [editingNoteId, editingNoteContent, student, adminNotes, setStudent]);

  // Handler para deletar nota
  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!window.confirm('Delete this note?') || !student) return;
    
    setSavingNotes(true);
    try {
      const updatedNotes = adminNotes.filter(note => note.id !== noteId);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          admin_notes: JSON.stringify(updatedNotes),
          updated_at: new Date().toISOString()
        })
        .eq('id', student.student_id);

      if (error) throw error;
      
      setAdminNotes(updatedNotes);
      
      // Atualizar o estado do student se setStudent for fornecido
      if (setStudent) {
        setStudent((prev: any) => prev ? { ...prev, admin_notes: JSON.stringify(updatedNotes) } : prev);
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Erro ao deletar nota: ' + (err as any)?.message);
    } finally {
      setSavingNotes(false);
    }
  }, [student, adminNotes, setStudent]);

  return {
    adminNotes,
    isAddingNote,
    setIsAddingNote,
    newNoteContent,
    setNewNoteContent,
    editingNoteId,
    setEditingNoteId,
    editingNoteContent,
    setEditingNoteContent,
    savingNotes,
    handleAddNote,
    handleEditNote,
    handleSaveEditNote,
    handleDeleteNote
  };
};

