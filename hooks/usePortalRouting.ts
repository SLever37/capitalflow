
import { useState, useEffect } from 'react';

export const usePortalRouting = () => {
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [legalSignToken, setLegalSignToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Acesso ao Portal Financeiro (Token UUID)
    const token = params.get('portal');
    if (token) setPortalToken(token);

    // Acesso à Assinatura Jurídica (Token UUID)
    const legal = params.get('legal_sign');
    if (legal) setLegalSignToken(legal);
  }, []);

  return { portalToken, legalSignToken };
};
