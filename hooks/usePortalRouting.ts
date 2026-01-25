import { useState, useEffect } from 'react';

export const usePortalRouting = () => {
  const [portalLoanId, setPortalLoanId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portalId = params.get('portal');
    if (portalId) {
      setPortalLoanId(portalId);
    }
  }, []);

  return { portalLoanId };
};