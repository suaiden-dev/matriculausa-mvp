import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { X } from 'lucide-react';

interface Term {
  id: string;
  title: string;
  content: string;
  status: boolean;
  version: number;
}

interface AffiliateTermsAcceptanceProps {
  onAccept: () => void;
  onCancel: () => void;
  sellerReferralCode: string;
}

export default function AffiliateTermsAcceptance({ onAccept, onCancel, sellerReferralCode }: AffiliateTermsAcceptanceProps) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadActiveTerms();
  }, []);

  const loadActiveTerms = async () => {
    try {
      setLoading(true);
      
      // Carregar termos ativos
      const { data: activeTerms, error: termsError } = await supabase
        .from('affiliate_terms')
        .select('*')
        .eq('status', true)
        .order('created_at', { ascending: true });

      if (termsError) throw termsError;

      if (activeTerms) {
        setTerms(activeTerms);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTermAcceptance = (termId: string) => {
    setAcceptedTerms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(termId)) {
        newSet.delete(termId);
      } else {
        newSet.add(termId);
      }
      return newSet;
    });
  };

  const handleAcceptAll = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Inserir aceitação para cada termo
      const promises = Array.from(acceptedTerms).map(termId => 
        supabase
          .from('user_terms_acceptance')
          .insert({
            user_id: user.id,
            term_id: termId
          })
      );

      await Promise.all(promises);
      onAccept();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900">Termos e Condições</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {terms.map((term) => (
            <div key={term.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  id={term.id}
                  checked={acceptedTerms.has(term.id)}
                  onChange={() => handleTermAcceptance(term.id)}
                  className="mt-1"
                />
                <div>
                  <label htmlFor={term.id} className="font-medium text-slate-900 block mb-2">
                    {term.title}
                  </label>
                  <div className="prose prose-sm max-w-none text-slate-600">
                    <p className="whitespace-pre-wrap">{term.content}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 hover:text-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleAcceptAll}
            disabled={acceptedTerms.size !== terms.length}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aceitar Todos os Termos
          </button>
        </div>
      </div>
    </div>
  );
}
