import React, { useState, useEffect } from 'react';
import { legalDocumentService } from '../../services/legalDocument.service';
import { DocumentRenderer } from '../../components/DocumentRenderer';
import { Loader2, AlertTriangle, CheckCircle2, FileSignature, ArrowLeft, RefreshCw } from 'lucide-react';
import { maskDocument } from '../../utils/formatters';

interface DocumentViewerProps {
  token: string;
  docId: string;
  onBack: () => void;
  onSigned: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ token, docId, onBack, onSigned }) => {
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [canSign, setCanSign] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [role, setRole] = useState('DEVEDOR');
  const [signerName, setSignerName] = useState('');
  const [signerDoc, setSignerDoc] = useState('');

  useEffect(() => {
    loadDocument();
  }, [docId]);

  const loadDocument = async () => {
    setLoading(true);
    setError(null);
    try {
      const doc = await legalDocumentService.getDoc(token, docId);
      setDocument(doc);
      
      // Check missing fields
      const check: any = await legalDocumentService.missingFields(docId);
      setMissingFields(check.missing || []);
      setCanSign(check.can_sign);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar documento.');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signerName || !signerDoc) {
      alert('Preencha seu nome e CPF para assinar.');
      return;
    }
    
    if (!confirm('Ao continuar, você concorda com os termos deste documento e assina digitalmente com validade jurídica.')) return;

    setSigning(true);
    try {
      // Get IP (mock or real service)
      const ip = '127.0.0.1'; // In a real app, backend gets this or use a public IP service
      
      await legalDocumentService.signDoc({
        token,
        docId,
        role,
        name: signerName,
        cpf: signerDoc.replace(/\D/g, ''),
        ip,
        userAgent: navigator.userAgent
      });
      
      alert('Documento assinado com sucesso!');
      
      // Recarrega para confirmar status
      await loadDocument();
      onSigned();
    } catch (err: any) {
      alert('Erro ao assinar: ' + err.message);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Loader2 className="animate-spin mb-2" size={32}/>
        <p className="text-xs font-bold uppercase">Carregando documento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="mx-auto text-rose-500 mb-4" size={40}/>
        <h3 className="text-white font-bold mb-2">Erro ao abrir documento</h3>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button onClick={onBack} className="px-4 py-2 bg-slate-800 rounded-lg text-white text-xs font-bold uppercase">Voltar</button>
      </div>
    );
  }

  const isSigned = document?.status_assinatura === 'ASSINADO';

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
            <ArrowLeft size={20}/>
          </button>
          <div>
            <h2 className="text-white font-bold text-sm uppercase">{document.tipo || 'Documento'}</h2>
            <p className="text-[10px] text-slate-500">ID: {docId.substring(0,8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSigned ? (
             <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 border border-emerald-500/20">
               <CheckCircle2 size={12}/> Assinado
             </span>
          ) : (
             <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 border border-amber-500/20">
               <FileSignature size={12}/> Pendente
             </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative flex flex-col lg:flex-row">
        {/* Document Preview */}
        <div className="flex-1 bg-slate-200 p-4 overflow-y-auto">
           <div className="max-w-4xl mx-auto bg-white shadow-2xl min-h-[800px]">
              <DocumentRenderer htmlContent={document.snapshot_rendered_html} className="min-h-[800px]"/>
           </div>
        </div>

        {/* Sidebar Actions */}
        {!isSigned && (
          <div className="w-full lg:w-80 bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto">
            <h3 className="text-white font-bold uppercase text-xs mb-6 flex items-center gap-2">
              <FileSignature size={16} className="text-blue-500"/> Assinatura Digital
            </h3>

            {/* Missing Fields Warning */}
            {missingFields.length > 0 && (
              <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <p className="text-rose-400 text-[10px] font-black uppercase mb-3 flex items-center gap-1">
                  <AlertTriangle size={12}/> Dados Pendentes
                </p>
                <div className="space-y-2 mb-4">
                  {missingFields.map(field => (
                    <div key={field} className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        {field}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                    Este documento possui campos obrigatórios não preenchidos. Entre em contato com o emissor para correção antes de assinar.
                </p>
              </div>
            )}

            {/* Sign Form */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Assinar Como</label>
                <select 
                  value={role} 
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs outline-none focus:border-blue-500"
                >
                  <option value="DEVEDOR">Devedor (Titular)</option>
                  <option value="TESTEMUNHA_1">Testemunha 1</option>
                  <option value="TESTEMUNHA_2">Testemunha 2</option>
                  <option value="AVALISTA">Avalista</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  placeholder="Seu nome igual ao documento"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">CPF</label>
                <input 
                  type="text" 
                  value={signerDoc}
                  onChange={e => setSignerDoc(maskDocument(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleSign}
                  disabled={signing || !canSign}
                  className={`w-full py-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all ${
                    !canSign 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                  }`}
                >
                  {signing ? <Loader2 className="animate-spin" size={16}/> : <><FileSignature size={16}/> Assinar Documento</>}
                </button>
                {!canSign && missingFields.length === 0 && (
                   <p className="text-[9px] text-center text-slate-500 mt-2">Aguardando validação do sistema...</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
