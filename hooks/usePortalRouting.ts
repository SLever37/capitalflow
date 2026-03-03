// hooks/usePortalRouting.ts
import { useState, useEffect } from 'react';
import { supabasePortal } from '../lib/supabasePortal';

const isUUID = (v: string | null) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const usePortalRouting = () => {
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [legalSignToken, setLegalSignToken] = useState<string | null>(null);

  useEffect(() => {
    const validateAccess = async () => {
        const params = new URLSearchParams(window.location.search);
        const portalParam = params.get('portal');
        const codeParam = params.get('code');
        const legalParam = params.get('legal_sign');

        // 1. Validação do Portal (Token + Code)
        if (portalParam) {
            // Se não for UUID, já marca como inválido
            if (!isUUID(portalParam)) {
                setPortalToken('INVALID_ACCESS');
            } else {
                let finalCode = codeParam;

                // Se não tiver code, tenta buscar via RPC (Compatibilidade Retroativa)
                if (!finalCode) {
                    setPortalToken('VALIDATING');
                    try {
                        const { data: fetchedCode, error: fetchError } = await supabasePortal
                            .rpc('portal_get_shortcode_by_portal_token', { 
                                p_portal_token: portalParam 
                            });

                        if (fetchError || !fetchedCode) {
                            console.error("Portal Code Fetch Error:", fetchError);
                            setPortalToken('INVALID_ACCESS');
                            return;
                        }
                        
                        finalCode = fetchedCode as string;
                        
                        // Atualiza URL para incluir o code (Canonicalização)
                        const newUrl = new URL(window.location.href);
                        newUrl.searchParams.set('code', finalCode);
                        window.history.replaceState({}, document.title, newUrl.toString());
                    } catch (e) {
                        console.error("Portal Code Fetch Exception:", e);
                        setPortalToken('INVALID_ACCESS');
                        return;
                    }
                }

                // Agora valida o acesso com o code (existente ou recuperado)
                setPortalToken('VALIDATING');
                
                try {
                    const { data, error } = await supabasePortal.rpc('validate_portal_access', {
                        p_portal_token: portalParam,
                        p_shortcode: finalCode
                    });

                    if (error || !data) {
                        console.error("Portal Access Denied:", error);
                        setPortalToken('INVALID_ACCESS');
                    } else {
                        // Acesso permitido
                        setPortalToken(portalParam);
                    }
                } catch (e) {
                    console.error("Portal Validation Error:", e);
                    setPortalToken('INVALID_ACCESS');
                }
            }
        }

        // 2. Validação Legal Sign (Mantida original por enquanto)
        if (isUUID(legalParam)) {
            setLegalSignToken(legalParam);
        }

        // 🔐 Remove tokens da URL após captura (apenas se validado com sucesso ou se for legal sign)
        // Nota: Para portalToken, mantemos na URL se for VALIDATING ou INVALID_ACCESS para debug visual,
        // mas o ideal é limpar se for sucesso.
        // O código original limpava sempre. Vamos manter o comportamento de limpar se for sucesso ou legalParam.
        if ((portalToken && portalToken !== 'VALIDATING' && portalToken !== 'INVALID_ACCESS') || legalParam) {
             // Opcional: limpar URL. Mas como estamos redirecionando com code, talvez seja melhor manter para o usuário ver.
             // O requisito original dizia "Remove tokens da URL após captura".
             // Mas o novo requisito diz "Canonicalizar para o formato completo com code".
             // Se limparmos, o usuário perde o link canonicalizado.
             // Vamos manter o link canonicalizado na URL se for portal.
             
             if (legalParam) {
                 const cleanUrl = window.location.origin + window.location.pathname;
                 window.history.replaceState({}, document.title, cleanUrl);
             }
        }
    };

    validateAccess();
  }, []); // Executa apenas uma vez na montagem

  return { portalToken, legalSignToken };
};