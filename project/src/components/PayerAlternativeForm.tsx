import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './ui/input';
import { CreditCard, User, Mail, Phone, Hash, Info, Loader2, Shield } from 'lucide-react';
import { cn } from '../lib/cn';

export interface PayerInfo {
  name: string;
  cpf: string;
  email: string;
  phone: string;
}

interface PayerAlternativeFormProps {
  onPayerInfoChange: (info: PayerInfo | null) => void;
  initialInfo?: PayerInfo | null;
  initialCpf?: string;
  onPayButtonClick?: () => void;
  isProcessing?: boolean;
}

const PayerAlternativeForm: React.FC<PayerAlternativeFormProps> = ({ 
  onPayerInfoChange,
  initialInfo,
  initialCpf = '',
  onPayButtonClick,
  isProcessing
}) => {
  const { t } = useTranslation();
  const [isOtherPayer, setIsOtherPayer] = useState(!!initialInfo);
  const [payerInfo, setPayerInfo] = useState<PayerInfo>(initialInfo || {
    name: '',
    cpf: initialCpf,
    email: '',
    phone: ''
  });

  // Sincronizar CPF inicial quando o componente monta ou o CPF principal muda
  useEffect(() => {
    if (!isOtherPayer && initialCpf && !payerInfo.cpf) {
      setPayerInfo(prev => ({ ...prev, cpf: initialCpf }));
    }
  }, [initialCpf, isOtherPayer]);

  useEffect(() => {
    if (isOtherPayer) {
      onPayerInfoChange(payerInfo);
    } else {
      // ✅ NOVO: Mesmo no modo "Meu Cartão", passamos o CPF se ele existir
      // Isso permite que o backend receba o CPF atualizado
      if (payerInfo.cpf) {
        onPayerInfoChange({
          name: '', // Nome vazio indica que é o próprio aluno
          email: '',
          phone: '',
          cpf: payerInfo.cpf
        });
      } else {
        onPayerInfoChange(null);
      }
    }
  }, [isOtherPayer, payerInfo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPayerInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    // Format CPF: 000.000.000-00
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{3})/, '$1.$2');
    }
    
    setPayerInfo(prev => ({ ...prev, cpf: value }));
  };

  return (
    <div className="space-y-4 border rounded-xl p-4 bg-muted/30">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <span className="font-medium text-sm">Titular do Cartão</span>
        </div>
        
        <div className="flex p-1 bg-background border rounded-lg w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsOtherPayer(false)}
            className={cn(
              "flex-1 px-3 py-1.5 text-xs rounded-md transition-all whitespace-nowrap",
              !isOtherPayer ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
            )}
          >
            Meu Cartão
          </button>
          <button
            type="button"
            onClick={() => setIsOtherPayer(true)}
            className={cn(
              "flex-1 px-3 py-1.5 text-xs rounded-md transition-all whitespace-nowrap",
              isOtherPayer ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
            )}
          >
            Cartão de Terceiro
          </button>
        </div>
      </div>

      {/* Formulário Simplificado (Meu Cartão) - Mostra apenas CPF */}
      {!isOtherPayer && (
        <div className="pt-2 animate-in fade-in duration-300">
          <div className="space-y-1.5 w-full">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">
              Seu CPF (Titular)
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="relative flex-grow">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  name="cpf"
                  value={payerInfo.cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  className="pl-10 text-sm h-12"
                  required
                />
              </div>
              
              {onPayButtonClick && (
                <button
                  type="button"
                  onClick={onPayButtonClick}
                  disabled={isProcessing || payerInfo.cpf.replace(/\D/g, '').length !== 11}
                  className="bg-blue-600 text-white px-8 h-12 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Prosseguir para Pagamento
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground ml-1 italic">
              Confirme seu CPF para processar o pagamento via Parcelow.
            </p>
          </div>
        </div>
      )}

      {/* Formulário Completo (Cartão de Terceiro) */}
      {isOtherPayer && (
        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-xs text-muted-foreground bg-primary/10 p-3 rounded-lg border border-primary/20">
            <strong>Importante:</strong> Preencha os dados abaixo com as informações do <strong>titular do cartão</strong> para evitar que o pagamento seja recusado pela Parcelow.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  name="name"
                  value={payerInfo.name}
                  onChange={handleChange}
                  className="pl-10 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                CPF do Titular
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  name="cpf"
                  value={payerInfo.cpf}
                  onChange={handleCpfChange}
                  className="pl-10 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                E-mail do Titular
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  name="email"
                  type="email"
                  value={payerInfo.email}
                  onChange={handleChange}
                  className="pl-10 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                Telefone/WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  name="phone"
                  value={payerInfo.phone}
                  onChange={handleChange}
                  className="pl-10 text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {onPayButtonClick && (
            <button
              type="button"
              onClick={onPayButtonClick}
              disabled={isProcessing || !payerInfo.name || !payerInfo.email || !payerInfo.cpf || !payerInfo.phone}
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Pagar Agora com Parcelow
                </>
              )}
            </button>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="text-blue-500 flex-shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-blue-900 uppercase tracking-tight">
                {t('paymentStep.parcelowAddressNoticeTitle')}
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed italic">
                {t('paymentStep.parcelowAddressNoticeContent')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayerAlternativeForm;

