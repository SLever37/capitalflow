import React, { useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { supabase } from "../../lib/supabase";

type PixDepositModalProps = {
  isOpen: boolean;
  onClose: () => void;
  // opcional: se você quiser amarrar no futuro com a fonte (carteira)
  sourceId?: string | null;
};

export default function PixDepositModal({ isOpen, onClose, sourceId }: PixDepositModalProps) {
  const [amount, setAmount] = useState<string>("10.00");
  const [payerName, setPayerName] = useState<string>("Teste PIX");
  const [payerEmail, setPayerEmail] = useState<string>("teste@pix.com");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [result, setResult] = useState<null | {
    charge_id: string;
    provider_payment_id: string;
    status: string;
    provider_status: string;
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
    // Se já vier com prefixo, usa direto. Se vier "puro", adiciona.
    if (result.qr_code_base64.startsWith("data:image/")) return result.qr_code_base64;
    return `data:image/png;base64,${result.qr_code_base64}`;
  }, [result?.qr_code_base64]);

  if (!isOpen) return null;

  async function handleCreatePix() {
    setErr(null);
    setResult(null);

    if (amountNumber <= 0) {
      setErr("Informe um valor maior que zero.");
      return;
    }

    setLoading(true);
    try {
      // CHAMA SUA EDGE FUNCTION (a que você já testou no AI Studio)
      const { data, error } = await supabase.functions.invoke("mp-create-pix", {
        body: {
          amount: amountNumber,
          payer_name: payerName,
          payer_email: payerEmail,
          source_id: sourceId ?? null,
        },
      });

      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || "Falha ao criar PIX.");
      }

      setResult({
        charge_id: data.charge_id,
        provider_payment_id: data.provider_payment_id,
        status: data.status,
        provider_status: data.provider_status,
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64 ?? null,
      });
    } catch (e: any) {
      setErr(e?.message || "Erro desconhecido ao criar PIX.");
    } finally {
      setLoading(false);
    }
  }

  function copyText(txt: string) {
    try {
      navigator.clipboard.writeText(txt);
    } catch {
      // fallback silencioso
    }
  }

  return (
    <Modal onClose={onClose} title="Depósito via PIX (Mercado Pago)">
      <div className="space-y-4">
        {!result && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Valor</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 p-3 rounded-xl text-white font-bold outline-none border border-slate-800 focus:border-blue-500 transition-colors"
                  placeholder="10.00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Nome</label>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="w-full bg-slate-950 p-3 rounded-xl text-white font-bold outline-none border border-slate-800 focus:border-blue-500 transition-colors"
                  placeholder="Cliente"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">E-mail</label>
                <input
                  type="email"
                  value={payerEmail}
                  onChange={(e) => setPayerEmail(e.target.value)}
                  className="w-full bg-slate-950 p-3 rounded-xl text-white font-bold outline-none border border-slate-800 focus:border-blue-500 transition-colors"
                  placeholder="cliente@email.com"
                />
              </div>
            </div>

            {err && (
              <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-xl">
                <p className="text-[11px] text-red-200 font-bold">{err}</p>
              </div>
            )}

            <button
              onClick={handleCreatePix}
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-xl uppercase transition-all shadow-lg"
            >
              {loading ? "Gerando PIX..." : "Gerar PIX"}
            </button>
          </>
        )}

        {result && (
          <>
            <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded-xl">
              <p className="text-[11px] text-emerald-200 font-bold">
                PIX criado (status: {result.status} / {result.provider_status})
              </p>
              <p className="text-[10px] text-slate-300 mt-1">
                payment_id: <span className="font-mono">{result.provider_payment_id}</span>
              </p>
            </div>

            {qrImgSrc && (
              <div className="flex justify-center">
                <img
                  src={qrImgSrc}
                  alt="QR Code PIX"
                  className="rounded-xl border border-slate-800 max-w-[320px] w-full"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Código Copia e Cola</label>
              <textarea
                value={result.qr_code}
                readOnly
                className="w-full bg-slate-950 p-3 rounded-xl text-white text-[11px] font-mono outline-none border border-slate-800"
                rows={5}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => copyText(result.qr_code)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl uppercase transition-all"
                >
                  Copiar código
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setErr(null);
                  }}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl uppercase transition-all border border-slate-800"
                >
                  Novo PIX
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}