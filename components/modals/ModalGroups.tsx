
import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import { Modal } from '../ui/Modal';
import { PaymentManagerModal } from './PaymentManagerModal';
import { ClientFormModal } from './ClientFormModal';
import { SourceFormModal } from './SourceFormModal';
import { Loan } from '../../types';
import { parseCurrency } from '../../utils/formatters';

export const ClientModals = () => {
    const { activeModal, closeModal, ui, clientCtrl } = useModal();
    if (activeModal?.type !== 'CLIENT_FORM') return null;

    return (
       <ClientFormModal onClose={closeModal} ui={ui} clientCtrl={clientCtrl} />
    );
};

export const FinanceModals = () => {
    const { activeModal, closeModal, ui, sourceCtrl, paymentCtrl, activeUser, sources } = useModal();

    return (
        <>
            {activeModal?.type === 'SOURCE_FORM' && (
                <SourceFormModal onClose={closeModal} ui={ui} sourceCtrl={sourceCtrl} activeUser={activeUser} />
            )}

            {activeModal?.type === 'ADD_FUNDS' && (
                <Modal onClose={closeModal} title={`Aporte: ${activeModal.payload.name}`}>
                    <div className="space-y-4">
                        <input type="text" inputMode="decimal" placeholder="Valor (R$)" className="w-full bg-slate-950 p-4 rounded-xl text-white text-xl font-bold outline-none border border-slate-800" value={ui.addFundsValue} onChange={e => ui.setAddFundsValue(e.target.value.replace(/[^0-9.,]/g, ''))} autoFocus />
                        <button onClick={sourceCtrl.handleAddFunds} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl uppercase">Confirmar Aporte</button>
                    </div>
                </Modal>
            )}

            {activeModal?.type === 'PAYMENT' && ui.paymentModal && (
                <PaymentManagerModal data={ui.paymentModal} onClose={closeModal} isProcessing={ui.isProcessingPayment} paymentType={ui.paymentType} setPaymentType={ui.setPaymentType} avAmount={ui.avAmount} setAvAmount={ui.setAvAmount} onConfirm={paymentCtrl.handlePayment} onOpenMessage={(l: any) => { ui.setMessageModalLoan(l); ui.openModal('MESSAGE_HUB'); }} />
            )}

            {activeModal?.type === 'WITHDRAW' && activeUser && (
                <Modal onClose={closeModal} title="Resgatar Lucros">
                    <div className="space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center"><p className="text-xs text-slate-500 uppercase font-bold">Disponível para Saque</p><p className="text-2xl font-black text-emerald-400">R$ {activeUser.interestBalance.toFixed(2)}</p></div>
                        <input type="text" inputMode="decimal" placeholder="Valor do Resgate" className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={ui.withdrawValue} onChange={e => ui.setWithdrawValue(e.target.value.replace(/[^0-9.,]/g, ''))} />
                        <select className="w-full bg-slate-950 p-4 rounded-xl text-white outline-none border border-slate-800" value={ui.withdrawSourceId} onChange={e => ui.setWithdrawSourceId(e.target.value)}>
                            <option value="">Selecione o destino...</option>
                            <option value="EXTERNAL_WITHDRAWAL">Saque Externo</option>
                            {sources.map((s: any) => <option key={s.id} value={s.id}>Reinvestir em: {s.name}</option>)}
                        </select>
                        <button onClick={sourceCtrl.handleWithdrawProfit} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl uppercase">Confirmar Resgate</button>
                    </div>
                </Modal>
            )}
        </>
    );
};
