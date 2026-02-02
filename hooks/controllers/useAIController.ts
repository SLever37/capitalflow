
import { Loan, Client } from '../../types';
import { calculateTotalDue } from '../../domain/finance/calculations';
import { generateUniqueAccessCode, generateUniqueClientNumber } from '../../utils/generators';

export const useAIController = (
    loans: Loan[],
    clients: Client[],
    ui: any,
    showToast: (msg: string, type?: 'success'|'error'|'info') => void
) => {

    const handleAICommand = (result: any) => {
        const { intent, data } = result;

        if (intent === 'ANALYZE_PORTFOLIO') {
            return;
        }

        if (intent === 'REGISTER_CLIENT') {
            ui.setEditingClient(null);
            
            const codes = new Set((clients || []).map(c => String((c as any).access_code || '').trim()).filter(Boolean));
            const nums = new Set((clients || []).map(c => String((c as any).client_number || '').trim()).filter(Boolean));
            ui.setClientDraftAccessCode(generateUniqueAccessCode(codes));
            ui.setClientDraftNumber(generateUniqueClientNumber(nums));

            ui.setClientForm({
                name: data.name || '',
                phone: data.phone || '',
                document: '',
                email: '',
                address: '',
                city: '',
                state: '',
                notes: 'Adicionado via Assistente IA'
            });
            ui.openModal('CLIENT_FORM');
        } 
        else if (intent === 'REGISTER_PAYMENT') {
            if (!data.name) { showToast("Não consegui identificar o nome do cliente na sua fala.", "error"); return; }
            
            const targetName = data.name.toLowerCase();
            const loan = loans.find(l => 
                (l.debtorName || '').toLowerCase().includes(targetName) && !l.isArchived
            );

            if (loan) {
                const inst = loan.installments.find(i => i.status !== 'PAID');
                if (inst) {
                    const calcs = calculateTotalDue(loan, inst);
                    ui.setPaymentModal({ loan, inst, calculations: calcs });
                    ui.openModal('PAYMENT');
                    
                    if (data.amount) {
                        if (Math.abs(data.amount - calcs.interest) < 5) {
                            ui.setPaymentType('RENEW_INTEREST');
                        } else {
                            if (data.amount >= calcs.total) ui.setPaymentType('FULL');
                            else {
                                ui.setPaymentType('RENEW_AV');
                                ui.setAvAmount(String(data.amount - calcs.interest));
                            }
                        }
                    }
                } else {
                    showToast("Este contrato já consta como quitado.", "info");
                }
            } else {
                showToast(`Não encontrei nenhum contrato ativo para "${data.name}".`, "error");
            }
        }
        else if (intent === 'ADD_REMINDER') {
            const newEvent = {
                id: Date.now(),
                title: data.description || "Lembrete IA",
                date: data.date || new Date().toISOString().split('T')[0],
                desc: "Agendado via voz"
            };
            
            const stored = localStorage.getItem('cm_agenda_events');
            const events = stored ? JSON.parse(stored) : [];
            events.push(newEvent);
            localStorage.setItem('cm_agenda_events', JSON.stringify(events));
            
            ui.openModal('AGENDA');
            showToast("Evento agendado com sucesso!", "success");
        }
    };

    return { handleAICommand };
};
