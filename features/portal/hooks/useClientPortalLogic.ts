
import { useState, useEffect, useCallback } from 'react';
import { portalService, PortalSession } from '@/services/portal.service';
import { supabase } from '@/lib/supabase';

const PORTAL_SESSION_KEY = 'cm_portal_session';
const LOCKOUT_KEY = 'cm_portal_lockout';

export const useClientPortalLogic = (initialLoanId: string) => {
    const [isLoading, setIsLoading] = useState(true);
    const [portalError, setPortalError] = useState<string | null>(null);
    const [portalInfo, setPortalInfo] = useState<string | null>(null);

    // Login Form State
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loginCode, setLoginCode] = useState('');
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    
    // Authenticated State
    const [loggedClient, setLoggedClient] = useState<{ id: string; name: string; phone?: string; cpf?: string; client_number?: string; document?: string; access_code?: string } | null>(null);
    const [byeName, setByeName] = useState<string | null>(null);
    
    // Data State
    const [selectedLoanId, setSelectedLoanId] = useState<string>(initialLoanId);
    const [loan, setLoan] = useState<any | null>(null);
    const [pixKey, setPixKey] = useState<string>('');
    const [installments, setInstallments] = useState<any[]>([]);
    const [portalSignals, setPortalSignals] = useState<any[]>([]);
    const [clientLoans, setClientLoans] = useState<any[]>([]);
    const [isAgreementActive, setIsAgreementActive] = useState(false);

    // Action State
    const [intentId, setIntentId] = useState<string | null>(null);
    const [intentType, setIntentType] = useState<string | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    
    const loadFullPortalData = useCallback(async (loanId: string, clientId: string) => {
        setIsLoading(true);
        setPortalError(null);
        try {
            // 1. Contrato Base
            const data = await portalService.fetchLoanData(loanId, clientId);
            setLoan(data.loan);
            setPixKey(data.pixKey);
            setPortalSignals(data.signals || []);
            
            // 2. Acordo Ativo (Verificação Robusta)
            const { data: activeAgreement } = await supabase
                .from('acordos_inadimplencia')
                .select('*, acordo_parcelas(*)')
                .eq('loan_id', loanId)
                .in('status', ['ACTIVE', 'ATIVO']) 
                .maybeSingle();

            if (activeAgreement) {
                setIsAgreementActive(true);
                // Null-safe mapping
                const rawParcelas = activeAgreement.acordo_parcelas || [];
                setInstallments(rawParcelas.map((ap: any) => ({
                    data_vencimento: ap.due_date, 
                    valor_parcela: Number(ap.amount),
                    numero_parcela: ap.numero,
                    status: ap.status,
                    isAgreement: true
                })).sort((a: any, b: any) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
            } else {
                setIsAgreementActive(false);
                setInstallments(data.installments || []);
            }
            
            if (data.loan?.profile_id) {
                const list = await portalService.fetchClientLoansList(clientId, data.loan.profile_id);
                setClientLoans(list || []);
            }
        } catch (e: any) {
            setPortalError('Não foi possível carregar os dados do contrato.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Lockout Logic Check on Mount
    useEffect(() => {
        const checkLockout = () => {
            const lockoutStr = localStorage.getItem(LOCKOUT_KEY);
            if (lockoutStr) {
                const unlockTime = parseInt(lockoutStr);
                if (Date.now() < unlockTime) {
                    setIsLocked(true);
                    setPortalError(`Muitas tentativas. Aguarde ${Math.ceil((unlockTime - Date.now())/1000)}s.`);
                    setTimeout(() => { setIsLocked(false); setPortalError(null); localStorage.removeItem(LOCKOUT_KEY); }, unlockTime - Date.now());
                } else {
                    localStorage.removeItem(LOCKOUT_KEY);
                }
            }
        };
        checkLockout();
    }, []);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const raw = localStorage.getItem(PORTAL_SESSION_KEY);
                if (!raw) { setIsLoading(false); return; }
                const sess = JSON.parse(raw) as PortalSession;
                if (!sess.client_id || !sess.access_code) throw new Error("Sessão inválida");
                const clientData = await portalService.validateSession(sess.client_id, sess.access_code);
                if (clientData) {
                    setLoggedClient(clientData);
                    if (sess.last_loan_id) setSelectedLoanId(sess.last_loan_id);
                } else {
                    localStorage.removeItem(PORTAL_SESSION_KEY);
                }
            } catch (e) {
                localStorage.removeItem(PORTAL_SESSION_KEY);
            } finally {
                setIsLoading(false);
            }
        };
        checkSession();
    }, []);

    useEffect(() => {
        if (selectedLoanId && loggedClient) {
            loadFullPortalData(selectedLoanId, loggedClient.id);
        }
    }, [selectedLoanId, loggedClient, loadFullPortalData]);

    const handleLogin = async () => {
        if (isLocked) return;
        
        if (!loginIdentifier || !loginCode) {
            setPortalError("Preencha todos os campos para entrar.");
            return;
        }
        setPortalError(null);
        setIsLoading(true);
        try {
            const client = await portalService.authenticate(selectedLoanId, loginIdentifier, loginCode);
            
            // Login Success
            setLoginAttempts(0);
            setLoggedClient(client);
            setByeName(null);
            
            const session: PortalSession = {
                client_id: client.id,
                access_code: loginCode,
                identifier: loginIdentifier,
                last_loan_id: selectedLoanId,
                saved_at: new Date().toISOString()
            };
            localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
        } catch (e: any) {
            const newAttempts = loginAttempts + 1;
            setLoginAttempts(newAttempts);
            if (newAttempts >= 3) {
                const unlockTime = Date.now() + 30000; // 30s Lockout
                localStorage.setItem(LOCKOUT_KEY, String(unlockTime));
                setIsLocked(true);
                setPortalError("Muitas tentativas falhas. Bloqueado por 30 segundos.");
                setTimeout(() => { setIsLocked(false); setPortalError(null); localStorage.removeItem(LOCKOUT_KEY); setLoginAttempts(0); }, 30000);
            } else {
                setPortalError(e.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(PORTAL_SESSION_KEY);
        setByeName(loggedClient?.name || 'Cliente');
        setLoggedClient(null);
        setPortalError(null);
        setPortalInfo(null);
        setLoginIdentifier('');
        setLoginCode('');
        setSelectedLoanId(initialLoanId);
        setLoan(null);
        setInstallments([]);
    };

    const handleSignalIntent = async (tipo: string) => {
        if (!loggedClient || !loan) return;
        setPortalError(null);
        setIntentType(tipo);
        if (tipo === 'PAGAR_PIX') {
            if (pixKey) navigator.clipboard.writeText(pixKey).then(() => setPortalInfo('PIX copiado!')).catch(() => setPortalInfo('PIX disponível.'));
            else setPortalInfo('Chave PIX não cadastrada.');
        } else {
            setPortalInfo('Solicitação enviada.');
        }
        try {
            const id = await portalService.submitPaymentIntent(loggedClient.id, selectedLoanId, loan.profile_id, tipo);
            setIntentId(id);
            setReceiptPreview(null);
        } catch (e: any) {
            setPortalError('Erro ao registrar solicitação: ' + e.message);
        }
    };

    const handleReceiptUpload = async (file: File) => {
        if (!intentId || !loggedClient || !loan) { setPortalError('Erro: Solicitação não encontrada.'); return; }
        try {
            setReceiptPreview(URL.createObjectURL(file));
            await portalService.uploadReceipt(file, intentId, loan.profile_id, loggedClient.id);
            setPortalInfo('Comprovante enviado com sucesso!');
        } catch (e: any) { setPortalError('Falha no envio: ' + e.message); }
    };

    return {
        isLoading,
        portalError,
        portalInfo,
        loginIdentifier,
        setLoginIdentifier,
        loginCode,
        setLoginCode,
        loggedClient,
        byeName,
        selectedLoanId,
        loan,
        installments,
        portalSignals,
        clientLoans,
        isAgreementActive,
        intentId,
        intentType,
        receiptPreview,
        handleLogin,
        handleLogout,
        handleSignalIntent,
        handleReceiptUpload
    };
};
