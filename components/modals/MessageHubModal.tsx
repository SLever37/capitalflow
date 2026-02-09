
import React, { useState } from 'react';
import { HandCoins, CalendarClock, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { Loan } from '../../types';
import { Modal } from '../ui/Modal';
import { calculateTotalDue } from '../../domain/finance/calculations';
import { getDaysDiff } from '../../utils/dateHelpers';
import { getOrCreatePortalLink } from '../../utils/portalLink';

const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
};

export const MessageHubModal = ({ loan, client, onClose }: { loan: Loan, client?: any, onClose: () => void }) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleSend = async (type: 'WELCOME' | 'REMINDER' | 'LATE' | 'PAID') => {
        setIsGenerating(true);
        try {
            const firstName = (loan.debtorName || '').split(' ').filter(Boolean)[0] || 'Cliente';
            const greeting = getGreeting();

            // ✅ GARANTIA DE LINK ATUALIZADO:
            // Busca ou gera o token oficial no banco antes de enviar.
            // Isso evita enviar o ID bruto ou links que resultem em "Acesso Indisponível"
            const portalLink = await getOrCreatePortalLink(loan.id);

            const pendingInst = loan.installments.find(i => i.status !== 'PAID');
            
            let dateContext = '';
            let amount = '0,00';

            if (pendingInst) {
                const debt = calculateTotalDue(loan, pendingInst);
                amount = debt.total.toFixed(2).replace('.', ',');
                
                const dueDateObj = new Date(pendingInst.dueDate);
                const dateStr = dueDateObj.toLocaleDateString('pt-BR');
                const diff = getDaysDiff(pendingInst.dueDate);

                if (diff === 0) dateContext = `hoje (${dateStr})`;
                else if (diff > 0) dateContext = `dia ${dateStr} (há ${diff} dias)`;
                else dateContext = `dia ${dateStr}`;
            }

            const accessBlock = `\n\n🔒 *Acesso Seguro ao Portal:*\n${portalLink}\n\n(Clique no link para ver detalhes e comprovantes)`;

            let text = '';

            switch (type) {
                case 'WELCOME':
                    text = `*${greeting}, ${firstName}!* Seja muito bem-vindo(a)! Para facilitar sua gestão, liberamos seu acesso exclusivo ao nosso portal de transparência.` + accessBlock;
                    break;
                case 'REMINDER':
                    text = `*${greeting}, ${firstName}!* Lembrete amigo: sua parcela de *R$ ${amount}* vence *${dateContext}*.\n\nPara sua comodidade, você pode gerar o PIX direto no portal:` + accessBlock;
                    break;
                case 'LATE':
                    text = `*${greeting}, Sr(a). ${loan.debtorName}.*\n\n⚠️ *AVISO DE DÉBITO*\nConsta em nosso sistema uma pendência de *R$ ${amount}* com vencimento original no *${dateContext}*.\n\nRegularize pelo portal para evitar multas adicionais:` + accessBlock;
                    break;
                case 'PAID':
                    text = `*${greeting}, ${firstName}!*\n\nRecebemos o seu pagamento. Muito obrigado pela pontualidade! Seu recibo e o saldo atualizado já estão disponíveis no portal.` + accessBlock;
                    break;
            }

            const cleanPhone = String(loan.debtorPhone || '').replace(/\D/g, '');
            const waPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
            const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
            
            window.open(url, '_blank');
            onClose();
        } catch (e) {
            console.error("Erro ao gerar link de mensagem:", e);
            alert("Não foi possível gerar o link do portal. Verifique sua conexão.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal onClose={onClose} title="Central de Mensagens">
            {isGenerating && (
                <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2rem]">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-2" />
                    <p className="text-white font-black text-[10px] uppercase tracking-widest">Validando Link Seguro...</p>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => handleSend('WELCOME')} disabled={isGenerating} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-blue-500 transition-all text-left group disabled:opacity-50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors"><HandCoins size={20}/></div>
                        <span className="font-bold text-white uppercase text-xs">Boas Vindas</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Envia o link de acesso direto.</p>
                </button>
                <button onClick={() => handleSend('REMINDER')} disabled={isGenerating} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-amber-500 transition-all text-left group disabled:opacity-50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors"><CalendarClock size={20}/></div>
                        <span className="font-bold text-white uppercase text-xs">Lembrete Vencimento</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Aviso suave ou do dia.</p>
                </button>
                <button onClick={() => handleSend('LATE')} disabled={isGenerating} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-rose-500 transition-all text-left group disabled:opacity-50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl group-hover:bg-rose-500 group-hover:text-white transition-colors"><ShieldAlert size={20}/></div>
                        <span className="font-bold text-white uppercase text-xs">Cobrança Atraso</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Mensagem firme solicitando regularização.</p>
                </button>
                <button onClick={() => handleSend('PAID')} disabled={isGenerating} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-emerald-500 transition-all text-left group disabled:opacity-50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors"><CheckCircle2 size={20}/></div>
                        <span className="font-bold text-white uppercase text-xs">Recibo Pagamento</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Confirmação e agradecimento.</p>
                </button>
            </div>
        </Modal>
    );
};
