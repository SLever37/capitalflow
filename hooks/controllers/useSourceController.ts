import { supabase } from '../../lib/supabase';
import { CapitalSource, UserProfile } from '../../types';

export const useSourceController = (
  activeUser: UserProfile | null,
  ui: any,
  sources: CapitalSource[],
  setSources: any,
  setActiveUser: any,
  fetchFullData: (id: string) => Promise<void>,
  showToast: (msg: string, type?: 'success' | 'error') => void
) => {
  const handleSaveSource = async () => {
    if (!activeUser) return;

    if (!ui.sourceForm.name.trim()) {
      showToast("Dê um nome para a nova fonte de capital.", "error");
      return;
    }
    if (ui.isSaving) return;

    if (activeUser.id === 'DEMO') {
      const newSource: CapitalSource = {
        id: crypto.randomUUID(),
        name: ui.sourceForm.name,
        type: ui.sourceForm.type as any,
        balance: Number(ui.sourceForm.balance),
      };
      setSources([...sources, newSource]);
      showToast("Fonte criada (Demo)", "success");
      ui.setIsSourceModalOpen(false);
      return;
    }

    ui.setIsSaving(true);
    try {
      const id = crypto.randomUUID();
      const { error } = await supabase
        .from('fontes')
        .insert([
          {
            id,
            profile_id: activeUser.id,
            name: ui.sourceForm.name,
            type: ui.sourceForm.type,
            balance: Number(ui.sourceForm.balance),
          },
        ]);

      if (error) {
        showToast("Erro ao criar fonte: " + error.message, "error");
      } else {
        showToast("Fonte criada!", "success");
        ui.setIsSourceModalOpen(false);
        await fetchFullData(activeUser.id);
      }
    } catch (e: any) {
      showToast("Erro ao criar fonte.", "error");
    } finally {
      ui.setIsSaving(false);
    }
  };

  const handleAddFunds = async () => {
    if (!activeUser || !ui.isAddFundsModalOpen || ui.addFundsValue == null) return;

    const amount = Number(ui.addFundsValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Informe um valor válido para adicionar.", "error");
      return;
    }

    if (activeUser.id === 'DEMO') {
      setSources(
        sources.map((s) =>
          s.id === ui.isAddFundsModalOpen?.id ? { ...s, balance: s.balance + amount } : s
        )
      );
      showToast("Fundos adicionados (Demo)", "success");
      ui.setIsAddFundsModalOpen(null);
      return;
    }

    const { error } = await supabase.rpc('adjust_source_balance', {
      p_source_id: ui.isAddFundsModalOpen.id,
      p_delta: amount,
    });

    if (error) {
      showToast("Erro ao adicionar fundos: " + error.message, "error");
    } else {
      showToast("Saldo atualizado com segurança!", "success");
      ui.setIsAddFundsModalOpen(null);
      await fetchFullData(activeUser.id);
    }
  };

  const handleUpdateSourceBalance = async () => {
    if (!activeUser || !ui.editingSource) return;

    const newBalance = Number(ui.editingSource.balance);
    if (!Number.isFinite(newBalance)) {
      showToast("Saldo inválido.", "error");
      return;
    }

    if (activeUser.id === 'DEMO') {
      setSources(
        sources.map((s) => (s.id === ui.editingSource?.id ? { ...s, balance: newBalance } : s))
      );
      showToast("Saldo atualizado (Demo)", "success");
      ui.setEditingSource(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('fontes')
        .update({ balance: newBalance })
        .eq('id', ui.editingSource.id);

      if (error) throw error;

      showToast("Inventário da fonte atualizado!", "success");
      ui.setEditingSource(null);
      await fetchFullData(activeUser.id);
    } catch (e: any) {
      showToast("Erro ao atualizar saldo: " + (e?.message || "erro desconhecido"), "error");
    }
  };

  const handleWithdrawProfit = async () => {
    if (!activeUser || ui.withdrawValue == null) return;

    // melhora: parse robusto + arredondamento em 2 casas
    const amountRaw = String(ui.withdrawValue).replace(',', '.');
    const amount = Math.round((parseFloat(amountRaw) + Number.EPSILON) * 100) / 100;

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Informe um valor válido para resgatar.", "error");
      return;
    }

    if (amount > (Number(activeUser.interestBalance) || 0)) {
      showToast("Saldo de lucro insuficiente.", "error");
      return;
    }

    // valida a fonte destino (quando não for saque externo)
    const targetSourceId =
      ui.withdrawSourceId === 'EXTERNAL_WITHDRAWAL' ? null : ui.withdrawSourceId;

    if (targetSourceId && !sources.some((s) => s.id === targetSourceId)) {
      showToast("Selecione uma fonte válida para receber o resgate.", "error");
      return;
    }

    if (activeUser.id === 'DEMO') {
      setActiveUser({ ...activeUser, interestBalance: (activeUser.interestBalance || 0) - amount });

      if (targetSourceId) {
        setSources(sources.map((s) => (s.id === targetSourceId ? { ...s, balance: s.balance + amount } : s)));
      }

      showToast("Resgate realizado (Demo)!", "success");
      ui.setWithdrawModal(false);
      return;
    }

    // ✅ FIX: nome correto da função no banco (sem downgrade)
    // Banco: public.profit_withdrawal_atomic(p_amount, p_profile_id, p_target_source_id)
    const { error } = await supabase.rpc('profit_withdrawal_atomic', {
      p_amount: amount,
      p_profile_id: activeUser.id,
      p_target_source_id: targetSourceId,
    });

    if (error) {
      showToast("Falha no resgate: " + error.message, "error");
    } else {
      showToast("Resgate processado com sucesso!", "success");
      ui.setWithdrawModal(false);
      await fetchFullData(activeUser.id);
    }
  };

  return {
    handleSaveSource,
    handleAddFunds,
    handleUpdateSourceBalance,
    handleWithdrawProfit,
  };
};