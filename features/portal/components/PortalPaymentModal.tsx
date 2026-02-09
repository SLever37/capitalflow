
import React, { useState, useMemo } from 'react';
import { X, Wallet, CheckCircle2, QrCode, Copy, Loader2, ArrowLeft } from 'lucide-react';
import { Loan, Installment } from '../../../types';
import { portalService } from '../../../services/portal.service';
import { resolvePaymentOptions, debugDebtCheck } from '../mappers/portalDebtRules';
import { BillingView, NotifyingView, SuccessView } from './payment/PaymentViews';
import { createPixCharge } from '../../../services/pix.service';
import { formatMoney } from '../../../utils/formatters';

interface PortalPaymentModalProps {
  loan: Loan;
  installment: Installment;
  clientData: { name: string; email?: string; doc?: string; id?: string };
  onClose: () => void;
}

export const PortalPaymentModal: React.FC<PortalPaymentModalProps> = ({ loan, installment, clientData, onClose }) => {
  const [step, setStep] = useState<'BILLING' | 'NOTIFYING' | 'SUCCESS' | 'PIX_QR'>('BILLING');
  const [error, setError] = useState<string | null>(null);
  
  // Estado para PIX Dinâmico
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);
  const [isLoadingPix, setIsLoadingPix] = useState(false);

  // ✅ Fonte Única de Verdade (Rules)
  const options = useMemo(() => {
    debugDebtCheck(loan, installment); // Log dev
    return resolvePaymentOptions(loan, installment);
  }, [loan, installment]);

  const pixKey = (loan as any).pixKey || (loan as any).pix_key || "";
  
  const handleNotifyPayment = async () => {
    if (!clientData.id) return;
    setStep('NOTIFYING');
    setError(null);
    try {
      await portalService.submitPaymentIntent(
        clientData.id,
        (loan as any).id,
        (loan as any).profile_id,
        'PAGAR_PIX'
      );
      setStep('SUCCESS');
    } catch (e: any) {
      setError(e.message || "Erro ao notificar operador.");
      setStep('BILLING');
    }
  };

  const copyPixKey = () => {
    if (pixKey) {
      navigator.clipboard.writeText(pixKey);
      alert("Chave PIX copiada!");
    }
  };

  const handleGeneratePixMP = async () => {
      setIsLoadingPix(true);
      setError(null);
      try {
          const response = await createPixCharge({
              amount: options.totalToPay, // Por padrão, cobra o total. Pode ser ajustado para renovação.
              payer_name: clientData.name,
              payer_email: clientData.email || 'cliente@portal.com',
              payer_doc: clientData.doc,
              loan_id: loan.id,
              installment_id: installment.id,
              payment_type: 'FULL', // Assume Full no Portal (Simplificação)
              profile_id: (loan as any).profile_id,
              source_id: loan.sourceId
          });

          if (!response.ok || !response.qr_code || !response.qr_code_base64) {
              throw new Error(response.error || "Falha ao gerar QR Code");
          }

          setPixData({ qr_code: response.qr_code, qr_code_base64: response.qr_code_base64 });
          setStep('PIX_QR');

      } catch (e: any) {
          console.error(e);
          setError(e.message || "Erro ao conectar com Mercado Pago.");
      } finally {
          setIsLoadingPix(false);
      }
  };

  const copyPixCode = () => {
      if (pixData?.qr_code) {
          navigator.clipboard.writeText(pixData.qr_code);
          alert("Código Copia e Cola copiado!");
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2rem] p-6 shadow-2xl relative animate-in zoom-in-95">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-xl font-black text-white uppercase text-center mb-6 flex items-center justify-center gap-2">
          {step === 'SUCCESS' ? <CheckCircle2 className="text-emerald-500" /> : <Wallet className="text-emerald-500" />}
          {step === 'SUCCESS' ? 'Operador Notificado!' : step === 'PIX_QR' ? 'Pagamento PIX' : 'Realizar Pagamento'}
        </h2>

        {isLoadingPix ? (
             <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <div>
                    <p className="text-white font-bold text-lg">Gerando Cobrança...</p>
                    <p className="text-slate-500 text-xs">Conectando ao Mercado Pago Seguro</p>
                </div>
            </div>
        ) : (
            <>
                {step === 'BILLING' && (
                    <BillingView 
                        totalToPay={options.totalToPay}
                        interestOnlyWithFees={options.renewToPay}
                        dueDateISO={options.dueDateISO}
                        daysLateRaw={options.daysLate}
                        pixKey={pixKey}
                        onCopyPix={copyPixKey}
                        onNotify={handleNotifyPayment}
                        onGeneratePixMP={handleGeneratePixMP}
                        error={error}
                    />
                )}

                {step === 'PIX_QR' && pixData && (
                    <div className="space-y-6 animate-in slide-in-from-right">
                        <div className="bg-white p-4 rounded-2xl flex justify-center">
                            <img src={`data:image/png;base64,${pixData.qr_code_base64}`} className="w-48 h-48 object-contain" alt="QR Code PIX"/>
                        </div>
                        
                        <div className="text-center">
                            <p className="text-white font-black text-2xl">{formatMoney(options.totalToPay)}</p>
                            <p className="text-slate-500 text-xs font-bold uppercase mt-1">Escaneie ou copie o código</p>
                        </div>

                        <div className="space-y-2">
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 relative group">
                                <p className="text-slate-400 text-[10px] font-mono break-all line-clamp-2">{pixData.qr_code}</p>
                            </div>
                            <button onClick={copyPixCode} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg">
                                <Copy size={16}/> Copiar Código "Copia e Cola"
                            </button>
                        </div>

                        <button onClick={() => setStep('BILLING')} className="w-full py-3 bg-slate-800 text-slate-400 hover:text-white rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2">
                            <ArrowLeft size={14}/> Voltar
                        </button>
                    </div>
                )}

                {step === 'NOTIFYING' && <NotifyingView />}

                {step === 'SUCCESS' && <SuccessView onClose={onClose} />}
            </>
        )}
      </div>
    </div>
  );
};
