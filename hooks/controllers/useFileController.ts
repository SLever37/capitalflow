
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { importService } from '../../features/profile/import/services/importService';
import { UserProfile } from '../../types';

export const useFileController = (
  ui: any,
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
) => {

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';

      try {
          const sheets = await importService.getSheets(file);
          ui.setImportSheets(sheets);
          
          if (sheets.length > 1) {
              ui.openModal('IMPORT_SHEET_SELECT');
          } else {
              await startMapping(sheets[0]);
          }
      } catch (err: any) {
          showToast('Erro ao ler Excel: ' + err.message, 'error');
      }
  };

  const startMapping = async (sheet: any) => {
      const mapping = importService.inferMapping(sheet.headers);
      ui.setImportCurrentSheet(sheet);
      ui.setImportMapping(mapping);
      ui.openModal('IMPORT_MAPPING');
  };

  const generatePreview = async (activeUser: UserProfile | null) => {
      if (!activeUser) return;
      try {
          // Busca dados para validação cruzada
          const { data: escolas } = await supabase.from('escolas').select('nome').eq('dono_id', activeUser.id);
          const { data: funcs } = await supabase.from('funcionarios').select('cpf, matricula').eq('dono_id', activeUser.id);
          
          const existing = {
              escolas: (escolas || []).map(e => e.nome),
              cpfs: (funcs || []).map(f => f.cpf).filter(Boolean),
              matriculas: (funcs || []).map(f => f.matricula).filter(Boolean)
          };

          const preview = await importService.buildPreview(ui.importCurrentSheet.rows, ui.importMapping, existing);
          ui.setImportCandidates(preview);
          ui.setSelectedImportIndices(preview.map((c, i) => c.status !== 'ERRO' ? i : -1).filter(idx => idx !== -1));
          ui.openModal('IMPORT_PREVIEW');
      } catch (err: any) {
          showToast('Erro ao gerar preview: ' + err.message, 'error');
      }
  };

  const executeImport = async (activeUser: UserProfile | null, fetchFullData: any) => {
      if (!activeUser) return;
      const selected = ui.importCandidates.filter((_: any, i: number) => ui.selectedImportIndices.includes(i));
      
      ui.setIsSaving(true);
      let success = 0;
      let errors = 0;

      try {
          for (const item of selected) {
              try {
                  // Lógica de Lote: Upsert de dependências (simplificado para este exemplo)
                  // No mundo real, aqui você faria as verificações de setores/funções
                  const { error } = await supabase.from('funcionarios').upsert({
                      dono_id: activeUser.id,
                      nome: item.nome,
                      cpf: item.cpf,
                      matricula: item.matricula,
                      escola_nome: item.escola,
                      setor_nome: item.setor,
                      funcao_nome: item.funcao,
                      salario: item.salario,
                      created_at: new Date().toISOString()
                  }, { onConflict: 'cpf' });

                  if (error) throw error;
                  success++;
              } catch (e) {
                  errors++;
                  console.error("Erro na linha:", item.nome, e);
              }
          }
          
          showToast(`Importação finalizada: ${success} sucessos, ${errors} falhas.`, success > 0 ? 'success' : 'error');
          ui.closeModal();
          await fetchFullData(activeUser.id);
      } catch (err: any) {
          showToast('Erro crítico na importação: ' + err.message, 'error');
      } finally {
          ui.setIsSaving(false);
      }
  };

  return {
    handleFilePick,
    startMapping,
    generatePreview,
    executeImport,
    cancel: () => ui.closeModal()
  };
};
