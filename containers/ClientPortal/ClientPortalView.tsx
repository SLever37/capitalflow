
import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  BellRing,
  RefreshCw as LoadIcon,
  FileSignature,
  X,
  Lock,
  Gavel
} from 'lucide-react';

import { useClientPortalLogic } from '../../features/portal/hooks/useClientPortalLogic';
import { usePortalClientNotifications } from '../../features/portal/hooks/usePortalClientNotifications';
import { PortalPaymentModal } from '../../features/portal/components/PortalPaymentModal';
import { PortalChatDrawer } from '../../features/portal/components/PortalChatDrawer';
import { resolveDebtSummary } from '../../features/portal/mappers/portalDebtRules';

// Novos Componentes Modulares
import { PortalHeader } from './components/PortalHeader';
import { PortalSummaryCard } from './components/PortalSummaryCard';
import { PortalActions } from './components/PortalActions';
import { PortalContractItem } from './components/PortalContractItem';
import { PortalCreditorInfo } from './components/PortalCreditorInfo';

interface ClientPortalViewProps {
  initialPortalToken: string;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({ initialPortalToken }) => {
  const {
    isLoading,
    portalError,
    loggedClient,
    clientContracts,
    loadFullPortalData,
    handleSignDocument,
    isSigning
  } = useClientPortalLogic(initialPortalToken);

  const [activeLoanForPayment, setActiveLoanForPayment] = useState<any>(null);
  const [activeLoanForChat, setActiveLoanForChat] = useState<any>(null);
  const [isLegalOpen, setIsLegalOpen] = useState(false);

  // --- RESUMO GLOBAL DO CLIENTE ---
  const globalSummary = useMemo(() => {
      let total = 0;
      let lateCount = 0;
      let maxLate = 0;

      clientContracts.forEach(c => {
          const sum = resolveDebtSummary(c, c.installments);
          total += sum.totalDue;
          if (sum.hasLateInstallments) {
              lateCount++;
              if (sum.maxDaysLate > maxLate) maxLate = sum.maxDaysLate;
          }
      });

      return { total, lateCount, maxLate };
  }, [clientContracts]);

  const alertTheme = globalSummary.lateCount > 0;

  // Notificações Baseadas no Global
  const clientNotification = usePortalClientNotifications(initialPortalToken, { 
    overdueCount: globalSummary.lateCount, 
    maxDaysLate: globalSummary.maxLate, 
    nextDueDate: null // Global não tem nextDueDate único relevante
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 gap-4">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest animate-pulse">Acessando Portal...</p>
      </div>
    );
  }

  if (portalError || !loggedClient) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center">
            <ShieldCheck size={48} className="mx-auto text-rose-500 mb-4" />
            <h2 className="text-white font-black text-xl mb-2">Acesso Indisponível</h2>
            <p className="text-slate-400 text-sm mb-4">{portalError || "Link inválido ou expirado."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center p-0 sm:p-4 overflow-hidden">
      
      {/* NOTIFICAÇÃO TOAST */}
      {clientNotification && clientNotification.show && (
          <div className="fixed top-6 left-4 right-4 z-[200] animate-in slide-in-from-top-6 duration-500 pointer-events-none">
             <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border-l-4 border-rose-500 flex items-start gap-3 max-w-sm mx-auto pointer-events-auto ring-1 ring-white/10">
                <div className="p-2 bg-rose-500/10 rounded-full text-rose-500 shrink-0">
                    <BellRing size={18} className="animate-pulse"/>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white mb-1">Aviso Importante</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{clientNotification.message}</p>
                </div>
             </div>
          </div>
      )}

      <div className="w-full max-w-lg bg-slate-900 sm:rounded-[2.5rem] flex flex-col h-full sm:h-[90vh] sm:border border-slate-800 shadow-2xl overflow-hidden relative">
        
        {/* Adicionado checagem loggedClient para segurança */}
        {loggedClient && (
            <PortalHeader 
                loggedClient={loggedClient} 
                handleLogout={() => window.location.href = '/'} 
            />
        )}

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6 relative">
            
            {/* Efeito Background Alerta */}
            {alertTheme && <div className="absolute top-0 right-0 w-full h-64 bg-rose-900/10 blur-[80px] pointer-events-none"></div>}

            <PortalSummaryCard 
                summary={globalSummary} 
                contractCount={clientContracts.length} 
            />

            <PortalActions onOpenLegal={() => setIsLegalOpen(true)} />

            {/* LISTA DE CONTRATOS */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Seus Contratos</h3>
                {clientContracts.length === 0 ? (
                    <div className="text-center py-10 text-slate-600 text-xs font-bold uppercase border-2 border-dashed border-slate-800 rounded-2xl">
                        Nenhum contrato ativo encontrado.
                    </div>
                ) : (
                    clientContracts.map(contract => (
                        <PortalContractItem 
                            key={contract.id} 
                            loan={contract}
                            onPay={() => setActiveLoanForPayment(contract)}
                            onChat={() => setActiveLoanForChat(contract)}
                        />
                    ))
                )}
            </div>
            
            {clientContracts.length > 0 && (
                <PortalCreditorInfo 
                    creditorName={(clientContracts[0] as any).creditorName || 'Empresa'} 
                />
            )}
        </div>
      </div>

      {/* MODAL PAGAMENTO */}
      {activeLoanForPayment && loggedClient && (
          <PortalPaymentModal 
              loan={activeLoanForPayment} 
              installment={activeLoanForPayment.installments.find((i:any) => i.status!=='PAID') || activeLoanForPayment.installments[0]} 
              clientData={{ name: loggedClient.name, doc: loggedClient.document, id: loggedClient.id, email: loggedClient.email }} 
              onClose={() => { setActiveLoanForPayment(null); loadFullPortalData(); }} 
          />
      )}

      {/* DRAWER CHAT */}
      <PortalChatDrawer 
          loan={activeLoanForChat} 
          client={loggedClient}
          isOpen={!!activeLoanForChat} 
          onClose={() => setActiveLoanForChat(null)} 
      />

      {/* MODAL JURÍDICO */}
      {isLegalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[150] p-4 backdrop-blur-sm">
          <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-indigo-500/30 max-w-lg w-full shadow-2xl animate-in zoom-in-95 relative">
            <button onClick={() => setIsLegalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={18}/></button>
            <div className="flex flex-col items-center text-center py-6">
                <Lock size={40} className="text-indigo-500 mb-4"/>
                <h2 className="text-white font-black uppercase text-lg mb-2">Central Jurídica</h2>
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 w-full mb-6">
                    <Gavel className="mx-auto text-indigo-400 mb-2" size={24}/>
                    <h4 className="text-white font-bold text-sm uppercase">Assinatura Pendente</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Seus contratos estão disponíveis para regularização.</p>
                </div>
                <button onClick={() => handleSignDocument('CONFISSAO')} disabled={isSigning} className="w-full p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs flex justify-center gap-2 items-center">
                    {isSigning ? <LoadIcon className="animate-spin" size={16}/> : <><FileSignature size={16}/> Assinar Digitalmente</>}
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
