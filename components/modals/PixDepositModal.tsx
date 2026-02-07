
import React, { useMemo, useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { createPixCharge } from "../../services/pix.service";
import { Loader2, AlertTriangle, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

type PixDepositModalProps = {
  isOpen: boolean;
  onClose: () => void;
  sourceId?: string | null;
  profileId?: string;
};

export default function PixDepositModal({ isOpen, onClose, sourceId, profileId }: PixDepositModalProps) {
  const [amount, setAmount] = useState<string>("10.00");
  const [payerName, setPayerName] = useState<string>("Aporte Capital");
  const [payerEmail, setPayerEmail] = useState<string>("financeiro@capital.app");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [result, setResult] = useState<null | {
    charge_id: string;
    provider_payment_id: string;
    status: string;
    qr_code: string;
    qr_code_base64?: string | null;
  }>(null);

  const amountNumber = useMemo(() => {
    const normalized = (amount || "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const qrImgSrc = useMemo(() => {
    if (!result?.qr_code_base64) return null;
    if (result.qr_code_base64.startsWith("data:image/")) return result.qr_code_base64;
    return `data:image/png;base64,${result.qr_code_base64}`;
  }, [result?.qr_code_base64]);

  // Listener de Pagamento Realtime
  useEffect(() => {
      if (result?.charge_id) {
          const channel = supabase
              .channel(`deposit-${result.charge_id}`)
              .on(
                  'postgres_changes',
                  { event: 'UPDATE', schema: 'public', table: 'payment_charges', filter: `charge_id=eq.${result.charge_id}` },
                  (payload) => {
                      if (payload.new.status === 'PAID') {
                          setResult(prev => prev ? { ...prev, status: 'PAID' } : null);
                          // Opcional: Feedback sonoro
                          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                      }
                  }
              )
              .subscribe();
          return () => { supabase.removeChannel(channel); };
      }
  }, [result?.charge_id]);

  if (!isOpen) return null;

  async function handleCreatePix() {
    setErr(null);
    setResult(null);

    if (amountNumber <= 0) {
      setErr("Informe um valor maior que zero.");
      return;
    }
    
    if (!profileId) {
        setErr("Perfil de usuário não identificado. Recarregue a página.");
        return;
    }

    setLoading(true);
    try {
      const response = await createPixCharge({
        amount: amountNumber,
        payer_name: payerName,
        payer_email: payerEmail,
        source_id: sourceId ?? null,
        profile_id: profileId,
        payment_type: 'LEND_MORE' // Identificador para o webhook saber que é aporte
      });

      if (!response.ok) {
        throw new Error(response.error || "Falha na comunicação com o servidor de pagamentos.");
      }

      setResult({
        charge_id: response.charge_id!,
        provider_payment_id: response.provider_payment_id!,
        status: response.status || 'PENDING',
        qr_code: response.qr_code!,
        qr_code_base64: response.qr_code_base64
      });

    } catch (e: any) {
      console.error("Pix Error:", e);
      setErr(e?.message || "Erro desconhecido ao criar PIX.");
    } finally {
      setLoading(false);
    }
  }

  function copyText(txt: string) {
    try {
      navigator.clipboard.writeText(txt);
      alert("Código copiado!");
    } catch { }
  }

  return (
    <Modal onClose={onClose} title="Aporte de Capital (PIX)">
      <div className="space-y-4">
        {result?.status === 'PAID' ? (
            <div className="py-10 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mb-4 shadow-xl shadow-emerald-500/10">
                    <CheckCircle2 size={48} />
                </div>
                <h3 className="text-2xl font-black text-white uppercase">Depósito Confirmado!</h3>
                <p className="text-slate-400 text-sm mt-2">O valor foi adicionado à sua fonte.</p>
                <button onClick={onClose} className="mt-6 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold uppercase hover:bg-slate-700 transition-colors">
                    Fechar
                </button>
            </div>
        ) : !result ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Valor</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 p-3 rounded-xl text-white font-bold outline-none border border-slate-800 focus:border-blue-500 transition-colors"
                  placeholder="1000.00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Identificação</label>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="w-full bg-slate-950 p-3 rounded-xl text-white font-bold outline-none border border-slate-800 focus:border-blue-500 transition-colors"
                  placeholder="Seu Nome / Empresa"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">E-mail</label>
                <input
                  type="email"
                  value={payerEmail}
                  onChange={(e) => setPayerEmail(e.target.value)}
                  className="w-full bg-slate-950 p-3 rounded-xl text-white font-bold outline-none border border-slate-800 focus:border-blue-500 transition-colors"
                  placeholder="financeiro@empresa.com"
                />
              </div>
            </div>

            {err && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-500 flex-shrink-0" />
                <p className="text-[11px] text-rose-200 font-bold leading-tight">{err}</p>
              </div>
            )}
            
            <div className="bg-blue-900/10 border border-blue-500/20 p-3 rounded-xl">
                <p className="text-[10px] text-blue-200 leading-tight">
                    O valor será processado pelo Mercado Pago. Se você configurou seu token pessoal no perfil, o valor cairá na sua conta. Caso contrário, falhará.
                </p>
            </div>

            <button
              onClick={handleCreatePix}
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-xl uppercase transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18}/> : "Gerar QR Code PIX"}
            </button>
          </>
        ) : (
          <>
            <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded-xl text-center">
              <p className="text-[11px] text-emerald-200 font-bold">Aguardando Pagamento...</p>
              <p className="text-[10px] text-slate-400 mt-1">O sistema atualizará automaticamente assim que confirmar.</p>
            </div>

            {qrImgSrc && (
              <div className="flex justify-center bg-white p-4 rounded-xl shadow-lg">
                <img
                  src={qrImgSrc}
                  alt="QR Code PIX"
                  className="max-w-[240px] w-full mix-blend-multiply"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Código Copia e Cola</label>
              <div className="flex gap-2">
                <input
                    value={result.qr_code}
                    readOnly
                    className="w-full bg-slate-950 p-3 rounded-xl text-white text-[10px] font-mono outline-none border border-slate-800 truncate"
                />
                <button
                  onClick={() => copyText(result.qr_code)}
                  className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all"
                >
                  <Copy size={16}/>
                </button>
              </div>
            </div>
            
            <button
              onClick={() => { setResult(null); setErr(null); }}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold rounded-xl uppercase transition-all border border-slate-800 text-xs mt-2"
            >
              Voltar / Novo Aporte
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
