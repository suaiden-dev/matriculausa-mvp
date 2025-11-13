import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface StudentRecord {
  student_id: string;
  admin_notes?: any;
}

export const useAdminNotes = (student: StudentRecord | null, userId?: string) => {
  const [adminNotes, setAdminNotes] = useState<any[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Carregar admin notes do student
  useEffect(() => {
    if (!student) return;

    // Admin notes vem do RPC get_admin_student_full_details no campo admin_notes
    // Se vier como string JSON, fazer parse; se já for array, usar diretamente
    if (student.admin_notes) {
      try {
        if (Array.isArray(student.admin_notes)) {
          setAdminNotes(student.admin_notes);
        } else if (typeof student.admin_notes === 'string') {
          const parsed = JSON.parse(student.admin_notes);
          setAdminNotes(Array.isArray(parsed) ? parsed : [parsed]);
        } else {
          setAdminNotes([]);
        }
      } catch (error) {
        console.error('Error parsing admin notes:', error);
        setAdminNotes([]);
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
      const { error } = await supabase.from('admin_notes').insert({
        student_id: student.student_id,
        content: newNoteContent,
        created_by: userId,
      });

      if (error) throw error;
      
      setNewNoteContent('');
      setIsAddingNote(false);
      
      // Reload notes
      const { data } = await supabase
        .from('admin_notes')
        .select('*')
        .eq('student_id', student.student_id)
        .order('created_at', { ascending: false });
      
      if (data) setAdminNotes(data);
    } catch (err) {
      console.error('Error adding note:', err);
    } finally {
      setSavingNotes(false);
    }
  }, [student, newNoteContent, userId]);

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
    if (!editingNoteId || !student) return;
    
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('admin_notes')
        .update({ content: editingNoteContent })
        .eq('id', editingNoteId);

      if (error) throw error;
      
      setEditingNoteId(null);
      
      // Reload notes
      const { data } = await supabase
        .from('admin_notes')
        .select('*')
        .eq('student_id', student.student_id)
        .order('created_at', { ascending: false });
      
      if (data) setAdminNotes(data);
    } catch (err) {
      console.error('Error updating note:', err);
    } finally {
      setSavingNotes(false);
    }
  }, [editingNoteId, editingNoteContent, student]);

  // Handler para deletar nota
  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!window.confirm('Delete this note?') || !student) return;
    
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('admin_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      
      // Reload notes
      const { data } = await supabase
        .from('admin_notes')
        .select('*')
        .eq('student_id', student.student_id)
        .order('created_at', { ascending: false });
      
      if (data) setAdminNotes(data);
    } catch (err) {
      console.error('Error deleting note:', err);
    } finally {
      setSavingNotes(false);
    }
  }, [student]);

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

