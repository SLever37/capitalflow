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
            descricao: tx.descricao,
            valor: Number(tx.valor),
            tipo: tx.tipo,
            data: tx.data || new Date().toISOString(),
            categoria_id: tx.categoria_id || null,
            conta_id: tx.conta_id || null,
            cartao_id: tx.cartao_id || null,
            fixo: !!tx.fixo,
            status: tx.status || 'CONSOLIDADO',
            created_at: new Date().toISOString()
        };

        const { error } = await supabase.from('pf_transacoes').insert(payload);
        if (error) throw error;
        
        // Rigor Contábil: Atualiza o saldo da conta destino na hora
        if (payload.conta_id && payload.status === 'CONSOLIDADO' && !payload.cartao_id) {
            const delta = payload.tipo === 'RECEITA' ? payload.valor : -payload.valor;
            const { error: rpcErr } = await supabase.rpc('pf_adjust_account_balance', { 
                p_account_id: payload.conta_id, 
                p_delta: delta 
            });
            if (rpcErr) console.error("Erro ao atualizar saldo da conta:", rpcErr);
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