
import { useState, useEffect, useCallback, useRef } from 'react';
import { portalService, PortalSession } from '@/services/portal.service';
import { supabase } from '@/lib/supabase';
import { legalPublicService } from '@/features/legal/services/legalPublic.service';

const PORTAL_SESSION_KEY = 'cm_portal_session';

export const useClientPortalLogic = (initialLoanId: string) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSigning, setIsSigning] = useState(false);
    const [portalError, setPortalError] = useState<string | null>(null);
    const [portalInfo, setPortalInfo] = useState<string | null>(null);

    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loginCode, setLoginCode] = useState('');
    
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
        // Cancela requisição anterior se houver
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
            // BLOQUEIO ESTRITO: Ignora qualquer erro de cancelamento/aborto
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
        if (!loginIdentifier || !loginCode) {
            setPortalError("Preencha todos os campos.");
            return;
        }
        setPortalError(null);
        setIsLoading(true);
        try {
            const client = await portalService.authenticate(selectedLoanId, loginIdentifier, loginCode);
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
            // Evita mostrar AbortError no login se houver cancelamento
            if (e.name !== 'AbortError' && !e.message?.includes('abort')) {
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
            const { data: docRecord } = await supabase.from('documentos_juridicos')
                .select('public_access_token')
                .eq('loan_id', loan.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!docRecord?.public_access_token) {
                throw new Error("O credor ainda não disponibilizou os títulos para assinatura.");
            }

            let ip = 'DETECTANDO...';
            try { const res = await fetch('https://api.ipify.org?format=json'); const data = await res.json(); ip = data.ip; } catch(e){}

            await legalPublicService.signDocumentPublicly(
                docRecord.public_access_token,
                { name: loggedClient.name, doc: loggedClient.document || loggedClient.cpf || loggedClient.cnpj || 'N/A' },
                { ip, userAgent: navigator.userAgent }
            );

            alert(`${type === 'CONFISSAO' ? 'Confissão de Dívida' : 'Nota Promissória'} assinada com sucesso! Uma cópia foi registrada.`);
            loadFullPortalData(selectedLoanId, loggedClient.id);
        } catch (e: any) {
            if (e.name !== 'AbortError' && !e.message?.includes('abort')) {
                alert(e.message);
            }
        } finally {
            setIsSigning(false);
        }
    };

    return {
        isLoading, isSigning, portalError, portalInfo,
        loginIdentifier, setLoginIdentifier, loginCode, setLoginCode,
        loggedClient, byeName, selectedLoanId,
        loan, installments, portalSignals, isAgreementActive,
        intentId, intentType, receiptPreview,
        handleLogin, handleLogout, handleSignalIntent, handleReceiptUpload, handleSignDocument
    };
};
