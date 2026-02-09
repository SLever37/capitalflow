
import { supabase } from '../../../lib/supabase';
import { generateUUID } from '../../../utils/generators';
import { PFTransaction, PFAccount, PFCard, PFCategory } from '../types';

export const personalFinanceService = {
    async getAccounts(profileId: string): Promise<PFAccount[]> {
        const { data } = await supabase.from('pf_contas').select('*').eq('profile_id', profileId);
        return data || [];
    },

    async getCards(profileId: string): Promise<PFCard[]> {
        const { data } = await supabase.from('pf_cartoes').select('*').eq('profile_id', profileId);
        return data || [];
    },

    async getCategories(profileId: string): Promise<PFCategory[]> {
        const { data } = await supabase.from('pf_categorias').select('*').eq('profile_id', profileId);
        return data || [];
    },

    async getTransactions(profileId: string, month: number, year: number): Promise<PFTransaction[]> {
        const startDate = new Date(year, month, 1).toISOString();
        const endDate = new Date(year, month + 1, 0).toISOString();

        const { data } = await supabase
            .from('pf_transacoes')
            .select(`
                *,
                pf_categorias(nome),
                pf_contas(nome),
                pf_cartoes(nome)
            `)
            .eq('profile_id', profileId)
            .gte('data', startDate)
            .lte('data', endDate)
            .order('data', { ascending: false });

        return (data || []).map((t: any) => ({
            ...t,
            category_name: t.pf_categorias?.nome,
            account_name: t.pf_contas?.nome,
            card_name: t.pf_cartoes?.nome
        }));
    },

    async addTransaction(tx: Partial<PFTransaction>, profileId: string) {
        const payload = {
            id: generateUUID(),
            profile_id: profileId,
            ...tx
        };
        const { error } = await supabase.from('pf_transacoes').insert(payload);
        if (error) throw error;
        
        // Atualiza saldo da conta se não for cartão de crédito e já estiver consolidado
        if (tx.conta_id && tx.status === 'CONSOLIDADO' && !tx.cartao_id) {
            const delta = tx.tipo === 'RECEITA' ? Number(tx.valor) : -Number(tx.valor);
            await supabase.rpc('pf_adjust_account_balance', { p_account_id: tx.conta_id, p_delta: delta });
        }
    },

    async addAccount(acc: Partial<PFAccount>, profileId: string) {
        await supabase.from('pf_contas').insert({ id: generateUUID(), profile_id: profileId, ...acc });
    },

    async deleteAccount(id: string) {
        await supabase.from('pf_contas').delete().eq('id', id);
    },

    async addCard(card: Partial<PFCard>, profileId: string) {
        await supabase.from('pf_cartoes').insert({ id: generateUUID(), profile_id: profileId, ...card });
    },

    async deleteCard(id: string) {
        await supabase.from('pf_cartoes').delete().eq('id', id);
    },

    async addCategory(cat: Partial<PFCategory>, profileId: string) {
        await supabase.from('pf_categorias').insert({ id: generateUUID(), profile_id: profileId, ...cat });
    },

    async deleteTransaction(id: string) {
        await supabase.from('pf_transacoes').delete().eq('id', id);
    }
};
