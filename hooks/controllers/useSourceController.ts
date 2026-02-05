
import { supabase } from '../../lib/supabase';
import { CapitalSource, UserProfile } from '../../types';
import { parseCurrency } from '../../utils/formatters';

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

    const initialBalance = parseCurrency(ui.sourceForm.balance);

    if (activeUser.id === 'DEMO') {
      const newSource: CapitalSource = {
        id: crypto.randomUUID(),
        name: ui.sourceForm.name,
        type: ui.sourceForm.type as any,
        balance: initialBalance,
      };
      setSources([...sources, newSource]);
      showToast("Fonte criada (Demo)", "success");
      ui.closeModal();
      return;
    }

    ui.setIsSaving(true);
    try {
      const id = crypto.randomUUID();
      const ownerId = (activeUser as any).supervisor_id || activeUser.id;
      const isStaff = !!(activeUser as any).supervisor_id;

      // Se for STAFF criando, a fonte pertence ao Dono, mas com acesso exclusivo do STAFF
      const operadorPermitido = isStaff ? activeUser.id : (ui.sourceForm.operador_permitido_id || null);

      const { error } = await supabase
        .from('fontes')
        .insert([
          {
            id,
            profile_id: ownerId,
            name: ui.sourceForm.name,
            type: ui.sourceForm.type,
            balance: initialBalance,
            operador_permitido_id: operadorPermitido
          },
        ]);

      if (error) {
        showToast("Erro ao criar fonte: " + error.message, "error");
      } else {
        showToast("Fonte criada!", "success");
        ui.closeModal();
        await fetchFullData(activeUser.id);
      }
    } catch (e: any) {
      showToast("Erro ao criar fonte.", "error");
    } finally {
      ui.setIsSaving(false);
    }
  };

  const handleAddFunds = async () => {
    if (!activeUser || !ui.activeModal?.payload || ui.addFundsValue == null) return;

    const amount = parseCurrency(ui.addFundsValue);
    
    if (amount <= 0) {
      showToast("Informe um valor válido para adicionar.", "error");
      return;
    }

    if (activeUser.id === 'DEMO') {
      setSources(
        sources.map((s) =>
          s.id === ui.activeModal.payload?.id ? { ...s, balance: s.balance + amount } : s
        )
      );
      showToast("Fundos adicionados (Demo)", "success");
      ui.closeModal();
      return;
    }

    const { error } = await supabase.rpc('adjust_source_balance', {
      p_source_id: ui.activeModal.payload.id,
      p_delta: amount,
    });

    if (error) {
      showToast("Erro ao adicionar fundos: " + error.message, "error");
    } else {
      showToast("Saldo atualizado com segurança!", "success");
      ui.closeModal();
      await fetchFullData(activeUser.id);
    }
  };

  const handleUpdateSourceBalance = async () => {
    if (!activeUser || !ui.editingSource) return;

    const newBalance = parseCurrency(ui.editingSource.balance);

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

    const amount = parseCurrency(ui.withdrawValue);

    if (amount <= 0) {
      showToast("Informe um valor válido para resgatar.", "error");
      return;
    }

    if (amount > (Number(activeUser.interestBalance) || 0)) {
      showToast("Saldo de lucro insuficiente.", "error");
      return;
    }

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
      ui.closeModal();
      return;
    }

    const { error } = await supabase.rpc('profit_withdrawal_atomic', {
      p_amount: amount,
      p_profile_id: activeUser.id,
      p_target_source_id: targetSourceId,
    });

    if (error) {
      showToast("Falha no resgate: " + error.message, "error");
    } else {
      showToast("Resgate processado com sucesso!", "success");
      ui.closeModal();
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
