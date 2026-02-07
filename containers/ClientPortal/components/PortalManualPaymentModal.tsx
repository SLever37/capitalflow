
import React, { useState, useRef } from 'react';
import { X, Copy, Upload, CheckCircle2, Loader2, DollarSign } from 'lucide-react';

interface PortalManualPaymentModalProps {
    onClose: () => void;
    pixKey: string;
    onConfirmUpload: (file: File) => Promise<void>;
}

export const PortalManualPaymentModal: React.FC<PortalManualPaymentModalProps> = ({ onClose, pixKey, onConfirmUpload }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCopy = () => {
        if (pixKey) {
            navigator.clipboard.writeText(pixKey);
            alert("Chave PIX copiada!");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreview(URL.createObjectURL(f));
        }
    };

    const handleSubmit = async () => {
        if (!file) return;
        setIsUploading(true);
        try {
            await onConfirmUpload(file);
            setIsSuccess(true);
            setTimeout(onClose, 3000);
        } catch (e) {
            console.error(e);
            alert("Erro ao enviar comprovante.");
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
                            <h2 className="text-white font-bold text-lg uppercase">Recebido!</h2>
                            <p className="text-slate-500 text-xs">O comprovante foi enviado para análise.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-500">
                                <DollarSign size={24}/>
                            </div>
                            <h2 className="text-lg font-black text-white uppercase">Pagamento Manual</h2>
                            <p className="text-xs text-slate-400 mt-1">Copie a chave, faça o PIX e envie o comprovante.</p>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Chave PIX do Operador</p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-900 p-3 rounded-lg border border-slate-800 text-white font-mono text-xs truncate">
                                    {pixKey || 'Chave não cadastrada'}
                                </div>
                                <button onClick={handleCopy} className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">
                                    <Copy size={16}/>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:border-blue-500 hover:text-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer h-40 relative overflow-hidden"
                            >
                                {preview ? (
                                    <img src={preview} alt="Comprovante" className="absolute inset-0 w-full h-full object-cover opacity-50"/>
                                ) : (
                                    <>
                                        <Upload size={24} className="mb-2"/>
                                        <p className="text-xs font-bold uppercase">Toque para anexar comprovante</p>
                                    </>
                                )}
                                {preview && <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 text-white font-bold text-xs uppercase"><CheckCircle2 className="mr-2"/> Arquivo Selecionado</div>}
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                        </div>

                        <button 
                            onClick={handleSubmit} 
                            disabled={!file || isUploading}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            {isUploading ? <Loader2 className="animate-spin" size={16}/> : 'Confirmar Envio'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
