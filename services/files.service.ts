import { supabase } from '../lib/supabase';
import { downloadFile, generateBackup } from './dataService';
import { UserProfile, Client, Loan, CapitalSource } from '../types';
import { generateUniqueAccessCode, generateUniqueClientNumber, generateUUID } from '../utils/generators';
import { importService } from '../features/profile/import/services/importService';
import { addDaysUTC, toISODateOnlyUTC, parseDateOnlyUTC } from '../utils/dateHelpers';

export const filesService = {
  async handleExportBackup(activeUser: UserProfile | null, clients: Client[], loans: Loan[], sources: CapitalSource[], showToast: (msg: string, type?: 'error' | 'success') => void) {
    if (!activeUser) return;
    try {
        const json = generateBackup(activeUser, clients, loans, sources);
        downloadFile(json, `backup_credimaster_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        if (activeUser.id !== 'DEMO') {
            await supabase.from('backups').insert([{ profile_id: activeUser.id, backup_version: 1, payload: JSON.parse(json) }]);
        }
        showToast("Backup salvo (arquivo + nuvem).", "success");
    } catch (e: any) { showToast("Erro ao gerar backup: " + (e?.message || 'desconhecido'), "error"); }
  },

  async getImportSheets(file: File): Promise<string[]> {
    return await importService.getSheetNames(file);
  },

  async parseImportFile(file: File, sheetName?: string): Promise<any[]> {
    return await importService.parseFile(file, sheetName);
  },

  async saveSelectedClients(selectedCandidates: any[], activeUser: UserProfile | null, showToast: (msg: string, type?: 'error' | 'success' | 'info') => void) {
    if (!activeUser) return;
    if (activeUser.id === 'DEMO') { showToast("Importação desativada no modo Demo.", "info"); return; }
    
    try {
        if (selectedCandidates.length === 0) return;
        const { data: sources } = await supabase.from('fontes').select('*').eq('profile_id', activeUser.id).limit(1);
        let defaultSourceId = sources?.[0]?.id;

        if (!defaultSourceId) {
            defaultSourceId = generateUUID();
            await supabase.from('fontes').insert([{ id: defaultSourceId, profile_id: activeUser.id, name: 'Carteira Principal', type: 'CASH', balance: 0 }]);
        }

        let clientsCount = 0;
        let loansCount = 0;

        for (const row of selectedCandidates) {
            if (row.status === 'INVALID') continue;
            const clientId = generateUUID();
            const { error: clientError } = await supabase.from('clientes').insert({ 
                id: clientId, profile_id: activeUser.id, name: row.name, phone: row.phone, email: row.email, 
                access_code: String(Math.floor(1000 + Math.random() * 9000)), 
                client_number: String(Math.floor(100000 + Math.random() * 900000)), 
                document: row.document || null, 
                cpf: (row.document?.length === 11 ? row.document : null), 
                cnpj: (row.document?.length === 14 ? row.document : null), 
                address: row.address || null, created_at: new Date().toISOString() 
            });

            if (!clientError) {
                clientsCount++;
                if (row.principal && row.principal > 0) {
                    const loanId = generateUUID();
                    const rate = row.interestRate || activeUser.defaultInterestRate || 30;
                    const startDate = row.startDate || new Date().toISOString();
                    const totalToReceive = row.principal * (1 + rate / 100);
                    const dueDate = toISODateOnlyUTC(addDaysUTC(parseDateOnlyUTC(startDate), 30));

                    const { error: loanError } = await supabase.from('contratos').insert({
                        id: loanId, profile_id: activeUser.id, client_id: clientId, source_id: defaultSourceId,
                        debtor_name: row.name, debtor_phone: row.phone, debtor_document: row.document,
                        principal: row.principal, interest_rate: rate, start_date: startDate,
                        total_to_receive: totalToReceive, status: 'ACTIVE', billing_cycle: 'MONTHLY', notes: 'Importado via curadoria'
                    });

                    if (!loanError) {
                        await supabase.from('parcelas').insert({
                            id: generateUUID(), loan_id: loanId, profile_id: activeUser.id, numero_parcela: 1,
                            data_vencimento: dueDate, amount: totalToReceive, principal_remaining: row.principal,
                            interest_remaining: row.principal * (rate / 100), status: 'PENDING'
                        });
                        await supabase.rpc('adjust_source_balance', { p_source_id: defaultSourceId, p_delta: -row.principal });
                        loansCount++;
                    }
                }
            }
        }
        showToast(`Sucesso: ${clientsCount} clientes importados, ${loansCount} contratos gerados.`, "success"); 
    } catch (err: any) { throw new Error("Erro na gravação: " + (err?.message || 'desconhecido')); }
  },

  async handlePromissoriaUpload(file: File, activeUser: UserProfile | null, loanId: string, showToast: any, fetchFullData: any) {
    if (!activeUser?.id || !loanId) return;
    try {
      const path = `${activeUser.id}/${loanId}-${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('promissorias').upload(path, file);
      const { data } = supabase.storage.from('promissorias').getPublicUrl(path);
      await supabase.from('contratos').update({ promissoria_url: data.publicUrl }).eq('id', loanId);
      showToast('Promissória anexada.', 'success'); await fetchFullData(activeUser.id);
    } catch (err: any) { showToast('Erro no upload.', 'error'); }
  },

  async handleExtraDocUpload(file: File, activeUser: UserProfile | null, loanId: string, docKind: string, showToast: any, fetchFullData: any) {
    if (!activeUser?.id || !loanId) return;
    try {
      const path = `${activeUser.id}/${loanId}-${docKind}-${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('documentos').upload(path, file);
      const { data } = supabase.storage.from('documentos').getPublicUrl(path);
      const updatePayload: any = {}; if (docKind === 'CONFISSAO') updatePayload.confissao_divida_url = data.publicUrl;
      await supabase.from('contratos').update(updatePayload).eq('id', loanId);
      showToast('Documento salvo.', 'success'); await fetchFullData(activeUser.id);
    } catch (err: any) { showToast('Erro no upload.', 'error'); }
  }
};