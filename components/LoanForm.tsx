
import React from 'react';
import { Loan, Client, CapitalSource, UserProfile } from '../types';
import { X, Camera, History } from 'lucide-react';
import { useLoanForm } from '../features/loans/hooks/useLoanForm';
import { LoanFormClientSection } from './forms/LoanFormClientSection';
import { LoanFormFinancialSection } from './forms/LoanFormFinancialSection';
import { LoanFormDocumentsSection } from './forms/LoanFormDocumentsSection';
import { LoanFormActions } from './forms/LoanFormActions';

interface LoanFormProps {
  onAdd: (loan: Loan) => void;
  onCancel: () => void;
  initialData?: Loan | null;
  clients: Client[];
  sources: CapitalSource[];
  userProfile?: UserProfile | null;
}

export const LoanForm: React.FC<LoanFormProps> = (props) => {
  const {
    formData, setFormData,
    fixedDuration, setFixedDuration,
    skipWeekends, setSkipWeekends,
    isSubmitting, isUploading,
    attachments, customDocuments,
    showCamera, videoRef, fileInputRef,
    autoDueDate, isDailyModality,
    startCamera, takePhoto, stopCamera,
    handleClientSelect, handlePickContact,
    handleFileUpload, toggleDocVisibility, removeDoc,
    handleSubmit
  } = useLoanForm(props);

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-start md:items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] sm:rounded-[3rem] w-full max-w-6xl p-5 sm:p-12 shadow-2xl my-4 md:my-auto animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-6 sm:mb-10">
            <div>
                <h2 className="text-xl sm:text-3xl font-black text-white tracking-tighter uppercase leading-none">
                  {props.initialData ? 'Ajustar Contrato' : 'Novo Empréstimo'}
                </h2>
            </div>
            <button onClick={() => { if(showCamera.active) stopCamera(); props.onCancel(); }} className="p-2 sm:p-3 bg-slate-800 text-slate-500 hover:text-white rounded-full transition-colors">
              <X size={20}/>
            </button>
        </div>

        {props.initialData && (
            <div className="mb-6 bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-lg text-slate-500"><History size={16}/></div>
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-500">Auditoria do Contrato</p>
                    <p className="text-xs text-slate-300 font-bold">Criado em: {new Date(props.initialData.createdAt || props.initialData.startDate).toLocaleString('pt-BR')}</p>
                </div>
            </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
            
            {/* COLUNA 1: CLIENTE */}
            <LoanFormClientSection 
                clients={props.clients}
                formData={formData}
                setFormData={setFormData}
                handleClientSelect={handleClientSelect}
                handlePickContact={handlePickContact}
            />

            {/* COLUNA 2: FINANCEIRO */}
            <LoanFormFinancialSection 
                sources={props.sources}
                formData={formData}
                setFormData={setFormData}
                isDailyModality={isDailyModality}
                fixedDuration={fixedDuration}
                setFixedDuration={setFixedDuration}
                autoDueDate={autoDueDate}
                skipWeekends={skipWeekends}
                setSkipWeekends={setSkipWeekends}
            />

            {/* COLUNA 3: GARANTIAS & DOCUMENTOS */}
            <LoanFormDocumentsSection 
                formData={formData}
                setFormData={setFormData}
                attachments={attachments}
                customDocuments={customDocuments}
                startCamera={startCamera}
                fileInputRef={fileInputRef}
                isUploading={isUploading}
                handleFileUpload={handleFileUpload}
                toggleDocVisibility={toggleDocVisibility}
                removeDoc={removeDoc}
            />
          </div>

          <LoanFormActions 
            isSubmitting={isSubmitting} 
            isEditing={!!props.initialData} 
          />
        </form>
      </div>
      {showCamera.active && (
        <div className="fixed inset-0 z-[110] bg-slate-950 flex flex-col items-center justify-center p-6">
          <div className="mb-6 text-white text-[10px] font-black uppercase tracking-[0.3em] bg-blue-600 px-6 py-2 rounded-full">MODO CAPTURA</div>
          <video ref={videoRef} autoPlay playsInline className="w-full max-w-2xl h-auto border-4 border-slate-900 rounded-[2rem] shadow-2xl shadow-blue-900/20" />
          <div className="mt-8 sm:mt-12 flex gap-10">
            <button onClick={stopCamera} className="p-6 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-rose-600 transition-all shadow-xl"><X size={28}/></button>
            <button onClick={takePhoto} className="p-10 bg-white rounded-full text-black shadow-2xl shadow-white/10 active:scale-90 transition-transform"><Camera size={36}/></button>
          </div>
        </div>
      )}
    </div>
  );
};
