
import React from 'react';
import { CheckCircle2, Copy, Loader2, QrCode, AlertTriangle, Wallet, CreditCard, MessageSquare, Clock, Calendar, Loader } from 'lucide-react';
import { formatMoney } from '../../../../utils/formatters';
import { getPortalDueLabel } from '../../mappers/portalDebtRules';

// VIEW: BILLING (Tela Principal)
interface BillingViewProps {
    totalToPay: number;
    interestOnlyWithFees: number;
    // Removed raw isLate/daysLate to use dueDateISO for precise calculation
    dueDateISO: string; 
    daysLateRaw: number; // Still needed for internal calc but label logic is delegated
    pixKey: string;
    onCopyPix: () => void;
    onNotify: () => void;
    error: string | null;
    isInstallmentPaid?: boolean;
    isProcessing?: boolean;
}

export const BillingView: React.FC<BillingViewProps> = ({
    totalToPay, interestOnlyWithFees, dueDateISO, daysLateRaw, pixKey, onCopyPix, onNotify, error, isInstallmentPaid = false, isProcessing = false
}) => {
    // Usa o helper centralizado para determinar a mensagem
    const { label, variant, detail } = getPortalDueLabel(daysLateRaw, dueDateISO);

    // Define cores baseadas no status
    let statusBg = "bg-slate-800";
    let statusText = "text-slate-400";
    let Icon = Calendar;

    if (variant === 'OVERDUE') {
        statusBg = "bg-rose-500/10 border-rose-500/20";
        statusText = "text-rose-500";
        Icon = AlertTriangle;
    } else if (variant === 'DUE_TODAY') {
        statusBg = "bg-amber-500/10 border-amber-500/20 animate-pulse";
        statusText = "text-amber-500";
        Icon = Clock;
    } else if (variant === 'DUE_SOON') {
        statusBg = "bg-blue-500/10 border-blue-500/20";
        statusText = "text-blue-400";
        Icon = Calendar;
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-1">
                <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Valor Total Atualizado</p>
                <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-black text-white tracking-tight">{formatMoney(totalToPay)}</span>
                </div>

                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mt-2 ${statusBg}`}>
                    <Icon size={12} className={statusText}/>
                    <p className={`text-[10px] font-black uppercase ${statusText}`}>
                        {label} {detail && <span className="opacity-70 font-medium normal-case ml-1">{detail}</span>}
                    </p>
                </div>

                {variant === 'OVERDUE' && (
                    <p className="text-[10px] text-slate-500 mt-1">
                        Renovação (Juros+Taxas): <b>{formatMoney(interestOnlyWithFees)}</b>
                    </p>
                )}
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1">
                        <QrCode size={12} /> PIX Convencional
                    </p>
                    <span className="text-[9px] text-slate-500 font-bold">Copie a chave abaixo</span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-white text-xs font-mono font-bold truncate pr-8">
                            {pixKey || "Chave não cadastrada"}
                        </p>
                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-900 to-transparent"></div>
                    </div>

                    <button
                        onClick={onCopyPix}
                        disabled={!pixKey}
                        className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                        title="Copiar Chave"
                    >
                        <Copy size={18} />
                    </button>
                </div>

                <p className="text-[10px] text-slate-500 mt-3 leading-relaxed text-center">
                    Utilize o aplicativo do seu banco para transferir o valor exato para a chave acima.
                </p>
            </div>

            <div className="space-y-3">
                {isInstallmentPaid ? (
                    <div className="w-full bg-slate-800 text-slate-400 p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 cursor-not-allowed">
                        <CheckCircle2 size={16} className="text-emerald-500" /> Parcela Quitada
                    </div>
                ) : (
                    <button
                        onClick={onNotify}
                        disabled={isProcessing}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white p-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <><Loader2 size={16} className="animate-spin" /> Processando...</>
                        ) : (
                            <><CheckCircle2 size={16} /> Informar Pagamento Realizado</>
                        )}
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-rose-950/30 border border-rose-500/30 p-3 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

            <div className="pt-4 border-t border-slate-800 text-center">
                <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                    <MessageSquare size={12} /> Em caso de dúvidas, utilize o Chat Seguro.
                </p>
            </div>
        </div>
    );
};

// VIEW: NOTIFYING (Loading)
export const NotifyingView = () => (
    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        <div>
            <p className="text-white font-bold text-lg">Processando...</p>
            <p className="text-slate-500 text-xs">Enviando notificação ao gestor</p>
        </div>
    </div>
);

// VIEW: SUCCESS
export const SuccessView = ({ onClose }: { onClose: () => void }) => (
    <div className="py-8 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-300">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
            <CheckCircle2 size={48} />
        </div>
        <div>
            <h3 className="text-2xl font-black text-white uppercase">Aviso Enviado!</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">
                O gestor foi notificado do seu pagamento. Aguarde a confirmação da baixa no sistema.
            </p>
        </div>
        <button onClick={onClose} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase rounded-xl transition-colors">
            Fechar Janela
        </button>
    </div>
);
