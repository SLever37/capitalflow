
import { useState, useEffect } from 'react';

export const usePortalRouting = () => {
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [legalSignToken, setLegalSignToken] = useState<string | null>(null);

  const updateTokensFromUrl = () => {
    // Usamos URLSearchParams no search (antes do hash)
    const params = new URLSearchParams(window.location.search);
    
    const pToken = params.get('portal');
    const lToken = params.get('legal_sign');

    if (pToken) setPortalToken(pToken);
    else setPortalToken(null);

    if (lToken) setLegalSignToken(lToken);
    else setLegalSignToken(null);
  };

  useEffect(() => {
    // Carregamento inicial
    updateTokensFromUrl();

    // Ouve mudanças no histórico para ser reativo
    window.addEventListener('popstate', updateTokensFromUrl);
    return () => window.removeEventListener('popstate', updateTokensFromUrl);
  }, []);

  return { portalToken, legalSignToken };
};
