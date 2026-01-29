
import { useState, useEffect } from 'react';

export const usePortalRouting = () => {
  const [portalLoanId, setPortalLoanId] = useState<string | null>(null);
  const [legalSignToken, setLegalSignToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Portal do Cliente (Visualização de Dívida)
    const portalId = params.get('portal');
    if (portalId) {
      setPortalLoanId(portalId);
    }

    // Portal de Assinatura Jurídica (Título Executivo)
    const legalToken = params.get('legal_sign');
    if (legalToken) {
      setLegalSignToken(legalToken);
    }
  }, []);

  return { portalLoanId, legalSignToken };
};
