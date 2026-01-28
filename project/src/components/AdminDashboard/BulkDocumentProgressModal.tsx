import React from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export interface StudentProgress {
  student_id: string;
  student_name: string;
  status: 'pending' | 'processing' | 'success' | 'skipped' | 'error';
  registration_terms: 'pending' | 'success' | 'skipped' | 'error';
  selection_process_contract: 'pending' | 'success' | 'skipped' | 'error';
  error?: string;
}

interface BulkDocumentProgressModalProps {
  isOpen: boolean;
  students: StudentProgress[];
  currentIndex: number;
  onClose: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-700',
    skipped: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[status as keyof typeof colors]}`}>
      {status}
    </span>
  );
}

function BulkDocumentProgressModalBase({
  isOpen,
  students,
  currentIndex,
  onClose
}: BulkDocumentProgressModalProps) {
  if (!isOpen) return null;

  const totalStudents = students.length;
  const progressPercent = totalStudents > 0 
    ? Math.round((currentIndex / totalStudents) * 100) 
    : 0;
  
  const successCount = students.filter(s => s.status === 'success').length;
  const errorCount = students.filter(s => s.status === 'error').length;
  const skippedCount = students.filter(s => s.status === 'skipped').length;

  const isComplete = currentIndex >= totalStudents;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header com barra de progresso */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold mb-4">
            {isComplete ? 'Generation Complete' : 'Generating Documents'}
          </h2>
          
          {/* Barra de progresso */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>{currentIndex} / {totalStudents} students processed</span>
            <span>{progressPercent}%</span>
          </div>
        </div>

        {/* Lista de status por aluno */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {students.map((student) => (
              <div key={student.student_id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{student.student_name}</span>
                  {student.status === 'success' && (
                    <CheckCircle size={20} className="text-green-500" />
                  )}
                  {student.status === 'error' && (
                    <XCircle size={20} className="text-red-500" />
                  )}
                  {student.status === 'skipped' && (
                    <span className="text-yellow-600 text-sm">Skipped</span>
                  )}
                  {student.status === 'processing' && (
                    <RefreshCw size={20} className="text-blue-500 animate-spin" />
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Registration Terms:</span>
                    <StatusBadge status={student.registration_terms} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Contract:</span>
                    <StatusBadge status={student.selection_process_contract} />
                  </div>
                </div>
                
                {student.error && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    {student.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer com resumo e botão de fechar */}
        {isComplete && (
          <div className="p-6 border-t bg-gray-50">
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{successCount}</div>
                <div className="text-sm text-gray-600">Success</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{skippedCount}</div>
                <div className="text-sm text-gray-600">Skipped</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const BulkDocumentProgressModal = React.memo(BulkDocumentProgressModalBase);
export default BulkDocumentProgressModal;
