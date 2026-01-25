
import React from 'react';
import { Settings, HandCoins, CheckCircle2, Undo2 } from 'lucide-react';
import { LedgerEntry, Loan } from '../../../types';
import { humanizeAuditLog } from '../../../utils/auditHelpers';
import { formatMoney } from '../../../utils/formatters';

interface LedgerListProps {
    ledger: LedgerEntry[];
    loan: Loan;
    onReverseTransaction: (t: LedgerEntry, l: Loan) => void;
    isStealthMode?: boolean;
}

const LedgerItem: React.FC<{ t: LedgerEntry, loan: Loan, onReverse: (t: LedgerEntry, l: Loan) => void, isStealth: boolean }> = ({ t, loan, onReverse, isStealth }) => {
    const isAudit = t.category === 'AUDIT' || t.notes?.startsWith('{');
    const auditLines = isAudit ? humanizeAuditLog(t.notes || '') : null;
    const isReversible = !isAudit && (t.type.includes('PAYMENT') || t.type === 'LEND_MORE');
    const isAgreementPayment = t.type === 'AGREEMENT_PAYMENT';

    return (
      <div className="flex flex-col border-b border-slate-800/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0 group">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${t.type === 'ADJUSTMENT' ? 'bg-indigo-500/10 text-indigo-400' : t.type === 'LEND_MORE' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              {t.type === 'ADJUSTMENT' ? <Settings size={12} /> : t.type === 'LEND_MORE' ? <HandCoins size={12} /> : <CheckCircle2 size={12} />}
            </div>
            <div>
              <p className="text-white font-bold">
                  {isAgreementPayment ? 'Pagamento de Acordo' : isAudit ? 'Edição Manual' : (t.notes || (t.type === 'LEND_MORE' ? 'Empréstimo' : 'Pagamento'))}
              </p>
              <p className="text-[9px] text-slate-500">{new Date(t.date).toLocaleDateString()} às {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isAudit && (
                <span className={`font-black ${t.type === 'LEND_MORE' ? 'text-rose-500' : 'text-emerald-500'}`}>
                {t.type === 'LEND_MORE' ? '-' : '+'} {formatMoney(t.amount, isStealth)}
                </span>
            )}
            {isReversible && !isAgreementPayment && (
                <button onClick={(e) => { e.stopPropagation(); onReverse(t, loan); }} className="p-1.5 bg-slate-800 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Estornar (Desfazer) Lançamento">
                    <Undo2 size={12}/>
                </button>
            )}
          </div>
        </div>
        {auditLines && (
          <div className="mt-2 ml-7 pl-2 border-l border-slate-800 space-y-1">
            {auditLines.map((line, idx) => (
              <p key={idx} className="text-[9px] text-slate-400 leading-tight italic">• {line}</p>
            ))}
          </div>
        )}
      </div>
    );
};

export const LedgerList: React.FC<LedgerListProps> = ({ ledger, loan, onReverseTransaction, isStealthMode }) => {
    return (
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {ledger.length > 0 ? (
                ledger.map(t => (
                    <LedgerItem 
                        key={t.id} 
                        t={t} 
                        loan={loan} 
                        onReverse={onReverseTransaction} 
                        isStealth={!!isStealthMode} 
                    />
                ))
            ) : (
                <p className="text-[10px] text-slate-600 text-center italic py-4">Nenhuma transação registrada.</p>
            )}
        </div>
    );
};
