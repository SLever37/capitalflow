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
      
      e.target.value = '';

      try {
          const sheets = await filesService.getImportSheets(file);
          ui.setPendingImportFile(file);
          
          if (sheets.length > 1) {
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
              const validIndices = parsed
                  .map((c, i) => c.status === 'VALID' ? i : -1)
                  .filter(idx => idx !== -1);
              ui.setSelectedImportIndices(validIndices);
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
          ui.closeModal(); 
          await processImport(file, sheetName);
      }
  };

  const handleConfirmImport = async (activeUser: UserProfile | null, fetchFullData: (id: string) => Promise<void>) => {
      try {
          const selected = ui.importCandidates.filter((_: any, i: number) => ui.selectedImportIndices.includes(i));
          if (selected.length === 0) {
              showToast('Nenhum registro selecionado.', 'info');
              return;
          }
          await filesService.saveSelectedClients(selected, activeUser, showToast);
          ui.closeModal();
          ui.setImportCandidates([]);
          ui.setPendingImportFile(null);
          if (activeUser) await fetchFullData(activeUser.id);
      } catch (err: any) {
          showToast(err.message, 'error');
      }
  };

  const toggleImportSelection = (index: number) => {
      if (ui.importCandidates[index].status === 'INVALID') return;
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
      ui.setImportCandidates([]);
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