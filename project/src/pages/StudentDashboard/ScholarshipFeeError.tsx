import React from 'react';
import { XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const ScholarshipFeeError: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
        <XCircle className="h-16 w-16 text-red-600 mb-4" />
        <h1 className="text-3xl font-bold text-red-700 mb-2">Erro no pagamento da Scholarship Fee</h1>
        <p className="text-slate-700 mb-6 text-center">
          Ocorreu um problema ao processar seu pagamento de <span className="font-bold">$550</span>.<br/>
          Por favor, tente novamente. Se o erro persistir, entre em contato com o suporte.
        </p>
        <Link to="/student/dashboard/applications" className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all duration-300">
          Voltar para Minhas Aplicações
        </Link>
      </div>
    </div>
  );
};

export default ScholarshipFeeError; 