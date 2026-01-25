
import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import { Modal } from '../ui/Modal';
import { PaymentManagerModal } from './PaymentManagerModal';
import { CalculatorModal } from './CalculatorModal';
import { AgendaModal } from './AgendaModal';
import { FlowModal } from './FlowModal';
import { ReceiptModal } from './ReceiptModal';
import { MessageHubModal } from './MessageHubModal';
import { AIAssistantModal } from './AIAssistantModal';
import { Copy } from 'lucide-react';
import { Loan, Installment, AgreementInstallment } from '../../types';

// --- WRAPPERS DE SEGURANÇA (MOVE-ONLY + GUARDS) ---

export const PaymentModalWrapper = () => {
    const { ui, closeModal, paymentCtrl } = useModal();
    // Guard: Só renderiza se houver dados completos
    if (!ui.paymentModal || !ui.paymentModal.loan || !ui.paymentModal.inst) return null;

    return (
        <PaymentManagerModal 
            data={ui.paymentModal} 
            onClose={closeModal} 
            isProcessing={ui.isProcessingPayment} 
            paymentType={ui.paymentType} 
            setPaymentType={ui.setPaymentType} 
            avAmount={ui.avAmount} 
            setAvAmount={ui.setAvAmount} 
            onConfirm={paymentCtrl.handlePayment} 
            onOpenMessage={(l: Loan) => { ui.setMessageModalLoan(l); ui.openModal('MESSAGE_HUB'); }} 
        />
    );
};

export const ConfirmationModalWrapper = () => {
    const { ui, closeModal, loanCtrl } = useModal();
    if (!ui.confirmation) return null;

    return (
       <Modal onClose={closeModal} title="Confirmação">
           <div className="space-y-4 text-center">
               <p className="text-white text-lg font-bold">{ui.confirmation.title || 'Tem certeza?'}</p>
               <p className="text-slate-400 text-sm">{ui.confirmation.message || 'Essa ação não pode ser desfeita facilmente.'}</p>
               {ui.confirmation.showRefundOption && (
                   <div className="flex items-center justify-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                       <input type="checkbox" id="refundCheck" checked={ui.refundChecked} onChange={e => ui.setRefundChecked(e.target.checked)} className="w-5 h-5 accent-emerald-500" />
                       <label htmlFor="refundCheck" className="text-sm text-slate-300 font-bold select-none">Devolver capital para a Fonte?</label>
                   </div>
               )}
               <div className="flex gap-4 pt-2">
                   <button onClick={closeModal} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase">Cancelar</button>
                   <button onClick={loanCtrl.executeConfirmation} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold uppercase">Confirmar</button>
               </div>
           </div>
       </Modal>
    );
};

export const ReceiptModalWrapper = () => {
    const { ui, closeModal, activeUser } = useModal();
    if (!ui.showReceipt || !activeUser) return null;

    // Type guard para garantir compatibilidade
    const receiptData: {loan: Loan, inst: Installment, amountPaid: number, type: string} = {
        loan: ui.showReceipt.loan,
        inst: ui.showReceipt.inst as Installment, // Cast seguro pois ReceiptModal trata
        amountPaid: ui.showReceipt.amountPaid,
        type: ui.showReceipt.type
    };

    return (
        <ReceiptModal 
            data={receiptData} 
            onClose={closeModal} 
            userName={activeUser.businessName || activeUser.name || 'Empresa'} 
            userDoc={activeUser.document} 
        />
    );
};

export const MessageHubWrapper = () => {
    const { ui, closeModal, clients } = useModal();
    if (!ui.messageModalLoan) return null;
    
    // Busca segura do cliente
    const client = clients.find((c: any) => c.id === ui.messageModalLoan?.clientId);

    return (
        <MessageHubModal 
            loan={ui.messageModalLoan} 
            client={client} 
            onClose={closeModal} 
        />
    );
};

export const DonateModalWrapper = () => {
    const { closeModal, showToast } = useModal();
    const pixCopiaCola = "00020126580014br.gov.bcb.pix0136d8135204-13f6-483b-90c9-fb530257d7b55204000053039865802BR5925MANOEL SOCRATES COSTA LEV6011Itacoatiara6211050726f78796304E08B";

    return (
        <Modal onClose={closeModal} title="Apoiar o Projeto">
            <div className="space-y-6 text-center">
                <div className="bg-emerald-950/30 p-4 rounded-2xl border border-emerald-500/30">
                    <p className="text-emerald-400 font-bold uppercase text-xs tracking-widest mb-2">Pix Copia e Cola</p>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative group cursor-pointer" onClick={() => { navigator.clipboard.writeText(pixCopiaCola); showToast('Código Pix copiado!', 'success'); }}>
                        <p className="text-[10px] text-slate-400 font-mono break-all line-clamp-4">{pixCopiaCola}</p>
                        <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                            <span className="text-white font-bold text-xs flex items-center gap-2"><Copy size={14}/> Copiar</span>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export const AgendaWrapper = ({ onSystemAction }: { onSystemAction: any }) => {
    const { closeModal, activeUser } = useModal();
    return <AgendaModal onClose={closeModal} activeUser={activeUser} onSystemAction={onSystemAction} />;
};

export const FlowWrapper = () => {
    const { closeModal, activeUser, loans } = useModal();
    if (!activeUser) return null;
    return <FlowModal onClose={closeModal} loans={loans} profit={activeUser.interestBalance} />;
};

export const CalculatorWrapper = () => {
    const { closeModal } = useModal();
    return <CalculatorModal onClose={closeModal} />;
};

export const AIWrapper = () => {
    const { closeModal, aiCtrl, loans, sources, activeUser } = useModal();
    return (
       <AIAssistantModal 
            onClose={closeModal} 
            onCommandDetected={aiCtrl.handleAICommand}
            loans={loans}
            sources={sources}
            activeUser={activeUser}
       />
    );
};

export const NoteWrapper = () => {
    const { closeModal, ui, loanCtrl } = useModal();
    if (!ui.noteModalLoan) return null;
    
    return (
       <Modal onClose={closeModal} title="Anotações do Contrato">
           <div className="space-y-4">
               <textarea className="w-full h-40 bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800 resize-none" placeholder="Escreva observações aqui..." value={ui.noteText} onChange={e => ui.setNoteText(e.target.value)}></textarea>
               <button onClick={loanCtrl.handleSaveNote} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl uppercase">Salvar Anotação</button>
           </div>
       </Modal>
    );
};
