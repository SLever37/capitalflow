
import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle2, Copy, Loader2, QrCode, RefreshCcw, CheckSquare, AlertTriangle, X } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Loan, Installment } from '../../../types';
import { calculateTotalDue } from '../../../domain/finance/calculations';
import { formatMoney } from '../../../utils/formatters';
import { createPixCharge } from '../../../services/pix.service';
import { supabase } from '../../../lib/supabase';

interface PortalPaymentModalProps {
    loan: Loan;
    installment: Installment;
    clientData: { name: string; email?: string; doc?: string };
    onClose: () => void;
}

type PaymentStep = 'SELECT' | 'GENERATING' | 'PAY' | 'SUCCESS';

export const PortalPaymentModal: React.FC<PortalPaymentModalProps> = ({ loan, installment, clientData, onClose }) => {
    const [step, setStep] = useState<PaymentStep>('SELECT');
    const [selectedType, setSelectedType] = useState<'RENEW_INTEREST' | 'FULL' | null>(null);
    const [pixData, setPixData] = useState<{ copyPaste: string; base64: string; amount: number; chargeId?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Cálculos em tempo real da dívida
    const debt = useMemo(() => calculateTotalDue(loan, installment), [loan, installment]);

    // Opção 1: Renovação (Juros + Multas acumuladas)
    const renewAmount = debt.interest + debt.lateFee;

    // Opção 2: Quitação (Total)
    const fullAmount = debt.total;

    // Realtime Listener para o status do pagamento
    useEffect(() => {
        if (step === 'PAY' && pixData?.chargeId) {
            const channel = supabase
                .channel(`pix-${pixData.chargeId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'payment_charges',
                        filter: `charge_id=eq.${pixData.chargeId}`
                    },
                    (payload) => {
                        const newStatus = payload.new.status;
                        if (newStatus === 'PAID') {
                            setStep('SUCCESS');
                            // Toca um som de sucesso se possível ou vibra
                            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [step, pixData?.chargeId]);

    const handleGeneratePix = async (type: 'RENEW_INTEREST' | 'FULL') => {
        setSelectedType(type);
        setStep('GENERATING');
        setError(null);

        const amount = type === 'FULL' ? fullAmount : renewAmount;

        if (amount <= 0) {
            setError("Valor inválido para pagamento.");
            setStep('SELECT');
            return;
        }

        try {
            const response = await createPixCharge({
                amount: amount,
                payer_name: clientData.name,
                payer_doc: clientData.doc,
                // Metadados cruciais para o Webhook processar depois
                loan_id: loan.id,
                installment_id: installment.id,
                profile_id: loan.profile_id, // Acesso tipado direto
                source_id: loan.sourceId,
                payment_type: type
            });

            if (!response.ok || !response.qr_code) {
                throw new Error(response.error || 'Falha ao gerar QR Code. Tente novamente.');
            }

            setPixData({
                copyPaste: response.qr_code,
                base64: response.qr_code_base64 || '',
                amount: amount,
                chargeId: response.charge_id
            });
            setStep('PAY');

        } catch (e: any) {
            setError(e.message || "Erro de conexão ao gerar PIX.");
            setStep('SELECT');
        }
    };

    const copyCode = () => {
        if (pixData?.copyPaste) {
            navigator.clipboard.writeText(pixData.copyPaste);
            alert("Código PIX copiado!");
        }
    };

    useEffect(() => {
        if (step === 'SUCCESS') {
            const timer = setTimeout(() => {
                onClose();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [step, onClose]);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2rem] p-6 shadow-2xl relative animate-in zoom-in-95">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <X size={20}/>
                </button>

                <h2 className="text-xl font-black text-white uppercase text-center mb-6 flex items-center justify-center gap-2">
                    {step === 'SUCCESS' ? <CheckCircle2 className="text-emerald-500"/> : <QrCode className="text-emerald-500"/>} 
                    {step === 'SUCCESS' ? 'Pagamento Confirmado!' : 'Pagamento PIX'}
                </h2>

                {step === 'SELECT' && (
                    <div className="space-y-4">
                        <p className="text-center text-slate-400 text-sm mb-4">Escolha como deseja realizar o pagamento:</p>
                        
                        <button 
                            onClick={() => handleGeneratePix('RENEW_INTEREST')}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-blue-500 p-5 rounded-2xl flex items-center justify-between group transition-all"
                        >
                            <div className="text-left">
                                <p className="text-xs font-black uppercase text-blue-500 mb-1 flex items-center gap-1">
                                    <RefreshCcw size={12}/> Pagar Juros (Renovar)
                                </p>
                                <p className="text-[10px] text-slate-500">Mantém o capital e posterga o vencimento.</p>
                            </div>
                            <span className="text-xl font-black text-white">{formatMoney(renewAmount)}</span>
                        </button>

                        <button 
                            onClick={() => handleGeneratePix('FULL')}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-emerald-500 p-5 rounded-2xl flex items-center justify-between group transition-all"
                        >
                            <div className="text-left">
                                <p className="text-xs font-black uppercase text-emerald-500 mb-1 flex items-center gap-1">
                                    <CheckSquare size={12}/> Quitar Contrato
                                </p>
                                <p className="text-[10px] text-slate-500">Liquida a dívida total e encerra o contrato.</p>
                            </div>
                            <span className="text-xl font-black text-white">{formatMoney(fullAmount)}</span>
                        </button>

                        {error && (
                            <div className="bg-rose-950/30 border border-rose-500/30 p-3 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
                                <AlertTriangle size={16}/> {error}
                            </div>
                        )}
                    </div>
                )}

                {step === 'GENERATING' && (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin"/>
                        <div>
                            <p className="text-white font-bold text-lg">Gerando QR Code...</p>
                            <p className="text-slate-500 text-xs">Conectando ao Mercado Pago</p>
                        </div>
                    </div>
                )}

                {step === 'PAY' && pixData && (
                    <div className="space-y-6 animate-in slide-in-from-right">
                        <div className="bg-white p-4 rounded-2xl mx-auto w-fit shadow-lg shadow-white/5">
                            {pixData.base64 ? (
                                <img src={`data:image/png;base64,${pixData.base64}`} alt="QR Code" className="w-48 h-48 mix-blend-multiply"/>
                            ) : (
                                <div className="w-48 h-48 bg-slate-200 flex items-center justify-center text-slate-400 text-xs text-center p-2">QR Code Imagem Indisponível</div>
                            )}
                        </div>

                        <div className="text-center">
                            <p className="text-slate-400 text-xs uppercase font-bold mb-1">Valor a Pagar</p>
                            <p className="text-3xl font-black text-emerald-400">{formatMoney(pixData.amount)}</p>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Pix Copia e Cola</p>
                            <div className="flex items-center gap-2">
                                <input 
                                    readOnly 
                                    value={pixData.copyPaste} 
                                    className="w-full bg-transparent text-slate-300 text-xs font-mono outline-none truncate"
                                />
                                <button onClick={copyCode} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-blue-600 transition-colors">
                                    <Copy size={14}/>
                                </button>
                            </div>
                        </div>

                        <div className="text-center bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-center gap-2 justify-center">
                            <Loader2 className="animate-spin text-blue-400" size={14} />
                            <p className="text-xs text-blue-200 leading-relaxed">
                                Aguardando confirmação automática...
                            </p>
                        </div>
                        
                        <button onClick={onClose} className="w-full py-4 text-slate-500 font-bold text-xs uppercase hover:text-white transition-colors">
                            Fechar Janela
                        </button>
                    </div>
                )}

                {step === 'SUCCESS' && (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-300">
                        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
                            <CheckCircle2 size={48} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase">Recebido!</h3>
                            <p className="text-slate-400 text-sm mt-2">O sistema processou a baixa do pagamento.</p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 w-full">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Valor Confirmado</p>
                            <p className="text-xl font-black text-emerald-400">{formatMoney(pixData?.amount)}</p>
                        </div>
                        <p className="text-[10px] text-slate-600 uppercase font-bold">Fechando em instantes...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
