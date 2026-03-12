import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, X } from 'lucide-react';
import { Loan, CapitalSource } from '../../types';
import { getDaysDiff } from '../../utils/dateHelpers';
import { motion, AnimatePresence } from 'motion/react';

export const DashboardAlerts = ({ loans, sources }: { loans: Loan[]; sources?: CapitalSource[] }) => {
  const activeLoans = loans.filter((l) => !l.isArchived);
  const critical = activeLoans.filter((l) =>
    l.installments.some((i) => getDaysDiff(i.dueDate) > 30 && i.status !== 'PAID')
  ).length;

  // Alerta de Saldo Baixo (< R$ 100,00)
  const lowBalanceSources = (sources || []).filter((s) => s.balance < 100);

  // Lógica de Dispensa (24h)
  const [isDismissed, setIsDismissed] = useState(() => {
    const stored = localStorage.getItem('cm_alert_critical_dismissed');
    if (!stored) return false;
    const timestamp = Number(stored);
    const now = Date.now();
    return now - timestamp < 86400000;
  });

  const [isBalanceDismissed, setIsBalanceDismissed] = useState(() => {
    const stored = localStorage.getItem('cm_alert_balance_dismissed');
    if (!stored) return false;
    const timestamp = Number(stored);
    const now = Date.now();
    return now - timestamp < 86400000;
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('cm_alert_critical_dismissed', String(Date.now()));
  };

  const handleDismissBalance = () => {
    setIsBalanceDismissed(true);
    localStorage.setItem('cm_alert_balance_dismissed', String(Date.now()));
  };

  if ((critical === 0 || isDismissed) && (lowBalanceSources.length === 0 || isBalanceDismissed)) return null;

  return (
    <div className="space-y-4 mb-6 overflow-hidden">
      <AnimatePresence>
        {critical > 0 && !isDismissed && (
          <motion.div
            initial={{ rotateX: 90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.x > 100 || offset.x < -100 || velocity.x > 500 || velocity.x < -500) {
                handleDismiss();
              }
            }}
            className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-4 relative pr-10 cursor-grab active:cursor-grabbing"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-rose-400/50 hover:text-white transition-colors p-1.5 rounded-full hover:bg-rose-500/20"
              title="Fechar por 24h"
            >
              <X size={16} />
            </button>

            <div className="p-3 bg-rose-500 rounded-xl text-white shadow-lg shadow-rose-900/20 flex-shrink-0 animate-pulse">
              <ShieldAlert size={24} />
            </div>

            <div>
              <p className="text-white font-bold text-sm uppercase">Atenção Necessária</p>
              <p className="text-rose-400 text-xs font-medium">
                {critical} contratos com atraso crítico superior a 30 dias.
              </p>
            </div>
          </motion.div>
        )}

        {lowBalanceSources.length > 0 && !isBalanceDismissed && (
          <motion.div
            initial={{ rotateX: 90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.x > 100 || offset.x < -100 || velocity.x > 500 || velocity.x < -500) {
                handleDismissBalance();
              }
            }}
            className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4 relative pr-10 cursor-grab active:cursor-grabbing"
          >
            <button
              onClick={handleDismissBalance}
              className="absolute top-3 right-3 text-amber-400/50 hover:text-white transition-colors p-1.5 rounded-full hover:bg-amber-500/20"
              title="Fechar por 24h"
            >
              <X size={16} />
            </button>

            <div className="p-3 bg-amber-500 rounded-xl text-black shadow-lg shadow-amber-900/20 flex-shrink-0">
              <AlertTriangle size={24} />
            </div>

            <div>
              <p className="text-white font-bold text-sm uppercase">Saldo Baixo</p>
              <p className="text-amber-400 text-xs font-medium">
                {lowBalanceSources.length === 1
                  ? `A fonte "${lowBalanceSources[0].name}" está quase zerada.`
                  : `${lowBalanceSources.length} fontes estão com saldo crítico (< R$ 100).`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};