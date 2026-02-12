// hooks/usePortalRouting.ts
import { useState, useEffect } from 'react';

const isUUID = (v: string | null) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const usePortalRouting = () => {
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [legalSignToken, setLegalSignToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const portalParam = params.get('portal');
    const legalParam = params.get('legal_sign');

    // 🔒 Valida formato UUID antes de aceitar
    if (isUUID(portalParam)) {
      setPortalToken(portalParam);
    }

    if (isUUID(legalParam)) {
      setLegalSignToken(legalParam);
    }

    // 🔐 Remove tokens da URL após captura (evita exposição no histórico)
    if (portalParam || legalParam) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  return { portalToken, legalSignToken };
};