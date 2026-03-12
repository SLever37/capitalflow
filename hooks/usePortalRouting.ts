// hooks/usePortalRouting.ts
import { useState, useEffect } from 'react';
import { supabasePortal } from '../lib/supabasePortal';
import { portalService } from '../services/portal.service';

const isUUID = (v: string | null) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const usePortalRouting = () => {
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [portalCode, setPortalCode] = useState<string | null>(null);
  const [legalSignToken, setLegalSignToken] = useState<string | null>(null);

  useEffect(() => {
    const validateAccess = async () => {
        const params = new URLSearchParams(window.location.search);
        const portal = params.get('portal');
        const code = params.get('code');
        const legalParam = params.get('legal_sign');

        // 1. Validação do Portal (Token + Code)
        // portal -> token, code -> shortcode
        if (portal || code) {
            if (!portal || !code) {
                console.error("Portal Access: Missing portal token or security code.");
                setPortalToken('INVALID_ACCESS');
                setPortalCode(null);
                return;
            }

            setPortalToken('VALIDATING');
            setPortalCode(null); // Limpa código anterior enquanto valida
            
            try {
                const { data, error } = await supabasePortal.rpc('validate_portal_access', {
                    p_token: portal,
                    p_shortcode: code
                });

                if (error || data !== true) {
                    console.error("Portal Access Denied:", error || 'Invalid access');
                    setPortalToken('INVALID_ACCESS');
                } else {
                    // Acesso permitido
                    await portalService.markViewed(portal, code);
                    setPortalToken(portal);
                    setPortalCode(code);
                }
            } catch (e) {
                console.error("Portal Validation Error:", e);
                setPortalToken('PORTAL_UNAVAILABLE');
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

  return { portalToken, portalCode, legalSignToken };
};