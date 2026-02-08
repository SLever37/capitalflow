
import React from 'react';
import { CheckCircle2, Copy, Loader2, QrCode, AlertTriangle, Wallet, CreditCard, MessageSquare } from 'lucide-react';
import { formatMoney } from '../../../../utils/formatters';

// VIEW: BILLING (Tela Principal)
interface BillingViewProps {
    totalToPay: number;
    interestOnlyWithFees: number;
    isLate: boolean;
    daysLate: number;
    pixKey: string;
    onCopyPix: () => void;
    onNotify: () => void;
    error: string | null;
}

export const BillingView: React.FC<BillingViewProps> = ({
    totalToPay, interestOnlyWithFees, isLate, daysLate, pixKey, onCopyPix, onNotify, error
}) => (
    <div className="space-y-6">
        <div className="text-center space-y-1">
            <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Valor Total Atualizado</p>
            <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-black text-white tracking-tight">{formatMoney(totalToPay)}</span>
            </div>

            {isLate && (
                <div className="flex flex-col items-center gap-1 mt-2">
                    <p className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full">
                        Vencido há {daysLate} dias (+ Taxas e Multas inclusas)
                    </p>
                    <p className="text-[10px] text-slate-500">
                        Renovação (Juros+Taxas): <b>{formatMoney(interestOnlyWithFees)}</b>
                    </p>
                </div>
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
            <button
                onClick={onNotify}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                <CheckCircle2 size={16} /> Informar Pagamento Realizado
            </button>

            <div className="grid grid-cols-2 gap-3 opacity-60">
                <button disabled className="bg-slate-800 border border-slate-700 text-slate-500 p-3 rounded-xl flex flex-col items-center gap-1 cursor-not-allowed">
                    <QrCode size={16} />
                    <span className="text-[8px] font-black uppercase text-center">Pagamento via PIX<br />automático (Em Breve)</span>
                </button>
                <button disabled className="bg-slate-800 border border-slate-700 text-slate-500 p-3 rounded-xl flex flex-col items-center gap-1 cursor-not-allowed">
                    <CreditCard size={16} />
                    <span className="text-[8px] font-black uppercase text-center">Pagar com cartão<br />de crédito (Em Construção)</span>
                </button>
            </div>
        </div>

        {error && (
            <div className="bg-rose-950/30 border border-rose-500/30 p-3 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
                <AlertTriangle size={16} /> {error}
            </div>
        )}

        <div className="pt-4 border-t border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                <MessageSquare size={12} /> Em caso de dúvidas, você pode chamar nossa equipe diretamente no Chat.
            </p>
        </div>
    </div>
);

// VIEW: NOTIFYING (Loading)
export const NotifyingView = () => (
    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
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
