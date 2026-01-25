
import React from 'react';
import { supabase } from '../../lib/supabase';
import { filesService } from '../../services/files.service';
import { UserProfile } from '../../types';

export const useFileController = (
  ui: any,
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
) => {

  const handleOpenComprovante = async (urlOrPath: string) => {
      try {
          if (!urlOrPath) return;
          if (/^(https?:)?\/\//i.test(urlOrPath) || urlOrPath.startsWith('data:')) { ui.openModal('PROOF_VIEW', urlOrPath); return; }
          const { data, error } = await supabase.storage.from('comprovantes').createSignedUrl(urlOrPath, 60 * 60);
          if (error) throw error;
          if (data?.signedUrl) ui.openModal('PROOF_VIEW', data.signedUrl);
      } catch (e: any) { showToast(e?.message || 'Não foi possível abrir o comprovante.', 'error'); }
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      e.target.value = ''; // Reset input to allow same file selection

      try {
          const sheets = await filesService.getImportSheets(file);
          
          if (sheets.length > 1) {
              ui.setPendingImportFile(file);
              ui.setImportSheetNames(sheets);
              ui.openModal('IMPORT_SHEET_SELECT');
          } else {
              await processImport(file, sheets[0]);
          }
      } catch (err: any) {
          showToast('Erro ao ler arquivo: ' + err.message, 'error');
      }
  };

  const processImport = async (file: File, sheetName?: string) => {
      try {
          const parsed = await filesService.parseImportFile(file, sheetName);
          if (parsed.length > 0) {
              ui.setImportCandidates(parsed);
              ui.setSelectedImportIndices([]);
              ui.openModal('IMPORT_PREVIEW');
          } else {
              showToast('Nenhum dado válido encontrado nesta aba.', 'error');
          }
      } catch (err: any) {
          showToast('Erro ao processar: ' + err.message, 'error');
      }
  };

  const selectSheet = async (sheetName: string) => {
      if (ui.pendingImportFile) {
          const file = ui.pendingImportFile;
          ui.closeModal(); // fecha modal de selecao
          await processImport(file, sheetName);
          ui.setPendingImportFile(null); // Limpeza de estado após uso
      }
  };

  const handleConfirmImport = async (activeUser: UserProfile | null, fetchFullData: (id: string) => Promise<void>) => {
      try {
          const selected = ui.importCandidates.filter((_: any, i: number) => ui.selectedImportIndices.includes(i));
          await filesService.saveSelectedClients(selected, activeUser, showToast);
          ui.closeModal();
          ui.setImportCandidates([]);
          if (activeUser) await fetchFullData(activeUser.id);
      } catch (err: any) {
          showToast(err.message, 'error');
      }
  };

  const toggleImportSelection = (index: number) => {
      if (ui.selectedImportIndices.includes(index)) {
          ui.setSelectedImportIndices((prev: number[]) => prev.filter(i => i !== index));
      } else {
          ui.setSelectedImportIndices((prev: number[]) => [...prev, index]);
      }
  };

  const cancelImport = () => {
      ui.closeModal();
      ui.setPendingImportFile(null);
      ui.setImportSheetNames([]);
  };

  return {
    handleOpenComprovante,
    handleFilePick,
    handleConfirmImport,
    toggleImportSelection,
    selectSheet,
    cancelImport
  };
};
