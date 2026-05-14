import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, ArrowLeft, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const AffiliateAdminPendingApproval: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 text-center"
      >
        <div className="mx-auto w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        
        <h1 className="text-2xl font-black text-slate-900 mb-4">
          Cadastro em Análise
        </h1>
        
        <p className="text-slate-500 font-medium mb-8">
          Recebemos as informações da sua agência com sucesso! Nossa equipe está analisando seu perfil e entrará em contato em breve para liberar seu acesso ao painel de parcerias.
        </p>

        <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-bold text-slate-900 block">Dados recebidos</span>
              <span className="text-slate-500">Seu formulário foi enviado com sucesso.</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-[#05294E] mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-bold text-slate-900 block">Fique de olho no email</span>
              <span className="text-slate-500">Enviaremos uma notificação assim que sua conta for aprovada.</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center w-full gap-2 px-6 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para o Login
        </button>
      </motion.div>
    </div>
  );
};

export default AffiliateAdminPendingApproval;
