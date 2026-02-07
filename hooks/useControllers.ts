
import { useMemo } from 'react';
import { useLoanController } from './controllers/useLoanController';
import { useClientController } from './controllers/useClientController';
import { useSourceController } from './controllers/useSourceController';
import { useProfileController } from './controllers/useProfileController';
import { usePaymentController } from './controllers/usePaymentController';
import { useFileController } from './controllers/useFileController';
import { useAIController } from './controllers/useAIController';
import { UserProfile, Loan, Client, CapitalSource } from '../types';

export const useControllers = (
  activeUser: UserProfile | null,
  ui: any,
  loans: Loan[],
  setLoans: any,
  clients: Client[],
  setClients: any,
  sources: CapitalSource[],
  setSources: any,
  setActiveUser: any,
  setIsLoadingData: any,
  fetchFullData: any,
  fetchAllUsers: any,
  handleLogout: any,
  showToast: any,
  profileEditForm: any,
  setProfileEditForm: any
) => {
  return useMemo(() => {
    if (!ui) {
      return {
          loanCtrl: {} as any,
          clientCtrl: {} as any,
          sourceCtrl: {} as any,
          profileCtrl: {} as any,
          paymentCtrl: {} as any,
          fileCtrl: {} as any,
          aiCtrl: {} as any,
          adminCtrl: null // Admin isolado
      };
    }

    const loanCtrl = useLoanController(activeUser, ui, sources, setSources, loans, setLoans, clients, setClients, fetchFullData, showToast);
    const clientCtrl = useClientController(activeUser, ui, clients, setClients, fetchFullData, showToast);
    const sourceCtrl = useSourceController(activeUser, ui, sources, setSources, setActiveUser, fetchFullData, showToast);
    const profileCtrl = useProfileController(activeUser, ui, profileEditForm, setProfileEditForm, setActiveUser, setIsLoadingData, fetchFullData, handleLogout, showToast);
    // adminCtrl removido daqui - vive agora na MasterScreen
    const paymentCtrl = usePaymentController(activeUser, ui, sources, loans, setLoans, setActiveUser, fetchFullData, showToast);
    const fileCtrl = useFileController(ui, sources, showToast);
    const aiCtrl = useAIController(loans, clients, ui, showToast);

    return {
        loanCtrl,
        clientCtrl,
        sourceCtrl,
        profileCtrl,
        paymentCtrl,
        fileCtrl,
        aiCtrl,
        adminCtrl: null // Placeholder
    };
  }, [
      activeUser?.id, 
      loans.length, 
      clients.length, 
      sources.length,
      ui 
  ]);
};
