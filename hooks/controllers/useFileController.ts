
import React from 'react';
import { supabase } from '../../lib/supabase';
import { importService } from '../../features/profile/import/services/importService';
import { UserProfile } from '../../types';
import { generateUniqueAccessCode, generateUniqueClientNumber } from '../../utils/generators';

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
          ui.setImportSheetNames(sheets.map(s => s.name));
          ui.setImportSheets(sheets);
          
          if (sheets.length > 1) {
              ui.openModal('IMPORT_SHEET_SELECT');
          } else {
              await startMapping(sheets[0]);
          }
      } catch (err: any) {
          showToast('Erro ao ler arquivo: ' + err.message, 'error');
      }
  };

  const startMapping = async (sheet: any) => {
      const mapping = importService.inferMapping(sheet.headers);
      ui.setImportCurrentSheet(sheet);
      ui.setImportMapping(mapping);
      ui.openModal('IMPORT_MAPPING');
  };

  const generatePreview = async (activeUser: UserProfile | null, clients: any[]) => {
      if (!activeUser) return;
      try {
          const existing = {
              documents: clients.map(c => c.document).filter(Boolean),
              phones: clients.map(c => c.phone).filter(Boolean)
          };

          const preview = await importService.buildPreview(ui.importCurrentSheet.rows, ui.importMapping, existing);
          ui.setImportCandidates(preview);
          ui.setSelectedImportIndices(preview.map((c, i) => c.status !== 'ERRO' ? i : -1).filter(idx => idx !== -1));
          ui.openModal('IMPORT_PREVIEW');
      } catch (err: any) {
          showToast('Erro na curadoria: ' + err.message, 'error');
      }
  };

  const executeImport = async (activeUser: UserProfile | null, clients: any[], fetchFullData: any) => {
      if (!activeUser) return;
      const selected = ui.importCandidates.filter((_: any, i: number) => ui.selectedImportIndices.includes(i));
      
      ui.setIsSaving(true);
      let success = 0;
      let errors = 0;

      const existingCodes = new Set(clients.map(c => c.accessCode).filter(Boolean));
      const existingNums = new Set(clients.map(c => c.clientNumber).filter(Boolean));

      try {
          for (const item of selected) {
              try {
                  const accessCode = generateUniqueAccessCode(existingCodes);
                  const clientNum = generateUniqueClientNumber(existingNums);
                  existingCodes.add(accessCode);
                  existingNums.add(clientNum);

                  const { error } = await supabase.from('clientes').insert({
                      profile_id: activeUser.id,
                      name: item.nome,
                      document: item.documento,
                      phone: item.whatsapp,
                      email: item.email,
                      address: item.endereco,
                      city: item.cidade,
                      state: item.uf,
                      notes: item.notas || 'Importado via planilha',
                      access_code: accessCode,
                      client_number: clientNum,
                      created_at: new Date().toISOString()
                  });

                  if (error) throw error;
                  success++;
              } catch (e) {
                  errors++;
                  console.error("Erro ao importar linha:", item.nome, e);
              }
          }
          
          showToast(`Importação de clientes concluída: ${success} adicionados, ${errors} falhas.`, success > 0 ? 'success' : 'error');
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
