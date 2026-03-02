import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { CapitalSource, UserProfile, SourceUIController } from '../../types';
import { parseCurrency } from '../../utils/formatters';
import { personalFinanceService } from '../../features/personal-finance/services/personalFinanceService';
import { isUUID, safeUUID } from '../../utils/uuid';

export const useSourceController = (
  activeUser: UserProfile | null,
  ui: SourceUIController,
  sources: CapitalSource[],
  setSources: React.Dispatch<React.SetStateAction<CapitalSource[]>>,
  setActiveUser: React.Dispatch<React.SetStateAction<UserProfile | null>>,
  fetchFullData: (id: string) => Promise<void>,
  showToast: (msg: string, type?: 'success' | 'error') => void
) => {
  const getOwnerId = (u: UserProfile) => safeUUID(u.supervisor_id) || safeUUID(u.id);

  const handleSaveSource = async () => {
    if (!activeUser) return;

    if (!ui.sourceForm.name.trim()) {
      showToast('Dê um nome para a nova fonte de capital.', 'error');
      return;
    }

    if (ui.isSaving) return;

    const initialBalance = parseCurrency(ui.sourceForm.balance);

    if (activeUser.id === 'DEMO') {
      const newSource: CapitalSource = {
        id: crypto.randomUUID(),
        name: ui.sourceForm.name,
        type: ui.sourceForm.type,
        balance: initialBalance,
        profile_id: activeUser.id,
      };
      setSources([...sources, newSource]);
      showToast('Fonte criada (Demo)', 'success');
      ui.closeModal();
      return;
    }

    ui.setIsSaving(true);

    try {
      const id = crypto.randomUUID();
      const ownerId = getOwnerId(activeUser);
      if (!ownerId) throw new Error('OwnerId inválido. Refaça login.');

      const isStaff = !!activeUser.supervisor_id;

      // STAFF criando: fonte pertence ao DONO, mas pode restringir pelo operador_permitido_id
      const operadorPermitido = isStaff ? activeUser.id : (ui.sourceForm.operador_permitido_id || null);

      const { error } = await supabase.from('fontes').insert([
        {
          id,
          profile_id: ownerId, // ✅ fontes pertencem ao DONO
          name: ui.sourceForm.name,
          type: ui.sourceForm.type,
          balance: initialBalance,
          operador_permitido_id: operadorPermitido,
        },
      ]);

      if (error) {
        showToast('Erro ao criar fonte: ' + error.message, 'error');
      } else {
        showToast('Fonte criada!', 'success');
        ui.closeModal();
        await fetchFullData(ownerId); // ✅ recarrega pelo DONO
      }
    } catch (e: any) {
      showToast('Erro ao criar fonte: ' + (e?.message || 'erro desconhecido'), 'error');
    } finally {
      ui.setIsSaving(false);
    }
  };

  const handleAddFunds = async () => {
    if (!activeUser || !ui.activeModal?.payload || ui.addFundsValue == null) return;

    const amount = parseCurrency(ui.addFundsValue);
    if (amount <= 0) {
      showToast('Informe um valor válido para adicionar.', 'error');
      return;
    }

    if (activeUser.id === 'DEMO') {
      setSources(
        sources.map((s) => (s.id === ui.activeModal.payload?.id ? { ...s, balance: s.balance + amount } : s))
      );
      showToast('Fundos adicionados (Demo)', 'success');
      ui.closeModal();
      return;
    }

    const ownerId = getOwnerId(activeUser);
    if (!ownerId) {
      showToast('OwnerId inválido. Refaça login.', 'error');
      return;
    }

    const { error } = await supabase.rpc('adjust_source_balance', {
      p_source_id: safeUUID(ui.activeModal.payload.id),
      p_delta: amount,
    });

    if (error) {
      showToast('Erro ao adicionar fundos: ' + error.message, 'error');
    } else {
      showToast('Saldo atualizado com segurança!', 'success');
      
      // Integração com Minhas Finanças (Aporte = Despesa Pessoal)
      try {
        await personalFinanceService.addTransaction({
            descricao: `Aporte em ${ui.activeModal.payload.name}`,
            valor: amount,
            tipo: 'DESPESA',
            data: new Date().toISOString().split('T')[0],
            status: 'CONSOLIDADO',
            categoria_id: '',
            fixo: false
        }, activeUser.id);
      } catch (e) {
        console.error("Erro ao integrar com Minhas Finanças", e);
      }

      ui.closeModal();
      await fetchFullData(ownerId); // ✅ recarrega pelo DONO
    }
  };

  const handleUpdateSourceBalance = async () => {
    if (!activeUser || !ui.editingSource) return;

    const newBalance = parseCurrency(ui.editingSource.balance);
    const oldBalance = sources.find(s => s.id === ui.editingSource.id)?.balance || 0;
    const delta = newBalance - oldBalance;

    if (activeUser.id === 'DEMO') {
      setSources(sources.map((s) => (s.id === ui.editingSource?.id ? { ...s, balance: newBalance } : s)));
      showToast('Saldo atualizado (Demo)', 'success');
      ui.setEditingSource(null);
      return;
    }

    const ownerId = getOwnerId(activeUser);
    if (!ownerId) {
      showToast('OwnerId inválido. Refaça login.', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('fontes').update({ balance: newBalance }).eq('id', ui.editingSource.id);
      if (error) throw error;

      showToast('Inventário da fonte atualizado!', 'success');

      // Integração com Minhas Finanças
      if (Math.abs(delta) > 0.01) {
          try {
            await personalFinanceService.addTransaction({
                descricao: delta > 0 ? `Ajuste (+) em ${ui.editingSource.name}` : `Ajuste (-) em ${ui.editingSource.name}`,
                valor: Math.abs(delta),
                tipo: delta > 0 ? 'DESPESA' : 'RECEITA', // Se aumentou saldo da fonte, saiu do bolso (Despesa). Se diminuiu, entrou no bolso (Receita).
                data: new Date().toISOString().split('T')[0],
                status: 'CONSOLIDADO',
                categoria_id: '',
                fixo: false
            }, activeUser.id);
          } catch (e) {
            console.error("Erro ao integrar com Minhas Finanças", e);
          }
      }

      ui.setEditingSource(null);
      await fetchFullData(ownerId); // ✅ recarrega pelo DONO
    } catch (e: any) {
      showToast('Erro ao atualizar saldo: ' + (e?.message || 'erro desconhecido'), 'error');
    }
  };

  const handleWithdrawProfit = async () => {
    if (!activeUser || ui.withdrawValue == null) return;

    const amount = parseCurrency(ui.withdrawValue);

    if (amount <= 0) {
      showToast('Informe um valor válido para resgatar.', 'error');
      return;
    }

    if (amount > (Number(activeUser.interestBalance) || 0)) {
      showToast('Saldo de lucro insuficiente.', 'error');
      return;
    }

    const targetSourceId = ui.withdrawSourceId === 'EXTERNAL_WITHDRAWAL' ? null : ui.withdrawSourceId;

    if (targetSourceId && !sources.some((s) => s.id === targetSourceId)) {
      showToast('Selecione uma fonte válida para receber o resgate.', 'error');
      return;
    }

    if (activeUser.id === 'DEMO') {
      setActiveUser({ ...activeUser, interestBalance: (activeUser.interestBalance || 0) - amount });
      if (targetSourceId) {
        setSources(sources.map((s) => (s.id === targetSourceId ? { ...s, balance: s.balance + amount } : s)));
      }
      showToast('Resgate realizado (Demo)!', 'success');
      ui.closeModal();
      return;
    }

    const ownerId = getOwnerId(activeUser);
    if (!ownerId) {
      showToast('OwnerId inválido. Refaça login.', 'error');
      return;
    }

    const { error } = await supabase.rpc('profit_withdrawal_atomic', {
      p_amount: amount,
      p_profile_id: safeUUID(ownerId), // ✅ CRÍTICO: lucro pertence ao DONO
      p_target_source_id: safeUUID(targetSourceId),
    });

    if (error) {
      showToast('Falha no resgate: ' + error.message, 'error');
    } else {
      showToast('Resgate processado com sucesso!', 'success');

      // Integração com Minhas Finanças (Se for saque externo)
      if (!targetSourceId) {
          try {
            await personalFinanceService.addTransaction({
                descricao: 'Resgate de Lucro (Caixa Livre)',
                valor: amount,
                tipo: 'RECEITA',
                data: new Date().toISOString().split('T')[0],
                status: 'CONSOLIDADO',
                categoria_id: '',
                fixo: false
            }, activeUser.id);
          } catch (e) {
            console.error("Erro ao integrar com Minhas Finanças", e);
          }
      }

      ui.closeModal();
      await fetchFullData(ownerId); // ✅ recarrega pelo DONO
    }
  };

  return {
    handleSaveSource,
    handleAddFunds,
    handleUpdateSourceBalance,
    handleWithdrawProfit,
  };
};