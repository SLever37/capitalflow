
import { useState, useEffect, useCallback, useRef } from 'react';
import { portalService, PortalSession } from '../../../services/portal.service';
import { supabase } from '../../../lib/supabase';
import { legalPublicService } from '../../legal/services/legalPublic.service';

const PORTAL_SESSION_KEY = 'cm_portal_session';

export const useClientPortalLogic = (initialLoanId: string) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSigning, setIsSigning] = useState(false);
    const [portalError, setPortalError] = useState<string | null>(null);
    const [portalInfo, setPortalInfo] = useState<string | null>(null);

    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loggedClient, setLoggedClient] = useState<any | null>(null);
    const [byeName, setByeName] = useState<string | null>(null);
    
    const [selectedLoanId, setSelectedLoanId] = useState<string>(initialLoanId);
    const [loan, setLoan] = useState<any | null>(null);
    const [pixKey, setPixKey] = useState<string>('');
    const [installments, setInstallments] = useState<any[]>([]);
    const [portalSignals, setPortalSignals] = useState<any[]>([]);
    const [isAgreementActive, setIsAgreementActive] = useState(false);

    const [intentId, setIntentId] = useState<string | null>(null);
    const [intentType, setIntentType] = useState<string | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    
    const loadFullPortalData = useCallback(async (loanId: string, clientId: string) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsLoading(true);
        setPortalError(null);
        try {
            const data = await portalService.fetchLoanData(loanId, clientId);
            setLoan(data.loan);
            setPixKey(data.pixKey);
            setPortalSignals(data.signals || []);
            setInstallments(data.installments || []);
            setIsAgreementActive(data.isAgreementActive || false);
        } catch (e: any) {
            const isAbortError = e.name === 'AbortError' || 
                                e.message?.toLowerCase().includes('abort') || 
                                e.message?.toLowerCase().includes('canceled');
            
            if (!isAbortError) {
                setPortalError('Falha ao sincronizar dados do contrato.');
                console.error("Portal Data Sync Error:", e);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const checkSession = async () => {
            const params = new URLSearchParams(window.location.search);
            const magicCode = params.get('code');
            const portalId = params.get('portal');

            if (magicCode && portalId) {
                try {
                    const clientData = await portalService.validateMagicLink(portalId, magicCode);
                    setLoggedClient(clientData);
                    setSelectedLoanId(portalId);
                    
                    const session: PortalSession = {
                        client_id: clientData.id,
                        access_code: 'MAGIC_LINK', 
                        identifier: 'MAGIC_LINK',
                        last_loan_id: portalId,
                        saved_at: new Date().toISOString()
                    };
                    localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
                    setIsLoading(false);
                    return;
                } catch (e) {
                    console.error("Magic Link falhou.");
                }
            }

            try {
                const raw = localStorage.getItem(PORTAL_SESSION_KEY);
                if (!raw) { setIsLoading(false); return; }
                const sess = JSON.parse(raw) as PortalSession;
                if (sess.client_id) {
                    setLoggedClient({ id: sess.client_id, name: 'Cliente' }); 
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
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, []);

    useEffect(() => {
        if (selectedLoanId && loggedClient) {
            loadFullPortalData(selectedLoanId, loggedClient.id);
        }
    }, [selectedLoanId, loggedClient, loadFullPortalData]);

    const handleLogin = async () => {
        if (!loginIdentifier) {
            setPortalError("Informe seu CPF, Telefone ou Código.");
            return;
        }
        setPortalError(null);
        setIsLoading(true);
        try {
            const client = await portalService.authenticate(selectedLoanId, loginIdentifier);
            setLoggedClient(client);
            setByeName(null);
            
            const session: PortalSession = {
                client_id: client.id,
                access_code: 'FRICTIONLESS',
                identifier: loginIdentifier,
                last_loan_id: selectedLoanId,
                saved_at: new Date().toISOString()
            };
            localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
        } catch (e: any) {
            if (e.name !== 'AbortError') {
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
        setLoan(null);
    };

    const handleSignalIntent = async (tipo: string) => {
        if (!loggedClient || !loan) return;
        setPortalError(null);
        setIntentType(tipo);
        if (tipo === 'PAGAR_PIX' && pixKey) {
            navigator.clipboard.writeText(pixKey).then(() => setPortalInfo('Chave PIX copiada!'));
        }
        try {
            const id = await portalService.submitPaymentIntent(loggedClient.id, selectedLoanId, loan.profile_id, tipo);
            setIntentId(id);
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                setPortalError('Erro ao registrar intenção: ' + e.message);
            }
        }
    };

    const handleReceiptUpload = async (file: File) => {
        if (!intentId || !loggedClient || !loan) return;
        try {
            setReceiptPreview(URL.createObjectURL(file));
            await portalService.uploadReceipt(file, intentId, loan.profile_id, loggedClient.id);
            setPortalInfo('Comprovante enviado com sucesso!');
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                setPortalError('Falha no upload: ' + e.message);
            }
        }
    };

    const handleSignDocument = async (type: 'CONFISSAO' | 'PROMISSORIA') => {
        if (!loggedClient || !loan || isSigning) return;
        setIsSigning(true);
        try {
            // Busca token de acesso público via RPC de segurança
            const { data: records, error: fetchError } = await supabase.rpc('get_documento_juridico_by_loan', { p_loan_id: loan.id });

            if (fetchError || !records || records.length === 0) {
                throw new Error("Nenhum título localizado para assinatura.");
            }

            // CORREÇÃO: Utiliza view_token conforme schema do banco
            const token = records[0].view_token; 
            
            if (!token) {
                throw new Error("Token de visualização não disponível no documento.");
            }

            let ip = 'DETECTANDO...';
            try { const res = await fetch('https://api.ipify.org?format=json'); const data = await res.json(); ip = data.ip; } catch(e){}

            await legalPublicService.signDocumentPublicly(
                token,
                { 
                    name: loggedClient.name, 
                    doc: loggedClient.document || loggedClient.cpf || loggedClient.cnpj || 'N/A',
                    role: 'DEVEDOR'
                },
                { ip, userAgent: navigator.userAgent }
            );

            alert(`${type === 'CONFISSAO' ? 'Confissão de Dívida' : 'Nota Promissória'} assinada com sucesso!`);
            loadFullPortalData(selectedLoanId, loggedClient.id);
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                alert(e.message);
            }
        } finally {
            setIsSigning(false);
        }
    };

    return {
        isLoading, isSigning, portalError, portalInfo,
        loginIdentifier, setLoginIdentifier, 
        loginCode: '', setLoginCode: () => {}, 
        loggedClient, byeName, selectedLoanId,
        loan, installments, portalSignals, isAgreementActive,
        intentId, intentType, receiptPreview,
        pixKey,
        handleLogin, handleLogout, handleSignalIntent, handleReceiptUpload, handleSignDocument,
        loadFullPortalData 
    };
};
