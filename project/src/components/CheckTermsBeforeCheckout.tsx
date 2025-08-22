import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import AffiliateTermsAcceptance from './AffiliateTermsAcceptance';

interface CheckTermsBeforeCheckoutProps {
  children: React.ReactNode;
  onProceed: () => void;
}

export function CheckTermsBeforeCheckout({ children, onProceed }: CheckTermsBeforeCheckoutProps) {
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasUnacceptedTerms, setHasUnacceptedTerms] = useState(false);
  const { user } = useAuth();
  const [sellerReferralCode, setSellerReferralCode] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 [CheckTermsBeforeCheckout] useEffect chamado, user:', user?.id);
    checkTermsAcceptance();
  }, [user]);

  const checkTermsAcceptance = async () => {
    if (!user) {
      console.log('🔍 [CheckTermsBeforeCheckout] Nenhum usuário logado');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 [CheckTermsBeforeCheckout] Verificando termos para usuário:', user.id);
      
      // Primeiro, buscar o seller_referral_code do usuário
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('seller_referral_code')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      console.log('🔍 [CheckTermsBeforeCheckout] Perfil do usuário:', profile);
      
      if (profile?.seller_referral_code) {
        console.log('🔍 [CheckTermsBeforeCheckout] Código de vendedor encontrado:', profile.seller_referral_code);
        setSellerReferralCode(profile.seller_referral_code);
        
        // Verificar se há termos não aceitos
        const { data, error } = await supabase.rpc(
          'check_user_terms_acceptance',
          { 
            p_user_id: user.id
          }
        );

        if (error) throw error;

        console.log('🔍 [CheckTermsBeforeCheckout] Resultado da verificação de termos:', data);
        setHasUnacceptedTerms(!data);
      } else {
        console.log('🔍 [CheckTermsBeforeCheckout] Usuário não tem código de vendedor');
      }
    } catch (err) {
      console.error('Erro ao verificar aceitação dos termos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    console.log('🔍 [CheckTermsBeforeCheckout] handleClick chamado. hasUnacceptedTerms:', hasUnacceptedTerms);
    if (hasUnacceptedTerms) {
      console.log('🔍 [CheckTermsBeforeCheckout] Mostrando modal de termos');
      setShowTerms(true);
    } else {
      console.log('🔍 [CheckTermsBeforeCheckout] Não há termos pendentes, prosseguindo');
      onProceed();
    }
  };

  const handleTermsAccepted = () => {
    console.log('🔍 [CheckTermsBeforeCheckout] Termos aceitos, prosseguindo com o checkout');
    setShowTerms(false);
    setHasUnacceptedTerms(false);
    onProceed();
  };

  if (loading) {
    return <div className="opacity-50">{children}</div>;
  }

  return (
    <>
      <div onClick={handleClick}>
        {children}
      </div>

      {showTerms && sellerReferralCode && (
        <AffiliateTermsAcceptance
          onAccept={handleTermsAccepted}
          onCancel={() => setShowTerms(false)}
          sellerReferralCode={sellerReferralCode}
        />
      )}
    </>
  );
}
