
import { useState, useEffect } from 'react';

export const usePortalRouting = () => {
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [legalSignToken, setLegalSignToken] = useState<string | null>(null);

  const updateTokensFromUrl = () => {
    // 1. Prioriza parâmetros na Query String (?portal=XXX)
    const params = new URLSearchParams(window.location.search);
    let pToken = params.get('portal');
    let lToken = params.get('legal_sign');

    // 2. Fallback para Hash (Legacy ou links antigos formatados incorretamente)
    if (!pToken && window.location.hash.includes('?portal=')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        pToken = hashParams.get('portal');
    }
    
    if (!lToken && window.location.hash.includes('?legal_sign=')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        lToken = hashParams.get('legal_sign');
    }

    setPortalToken(pToken || null);
    setLegalSignToken(lToken || null);
  };

  useEffect(() => {
    updateTokensFromUrl();

    // Reage a mudanças de navegação (botão voltar/hash change)
    window.addEventListener('popstate', updateTokensFromUrl);
    window.addEventListener('hashchange', updateTokensFromUrl);
    
    return () => {
        window.removeEventListener('popstate', updateTokensFromUrl);
        window.removeEventListener('hashchange', updateTokensFromUrl);
    };
  }, []);

  return { portalToken, legalSignToken };
};
