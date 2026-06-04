import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AdminStudentChatPage from '../../components/Chat/AdminStudentChatPage';

const StudentMessages: React.FC = () => {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId') || undefined;
  const { i18n } = useTranslation();

  // Garante que esta página específica (mensagens da universidade) seja sempre exibida em inglês
  useEffect(() => {
    const originalLanguage = i18n.language;
    if (originalLanguage !== 'en') {
      i18n.changeLanguage('en');
    }
    return () => {
      if (originalLanguage && originalLanguage !== 'en') {
        i18n.changeLanguage(originalLanguage);
      }
    };
  }, [i18n]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-center sm:text-left w-full">
        <div className="w-full flex flex-col items-center sm:items-start">
          <h1 className="text-3xl font-bold text-[#05294E]">Student Messages</h1>
          <p className="text-slate-500 mt-1">Direct communication channel with your applicants</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <AdminStudentChatPage 
          className="h-[calc(100vh-250px)]"
          showInbox={true}
          defaultRecipientId={studentId}
        />
      </div>
    </div>
  );
};

export default StudentMessages;
