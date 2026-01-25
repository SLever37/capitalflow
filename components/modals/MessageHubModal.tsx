import React from 'react';
import { HandCoins, CalendarClock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Loan } from '../../types';
import { Modal } from '../ui/Modal';
import { calculateTotalDue } from '../../domain/finance/calculations';

export const MessageHubModal = ({ loan, client, onClose }: { loan: Loan, client?: any, onClose: () => void }) => {
    const handleSend = (type: 'WELCOME' | 'REMINDER' | 'LATE' | 'PAID') => {
        const firstName = (loan.debtorName || '').split(' ').filter(Boolean)[0] || 'Cliente';

        const clientCode = String(client?.access_code || client?.accessCode || '').padStart(4, '0') || '----';
        const clientNumber = String(client?.client_number || client?.clientNumber || '').trim();
        const clientDoc = String(loan.debtorDocument || client?.document || client?.cpf || client?.cnpj || '').trim();

        const portalLink = `${window.location.origin}/?portal=${loan.id}`;

        const pendingInst = loan.installments.find(i => i.status !== 'PAID');
        const nextDate = pendingInst ? new Date(pendingInst.dueDate).toLocaleDateString('pt-BR') : 'Finalizado';
        const amount = pendingInst ? calculateTotalDue(loan, pendingInst).total.toFixed(2) : '0,00';

        const loginLine = clientDoc
          ? `Login: *${clientDoc}* + Código *${clientCode}*${clientNumber ? ` (ou Nº Cliente *${clientNumber}* + Código)` : ''}`
          : `Login: Código *${clientCode}*${clientNumber ? ` (ou Nº Cliente *${clientNumber}* + Código)` : ''}`;

        const portalBlock = `\n\n🔗 Portal: ${portalLink}\n🔐 Código do cliente: *${clientCode}*\n${loginLine}`;

        let text = '';

        switch (type) {
            case 'WELCOME':
                text =
                  `Olá *${firstName}*!\n\n` +
                  `Seu acesso ao portal foi criado.\n` +
                  `Quando precisar, use o portal para ver seus contratos e enviar comprovantes.` +
                  portalBlock;
                break;
            case 'REMINDER':
                text =
                  `Olá *${firstName}*!\n\n` +
                  `Lembrete: existe uma parcela no valor de *R$ ${amount}* com vencimento em *${nextDate}*.\n` +
                  `Se já pagou, pode enviar o comprovante pelo portal.` +
                  portalBlock;
                break;
            case 'LATE':
                text =
                  `⚠️ *AVISO DE COBRANÇA*\n\n` +
                  `Sr(a). *${loan.debtorName}*.\n\n` +
                  `Consta em aberto a parcela de *R$ ${amount}* com vencimento em *${nextDate}*.\n\n` +
                  `Solicitamos a regularização.` +
                  portalBlock;
                break;
            case 'PAID':
                text =
                  `Olá *${firstName}*!\n\n` +
                  `Confirmamos o recebimento do seu pagamento.\n\n` +
                  `Obrigado!` +
                  portalBlock;
                break;
        }

        const cleanPhone = String(loan.debtorPhone || '').replace(/\D/g, '');
        const waPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        onClose();
    };

    return (
        <Modal onClose={onClose} title="Central de Mensagens">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => handleSend('WELCOME')} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-blue-500 transition-all text-left group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors"><HandCoins size={20}/></div>
                        <span className="font-bold text-white uppercase text-xs">Boas Vindas</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Inclui portal + código do cliente.</p>
                </button>
                <button onClick={() => handleSend('REMINDER')} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-amber-500 transition-all text-left group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors"><CalendarClock size={20}/></div>
                        <span className="font-bold text-white uppercase text-xs">Lembrete Vencimento</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Com link do portal + login.</p>
                </button>
                <button onClick={() => handleSend('LATE')} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-rose-500 transition-all text-left group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl group-hover:bg-rose-500 group-hover:text-white transition-colors"><ShieldAlert size={20}/></div>
                        <span className="font-bold text-white uppercase text-xs">Cobrança Atraso</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Mensagem firme com portal + código.</p>
                </button>
                <button onClick={() => handleSend('PAID')} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-emerald-500 transition-all text-left group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors"><CheckCircle2 size={20}/></div>
                        <span className="font-bold text-white uppercase text-xs">Recibo Pagamento</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Confirmação com login do portal.</p>
                </button>
            </div>
        </Modal>
    );
};