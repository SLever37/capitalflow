
import React from 'react';
import { useModal } from '../../../contexts/ModalContext';
import { Modal } from '../../ui/Modal';
import { CheckSquare, Square, Table, ArrowRight, AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { FIELD_MAPS } from '../../../features/profile/import/domain/importSchema';
import { AgendaModal } from '../AgendaModal';
import { CalculatorModal } from '../CalculatorModal';
import { FlowModal } from '../FlowModal';
import { MessageHubModal } from '../MessageHubModal';
import { ReceiptModal } from '../ReceiptModal';
import { AIAssistantModal } from '../AIAssistantModal';
import { NoteWrapper } from '../ModalWrappers';
import { Copy } from 'lucide-react';

export const SystemModalsWrapper = () => {
    // Added 'loans' to the destructuring to fix the errors on lines 138 and 141
    const { activeModal, closeModal, ui, activeUser, fileCtrl, fetchFullData, clients, loanCtrl, sources, aiCtrl, loans } = useModal();
    
    // Função auxiliar para lidar com ações de sistema vindas do Calendário/IA
    const handleSystemAction = (type: string, meta: any) => {
        if (type === 'PAYMENT' && meta) {
            ui.setPaymentModal({
                loan: { id: meta.loanId, debtorName: meta.clientName, debtorPhone: meta.clientPhone, sourceId: meta.sourceId },
                inst: { id: meta.installmentId, dueDate: meta.start_time },
                calculations: { total: meta.amount, principal: meta.amount, interest: 0, lateFee: 0 }
            });
            ui.openModal('PAYMENT');
        }
    };

    switch (activeModal?.type) {
        case 'IMPORT_SHEET_SELECT':
            return (
                <Modal onClose={closeModal} title="Selecionar Aba da Planilha">
                    <div className="space-y-4">
                        <p className="text-xs text-slate-400 mb-4">Encontramos múltiplas abas. Qual delas contém os clientes?</p>
                        <div className="grid grid-cols-1 gap-2">
                            {ui.importSheets?.map((sheet: any) => (
                                <button key={sheet.name} onClick={() => fileCtrl.startMapping(sheet)} className="w-full p-5 bg-slate-950 border border-slate-800 rounded-2xl text-left hover:border-blue-500 hover:bg-slate-900 transition-all font-black uppercase text-xs text-white flex justify-between items-center group">
                                    {sheet.name}
                                    <Table className="text-slate-700 group-hover:text-blue-500" size={16}/>
                                </button>
                            ))}
                        </div>
                    </div>
                </Modal>
            );

        case 'IMPORT_MAPPING':
            return (
                <Modal onClose={closeModal} title="Mapear Colunas">
                    <div className="space-y-6">
                        <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3">
                            <Info className="text-blue-400 shrink-0" size={18}/>
                            <p className="text-[10px] text-blue-200 uppercase font-bold">Relacione os campos abaixo com as colunas da aba "<b>{ui.importCurrentSheet?.name}</b>".</p>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {FIELD_MAPS.map(field => (
                                <div key={field.key} className="flex items-center gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-blue-500 uppercase">{field.key.replace('_', ' ')}</p>
                                        <p className="text-[8px] text-slate-500 uppercase font-bold">Campo do sistema</p>
                                    </div>
                                    <select 
                                        value={ui.importMapping[field.key] ?? ''} 
                                        onChange={e => ui.setImportMapping({...ui.importMapping, [field.key]: e.target.value === '' ? undefined : parseInt(e.target.value)})}
                                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 min-w-[150px]"
                                    >
                                        <option value="">Ignorar coluna</option>
                                        {ui.importCurrentSheet?.headers.map((h: string, i: number) => (
                                            <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => fileCtrl.generatePreview(activeUser, clients)} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl uppercase text-xs flex items-center justify-center gap-2">
                            Avançar para Curadoria <ArrowRight size={16}/>
                        </button>
                    </div>
                </Modal>
            );

        case 'IMPORT_PREVIEW':
            const selectedCount = ui.selectedImportIndices.length;
            return (
                <Modal onClose={closeModal} title="Revisão e Curadoria">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                            <div className="flex gap-6">
                                <div><p className="text-[9px] font-black text-slate-500 uppercase">Encontrados</p><p className="text-xl font-black text-white">{ui.importCandidates.length}</p></div>
                                <div><p className="text-[9px] font-black text-blue-500 uppercase">Para Importar</p><p className="text-xl font-black text-blue-400">{selectedCount}</p></div>
                            </div>
                            <button onClick={() => ui.setSelectedImportIndices(ui.importCandidates.map((_:any, i:number) => i).filter((i:number) => ui.importCandidates[i].status !== 'ERRO'))} className="text-[9px] font-black text-blue-500 hover:text-white uppercase underline">Marcar Todos Válidos</button>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                {ui.importCandidates.map((c: any, i: number) => {
                                    const isSelected = ui.selectedImportIndices.includes(i);
                                    const isError = c.status === 'ERRO';
                                    return (
                                        <div key={i} className={`flex items-start gap-3 p-4 border-b border-slate-900 last:border-0 hover:bg-slate-900/50 transition-colors cursor-pointer ${isError ? 'opacity-50' : ''}`} onClick={() => !isError && (isSelected ? ui.setSelectedImportIndices(ui.selectedImportIndices.filter((x:any)=>x!==i)) : ui.setSelectedImportIndices([...ui.selectedImportIndices, i]))}>
                                            <div className={isSelected ? 'text-blue-500' : 'text-slate-700'}>{isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-xs font-black text-white uppercase truncate">{c.nome || 'LINHA VAZIA'}</h4>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${c.status === 'OK' ? 'bg-emerald-500/10 text-emerald-500' : c.status === 'AVISO' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>{c.status}</span>
                                                </div>
                                                <p className="text-[9px] text-slate-500 font-bold">{c.documento || 'Sem CPF/CNPJ'} • {c.whatsapp || 'Sem WhatsApp'}</p>
                                                {c.mensagens.length > 0 && (
                                                    <div className="mt-1 space-y-0.5">
                                                        {c.mensagens.map((m:string, idx:number) => (
                                                            <p key={idx} className="text-[8px] text-amber-400 font-medium flex items-center gap-1"><AlertTriangle size={8}/> {m}</p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <button 
                            onClick={() => fileCtrl.executeImport(activeUser, clients, fetchFullData)} 
                            disabled={selectedCount === 0 || ui.isSaving}
                            className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase shadow-xl flex items-center justify-center gap-3 text-xs disabled:opacity-50 transition-all"
                        >
                            {ui.isSaving ? <Loader2 className="animate-spin" size={18}/> : <><CheckCircle2 size={18}/> Processar {selectedCount} Clientes</>}
                        </button>
                    </div>
                </Modal>
            );

        case 'CALC': return <CalculatorModal onClose={closeModal} />;
        case 'AGENDA': return <AgendaModal onClose={closeModal} activeUser={activeUser} onSystemAction={handleSystemAction} />;
        case 'FLOW': return activeUser ? <FlowModal onClose={closeModal} loans={loans} profit={activeUser.interestBalance} /> : null;
        case 'MESSAGE_HUB': return ui.messageModalLoan ? <MessageHubModal loan={ui.messageModalLoan} client={clients.find((c: any) => c.id === ui.messageModalLoan?.clientId)} onClose={closeModal} /> : null;
        case 'RECEIPT': return ui.showReceipt && activeUser ? <ReceiptModal data={ui.showReceipt} onClose={closeModal} userName={activeUser.businessName || activeUser.name || 'Empresa'} userDoc={activeUser.document} /> : null;
        case 'AI_ASSISTANT': return <AIAssistantModal onClose={closeModal} onCommandDetected={aiCtrl.handleAICommand} loans={loans} sources={sources} activeUser={activeUser} />;
        case 'NOTE': return <NoteWrapper />;
        case 'CONFIRMATION': return ui.confirmation ? (
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
        ) : null;
        
        default: return null;
    }
};
