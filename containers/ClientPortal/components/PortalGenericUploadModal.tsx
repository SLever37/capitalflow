
import React, { useState, useRef } from 'react';
import { X, Upload, CheckCircle2, Loader2, FileText } from 'lucide-react';

interface PortalGenericUploadModalProps {
    onClose: () => void;
    onConfirmUpload: (file: File, description: string) => Promise<void>;
}

export const PortalGenericUploadModal: React.FC<PortalGenericUploadModalProps> = ({ onClose, onConfirmUpload }) => {
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!file) return;
        setIsUploading(true);
        try {
            await onConfirmUpload(file, description || 'Documento Diverso');
            setIsSuccess(true);
            setTimeout(onClose, 2500);
        } catch (e) {
            console.error(e);
            alert("Erro ao enviar documento.");
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2rem] p-6 shadow-2xl relative animate-in zoom-in-95">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <X size={20}/>
                </button>

                {isSuccess ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                            <CheckCircle2 size={40}/>
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg uppercase">Enviado!</h2>
                            <p className="text-slate-500 text-xs">O documento foi anexado ao seu cadastro.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-500">
                                <FileText size={24}/>
                            </div>
                            <h2 className="text-lg font-black text-white uppercase">Enviar Documento</h2>
                            <p className="text-xs text-slate-400 mt-1">RG, CPF, Comprovante de Residência, etc.</p>
                        </div>

                        <div className="space-y-3">
                            <input 
                                type="text" 
                                placeholder="Descrição (Ex: Meu RG)" 
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors"
                            />

                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:border-blue-500 hover:text-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer h-32 relative overflow-hidden"
                            >
                                {file ? (
                                    <div className="text-center">
                                        <FileText size={24} className="mx-auto mb-2 text-white"/>
                                        <p className="text-xs font-bold text-white truncate max-w-[200px]">{file.name}</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={24} className="mb-2"/>
                                        <p className="text-xs font-bold uppercase">Toque para anexar arquivo</p>
                                    </>
                                )}
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                        </div>

                        <button 
                            onClick={handleSubmit} 
                            disabled={!file || isUploading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            {isUploading ? <Loader2 className="animate-spin" size={16}/> : 'Enviar Agora'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
