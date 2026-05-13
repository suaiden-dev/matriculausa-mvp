import { useSearchParams } from 'react-router-dom';
import AdminStudentChatPage from '../../components/Chat/AdminStudentChatPage';

const StudentMessages: React.FC = () => {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId') || undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
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
