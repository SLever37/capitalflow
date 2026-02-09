
import React, { useMemo } from 'react';
import { ClientsPage } from '../pages/ClientsPage';
import { Client } from '../types';
import { filterClients } from '../domain/filters/clientFilters';

interface ClientsContainerProps {
  clients: Client[];
  clientSearchTerm: string;
  setClientSearchTerm: (term: string) => void;
  clientCtrl: any;
  loanCtrl: any;
  showToast: any;
  ui: any; // Added ui for accessing state
}

export const ClientsContainer: React.FC<ClientsContainerProps> = ({ 
  clients, clientSearchTerm, setClientSearchTerm, clientCtrl, loanCtrl, showToast, ui
}) => {
  const filteredClients = useMemo(() => filterClients(clients, clientSearchTerm), [clients, clientSearchTerm]);

  const handleDeleteClient = (id: string) => {
      loanCtrl.openConfirmation({
          type: 'DELETE_CLIENT',
          target: id,
          title: 'Excluir Cliente?',
          message: 'Isso excluirá o cliente e todos os seus contratos e histórico financeiro permanentemente.'
      });
  };

  return (
    <ClientsPage 
        filteredClients={filteredClients} clientSearchTerm={clientSearchTerm} setClientSearchTerm={setClientSearchTerm}
        openClientModal={clientCtrl.openClientModal} openConfirmation={loanCtrl.openConfirmation} showToast={showToast}
        isBulkDeleteMode={ui.isBulkDeleteMode}
        toggleBulkDeleteMode={clientCtrl.toggleBulkDeleteMode}
        selectedClientsToDelete={ui.selectedClientsToDelete}
        toggleClientSelection={clientCtrl.toggleClientSelection}
        executeBulkDelete={clientCtrl.executeBulkDelete}
        onDeleteClient={handleDeleteClient}
    />
  );
};
