
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
    } catch (e: any) { 
        console.error(e); 
        showToast("Erro ao gerar backup: " + (e?.message || 'desconhecido'), "error"); 
    }
  },

  async getImportSheets(file: File): Promise<string[]> {
    return await importService.getSheetNames(file);
  },

  async parseImportFile(file: File, sheetName?: string): Promise<any[]> {
    return await importService.parseFile(file, sheetName);
  },

  async saveSelectedClients(
    selectedCandidates: any[], 
    activeUser: UserProfile | null, 
    showToast: (msg: string, type?: 'error' | 'success' | 'info') => void
  ) {
    if (!activeUser) return;
    if (activeUser.id === 'DEMO') { showToast("Importação desativada no modo Demo.", "info"); return; }
    
    try {
        if (selectedCandidates.length === 0) { showToast("Nenhum cliente selecionado.", "info"); return; }
        
        const { data: sources } = await supabase.from('fontes').select('*').eq('profile_id', activeUser.id).limit(1);
        let defaultSourceId = sources && sources.length > 0 ? sources[0].id : null;

        if (!defaultSourceId) {
            defaultSourceId = generateUUID();
            await supabase.from('fontes').insert([{ id: defaultSourceId, profile_id: activeUser.id, name: 'Carteira Principal', type: 'CASH', balance: 0 }]);
        }

        let clientsCount = 0;
        let loansCount = 0;

        for (const row of selectedCandidates) {
            if (row.status === 'INVALID') continue;
            
            const clientId = generateUUID();
            // Add explicit string typing to Sets to fix "Set<unknown>" vs "Set<string>" error
            const codes = new Set<string>(); // Em um cenário real, precisaríamos de uma lista de códigos existentes aqui
            const clientNumSet = new Set<string>();

            const { error: clientError } = await supabase.from('clientes').insert({ 
                id: clientId, 
                profile_id: activeUser.id, 
                name: row.name, 
                phone: row.phone, 
                email: row.email, 
                access_code: generateUniqueAccessCode(codes), 
                client_number: generateUniqueClientNumber(clientNumSet), 
                document: row.document || null, 
                cpf: (row.document?.length === 11 ? row.document : null), 
                cnpj: (row.document?.length === 14 ? row.document : null), 
                notes: row.notes,
                created_at: new Date().toISOString() 
            });

            if (clientError) {
                console.error("Erro importando cliente", row.name, clientError);
                continue;
            }
            clientsCount++;

            if (row.principal && row.principal > 0) {
                const loanId = generateUUID();
                const rate = row.interestRate || activeUser.defaultInterestRate || 30;
                const startDate = row.startDate || new Date().toISOString();
                
                const interestAmount = row.principal * (rate / 100);
                const totalAmount = row.principal + interestAmount;
                const dueDate = toISODateOnlyUTC(addDaysUTC(parseDateOnlyUTC(startDate), 30));

                const { error: loanError } = await supabase.from('contratos').insert({
                    id: loanId,
                    profile_id: activeUser.id,
                    client_id: clientId,
                    source_id: defaultSourceId,
                    debtor_name: row.name,
                    debtor_phone: row.phone,
                    debtor_document: row.document,
                    principal: row.principal,
                    interest_rate: rate,
                    fine_percent: activeUser.defaultFinePercent || 2,
                    daily_interest_percent: activeUser.defaultDailyInterestPercent || 1,
                    billing_cycle: 'MONTHLY',
                    amortization_type: 'JUROS',
                    start_date: startDate,
                    total_to_receive: totalAmount,
                    status: 'ACTIVE',
                    created_at: startDate,
                    notes: 'Importado via Planilha'
                });

                if (!loanError) {
                    await supabase.from('parcelas').insert({
                        id: generateUUID(),
                        loan_id: loanId,
                        profile_id: activeUser.id,
                        numero_parcela: 1,
                        data_vencimento: dueDate,
                        valor_parcela: totalAmount,
                        amount: totalAmount,
                        scheduled_principal: row.principal,
                        scheduled_interest: interestAmount,
                        principal_remaining: row.principal,
                        interest_remaining: interestAmount,
                        status: 'PENDING'
                    });

                    // RPC UNIFICADO: adjust_source_balance com delta negativo
                    const { error: rpcError } = await supabase.rpc('adjust_source_balance', { 
                        p_source_id: defaultSourceId, 
                        p_delta: -row.principal 
                    });

                    if (rpcError) {
                        const { data: curr } = await supabase.from('fontes').select('balance').eq('id', defaultSourceId).single();
                        if (curr) await supabase.from('fontes').update({ balance: curr.balance - row.principal }).eq('id', defaultSourceId);
                    }

                    await supabase.from('transacoes').insert({
                        id: generateUUID(),
                        loan_id: loanId,
                        profile_id: activeUser.id,
                        source_id: defaultSourceId,
                        date: startDate,
                        type: 'LEND_MORE',
                        amount: row.principal,
                        principal_delta: 0, interest_delta: 0, late_fee_delta: 0, 
                        notes: 'Empréstimo Importado',
                        category: 'INVESTIMENTO'
                    });

                    loansCount++;
                }
            }
        }
        
        showToast(`Importação: ${clientsCount} clientes, ${loansCount} contratos criados.`, "success"); 
        
    } catch (err: any) { 
        console.error(err); 
        throw new Error("Erro crítico na importação: " + (err?.message || 'desconhecido')); 
    }
  },

  async handlePromissoriaUpload(
      file: File, 
      activeUser: UserProfile | null, 
      loanId: string, 
      showToast: (msg: string, type?: 'error' | 'success' | 'info') => void, 
      fetchFullData: (id: string) => Promise<void>
  ) {
    if (!activeUser?.id || !loanId) { showToast('Selecione um contrato antes de anexar a promissória.', 'error'); return; }
    if (activeUser.id === 'DEMO') { showToast("Upload indisponível no modo Demo.", "info"); return; }
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const safeExt = ['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext) ? ext : 'bin';
      const path = `${activeUser.id}/${loanId}-${Date.now()}.${safeExt}`;
      const { error: uploadError } = await supabase.storage.from('promissorias').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from('promissorias').getPublicUrl(path);
      const { error: updateError } = await supabase.from('contratos').update({ promissoria_url: publicData?.publicUrl }).eq('id', loanId).eq('profile_id', activeUser.id);
      if (updateError) throw updateError;
      showToast('Promissória anexada com sucesso.', 'success'); 
      await fetchFullData(activeUser.id);
    } catch (err: any) { showToast(err?.message || 'Falha ao anexar a promissória.', 'error'); }
  },

  async handleExtraDocUpload(
      file: File, 
      activeUser: UserProfile | null, 
      loanId: string, 
      docKind: 'CONFISSAO', 
      showToast: (msg: string, type?: 'error' | 'success' | 'info') => void, 
      fetchFullData: (id: string) => Promise<void>
  ) {
    if (!activeUser?.id || !loanId) { showToast('Selecione um contrato antes de anexar o documento.', 'error'); return; }
    if (activeUser.id === 'DEMO') { showToast("Upload indisponível no modo Demo.", "info"); return; }
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const safeExt = ['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext) ? ext : 'bin';
      const path = `${activeUser.id}/${loanId}-${docKind}-${Date.now()}.${safeExt}`;
      const { error: uploadError } = await supabase.storage.from('documentos').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from('documentos').getPublicUrl(path);
      const updatePayload: any = {}; if (docKind === 'CONFISSAO') updatePayload.confissao_divida_url = publicData?.publicUrl;
      const { error: updateError } = await supabase.from('contratos').update(updatePayload).eq('id', loanId).eq('profile_id', activeUser.id);
      if (updateError) throw updateError;
      showToast('Documento anexado com sucesso.', 'success'); 
      await fetchFullData(activeUser.id);
    } catch (err: any) { showToast(err?.message || 'Falha ao anexar o documento.', 'error'); }
  }
};
