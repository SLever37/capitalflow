
import { useState, useEffect, useCallback } from 'react';
import { portalService, PortalSession } from '@/services/portal.service';
import { supabase } from '@/lib/supabase';
import { legalPublicService } from '@/features/legal/services/legalPublic.service';

const PORTAL_SESSION_KEY = 'cm_portal_session';
const LOCKOUT_KEY = 'cm_portal_lockout';

export const useClientPortalLogic = (initialLoanId: string) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSigning, setIsSigning] = useState(false);
    const [portalError, setPortalError] = useState<string | null>(null);
    const [portalInfo, setPortalInfo] = useState<string | null>(null);

    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loginCode, setLoginCode] = useState('');
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    
    const [loggedClient, setLoggedClient] = useState<any | null>(null);
    const [byeName, setByeName] = useState<string | null>(null);
    
    const [selectedLoanId, setSelectedLoanId] = useState<string>(initialLoanId);
    const [loan, setLoan] = useState<any | null>(null);
    const [pixKey, setPixKey] = useState<string>('');
    const [installments, setInstallments] = useState<any[]>([]);
    const [portalSignals, setPortalSignals] = useState<any[]>([]);
    const [clientLoans, setClientLoans] = useState<any[]>([]);
    const [isAgreementActive, setIsAgreementActive] = useState(false);

    const [intentId, setIntentId] = useState<string | null>(null);
    const [intentType, setIntentType] = useState<string | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    
    const loadFullPortalData = useCallback(async (loanId: string, clientId: string) => {
        setIsLoading(true);
        setPortalError(null);
        try {
            const data = await portalService.fetchLoanData(loanId, clientId);
            setLoan(data.loan);
            setPixKey(data.pixKey);
            setPortalSignals(data.signals || []);
            
            const { data: activeAgreement } = await supabase
                .from('acordos_inadimplencia')
                .select('*, acordo_parcelas(*)')
                .eq('loan_id', loanId)
                .in('status', ['ACTIVE', 'ATIVO']) 
                .maybeSingle();

            if (activeAgreement) {
                setIsAgreementActive(true);
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

    useEffect(() => {
        const lockoutStr = localStorage.getItem(LOCKOUT_KEY);
        if (lockoutStr) {
            const unlockTime = parseInt(lockoutStr);
            if (Date.now() < unlockTime) {
                setIsLocked(true);
                setPortalError(`Muitas tentativas. Aguarde ${Math.ceil((unlockTime - Date.now())/1000)}s.`);
                setTimeout(() => { setIsLocked(false); setPortalError(null); localStorage.removeItem(LOCKOUT_KEY); }, unlockTime - Date.now());
            }
        }
    }, []);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const raw = localStorage.getItem(PORTAL_SESSION_KEY);
                if (!raw) { setIsLoading(false); return; }
                const sess = JSON.parse(raw) as PortalSession;
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
            setPortalError("Preencha todos os campos.");
            return;
        }
        setPortalError(null);
        setIsLoading(true);
        try {
            const client = await portalService.authenticate(selectedLoanId, loginIdentifier, loginCode);
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
                const unlockTime = Date.now() + 30000;
                localStorage.setItem(LOCKOUT_KEY, String(unlockTime));
                setIsLocked(true);
                setPortalError("Bloqueado por 30 segundos.");
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
        setLoan(null);
    };

    const handleSignalIntent = async (tipo: string) => {
        if (!loggedClient || !loan) return;
        setPortalError(null);
        setIntentType(tipo);
        if (tipo === 'PAGAR_PIX') {
            if (pixKey) navigator.clipboard.writeText(pixKey).then(() => setPortalInfo('PIX copiado!'));
        }
        try {
            const id = await portalService.submitPaymentIntent(loggedClient.id, selectedLoanId, loan.profile_id, tipo);
            setIntentId(id);
        } catch (e: any) {
            setPortalError('Erro ao registrar: ' + e.message);
        }
    };

    const handleReceiptUpload = async (file: File) => {
        if (!intentId || !loggedClient || !loan) return;
        try {
            setReceiptPreview(URL.createObjectURL(file));
            await portalService.uploadReceipt(file, intentId, loan.profile_id, loggedClient.id);
            setPortalInfo('Enviado com sucesso!');
        } catch (e: any) { setPortalError('Falha no envio: ' + e.message); }
    };

    // NOVA FUNÇÃO DE ASSINATURA NO PORTAL
    const handleSignDocument = async (type: 'CONFISSAO' | 'PROMISSORIA') => {
        if (!loggedClient || !loan) return;
        setIsSigning(true);
        try {
            // Busca documento já registrado pelo operador ou solicita criação via RPC segura
            const { data: docRecord } = await supabase.from('documentos_juridicos')
                .select('public_access_token')
                .eq('loan_id', loan.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!docRecord?.public_access_token) {
                throw new Error("O credor ainda não disponibilizou os títulos para assinatura digital.");
            }

            let ip = 'NAO_DETECTADO';
            try { const res = await fetch('https://api.ipify.org?format=json'); const data = await res.json(); ip = data.ip; } catch(e){}

            await legalPublicService.signDocumentPublicly(
                docRecord.public_access_token,
                { name: loggedClient.name, doc: loggedClient.document || loggedClient.cpf || loggedClient.cnpj || 'N/A' },
                { ip, userAgent: navigator.userAgent }
            );

            alert(`${type === 'CONFISSAO' ? 'Confissão de Dívida' : 'Nota Promissória'} assinada com sucesso! Uma cópia foi registrada na auditoria.`);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSigning(false);
        }
    };

    return {
        isLoading, isSigning, portalError, portalInfo,
        loginIdentifier, setLoginIdentifier, loginCode, setLoginCode,
        loggedClient, byeName, selectedLoanId,
        loan, installments, portalSignals, clientLoans, isAgreementActive,
        intentId, intentType, receiptPreview,
        handleLogin, handleLogout, handleSignalIntent, handleReceiptUpload, handleSignDocument
    };
};
