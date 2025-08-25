import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { X, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface Term {
  id: string;
  title: string;
  content: string;
  status: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

interface CheckTermsBeforeCheckoutProps {
  children: React.ReactNode;
  onProceed: () => void;
}

export function CheckTermsBeforeCheckout({ children, onProceed }: CheckTermsBeforeCheckoutProps) {
  const [loading, setLoading] = useState(true);
  const [hasUnacceptedTerms, setHasUnacceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const { user } = useAuth();
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  useEffect(() => {
    console.log('🔍 [CheckTermsBeforeCheckout] useEffect chamado, user:', user?.id);
    if (user) {
      checkTermsAcceptance();
    }
  }, [user]);

  const checkTermsAcceptance = async () => {
    if (!user) {
      console.log('🔍 [CheckTermsBeforeCheckout] Nenhum usuário logado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 [CheckTermsBeforeCheckout] Verificando termos para usuário:', user.id);
      
      // Buscar o termo ativo
      const { data: activeTerms, error: termsError } = await supabase
        .from('affiliate_terms')
        .select('*')
        .eq('status', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (termsError) throw termsError;
      
      if (activeTerms && activeTerms.length > 0) {
        const term = activeTerms[0];
        console.log('🔍 [CheckTermsBeforeCheckout] Termo ativo encontrado:', term);
        setActiveTerm(term);
        
        // Verificar se o usuário já aceitou este termo
        const { data: acceptance, error: acceptanceError } = await supabase
          .from('user_terms_acceptance')
          .select('id')
          .eq('user_id', user.id)
          .eq('term_id', term.id)
          .single();

        if (acceptanceError && acceptanceError.code !== 'PGRST116') {
          console.error('Erro ao verificar aceitação:', acceptanceError);
        }

        const hasAccepted = !!acceptance;
        setHasAcceptedTerms(hasAccepted);
        setHasUnacceptedTerms(!hasAccepted);
        
        console.log('🔍 [CheckTermsBeforeCheckout] Usuário aceitou termos:', hasAccepted);
      } else {
        console.log('🔍 [CheckTermsBeforeCheckout] Nenhum termo ativo encontrado');
        setHasUnacceptedTerms(false);
      }
    } catch (err: any) {
      console.error('🔍 [CheckTermsBeforeCheckout] Erro ao verificar termos:', err);
      setHasUnacceptedTerms(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    console.log('🔍 [CheckTermsBeforeCheckout] handleClick chamado. hasUnacceptedTerms:', hasUnacceptedTerms);
    if (hasUnacceptedTerms && activeTerm) {
      console.log('🔍 [CheckTermsBeforeCheckout] Mostrando modal de termos');
      setShowTerms(true);
    } else {
      console.log('🔍 [CheckTermsBeforeCheckout] Não há termos pendentes, prosseguindo');
      onProceed();
    }
  };

  const handleTermsAccepted = async () => {
    if (!user || !activeTerm) return;
    
    try {
      console.log('🔍 [CheckTermsBeforeCheckout] Salvando aceitação dos termos');
      
      // Inserir aceitação do termo
      const { error } = await supabase
        .from('user_terms_acceptance')
        .insert({
          user_id: user.id,
          term_id: activeTerm.id
        });

      if (error) throw error;

      console.log('🔍 [CheckTermsBeforeCheckout] Termos aceitos com sucesso');
      setShowTerms(false);
      setHasUnacceptedTerms(false);
      setHasAcceptedTerms(true);
      onProceed();
    } catch (err: any) {
      console.error('🔍 [CheckTermsBeforeCheckout] Erro ao salvar aceitação:', err);
      alert('Erro ao salvar aceitação dos termos. Tente novamente.');
    }
  };

  if (loading) {
    return <div className="opacity-50">{children}</div>;
  }

  return (
    <>
      <div onClick={handleClick}>
        {children}
      </div>

      {showTerms && activeTerm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Termos e Condições</h2>
              </div>
              <button 
                onClick={() => setShowTerms(false)} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Term Info */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Versão {activeTerm.version}</span>
                </div>
                <p className="text-sm text-blue-700">
                  Última atualização: {new Date(activeTerm.updated_at).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {/* Term Title */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {activeTerm.title}
                </h3>
              </div>

              {/* Term Content */}
              <div className="prose prose-sm max-w-none text-gray-700">
                <div 
                  className="whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: activeTerm.content }}
                />
              </div>

              {/* Important Notice */}
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-900 mb-1">Atenção</p>
                    <p className="text-sm text-amber-800">
                      É necessário aceitar estes termos e condições antes de prosseguir com o pagamento das taxas.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-4 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowTerms(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleTermsAccepted}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Aceitar e Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
