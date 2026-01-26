
import React from 'react';
import { ProfilePage } from '../pages/ProfilePage';
import { UserProfile, Client, Loan, CapitalSource } from '../types';
import { filesService } from '../services/files.service';

interface ProfileContainerProps {
  activeUser: UserProfile;
  clients: Client[];
  loans: Loan[];
  sources: CapitalSource[];
  ui: any;
  profileCtrl: any;
  handleLogout: () => void;
  showToast: any;
  profileEditForm: UserProfile | null;
  setProfileEditForm: (val: UserProfile) => void;
  fileCtrl: any;
}

export const ProfileContainer: React.FC<ProfileContainerProps> = ({
  activeUser, clients, loans, sources, ui, profileCtrl, handleLogout, showToast, profileEditForm, setProfileEditForm, fileCtrl
}) => {
  return (
    <ProfilePage 
        activeUser={activeUser} 
        clients={clients}
        loans={loans}
        sources={sources}
        ui={ui}
        profileCtrl={profileCtrl}
        showToast={showToast}
        setDonateModal={ui.setDonateModal} 
        handleLogout={handleLogout} 
        setResetDataModal={ui.setResetDataModal} 
        handleDeleteAccount={profileCtrl.handleDeleteAccount}
        profileEditForm={profileEditForm} 
        setProfileEditForm={setProfileEditForm} 
        handleSaveProfile={profileCtrl.handleSaveProfile} 
        handlePhotoUpload={profileCtrl.handlePhotoUpload}
        handleRestoreBackup={profileCtrl.handleRestoreBackup}
        handleExportBackup={() => filesService.handleExportBackup(activeUser, clients, loans, sources, showToast)}
        handleImportExcel={fileCtrl.handleFilePick}
        profilePhotoInputRef={ui.profilePhotoInputRef}
        fileInputExcelRef={ui.fileInputExcelRef}
    />
  );
};
