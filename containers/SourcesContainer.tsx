
import React, { useState } from "react";
import PixDepositModal from "../components/modals/PixDepositModal";
import { SourcesPage } from "../pages/SourcesPage";
import { CapitalSource, UserProfile } from "../types";

interface SourcesContainerProps {
  sources: CapitalSource[];
  ui: any;
  sourceCtrl: any;
  loanCtrl: any;
  activeUser: UserProfile | null;
}

export const SourcesContainer: React.FC<SourcesContainerProps> = ({
  sources,
  ui,
  sourceCtrl,
  loanCtrl,
  activeUser,
}) => {
  // ✅ Modal PIX (usa sourceId porque é isso que o PixDepositModal espera)
  const [pixSourceId, setPixSourceId] = useState<string | null>(null);

  const openPixDeposit = (source: CapitalSource) => {
    setPixSourceId(source.id);
  };

  const closePixDeposit = () => {
    setPixSourceId(null);
  };

  return (
    <>
      <SourcesPage
        sources={sources}
        openConfirmation={loanCtrl.openConfirmation}
        handleUpdateSourceBalance={sourceCtrl.handleUpdateSourceBalance}
        isStealthMode={ui.isStealthMode}
        ui={ui}
        onOpenPixDeposit={openPixDeposit}
      />

      {/* ✅ Modal PIX com Profile ID para token correto */}
      <PixDepositModal
        isOpen={!!pixSourceId}
        onClose={closePixDeposit}
        sourceId={pixSourceId}
        profileId={activeUser?.id}
      />
    </>
  );
};
