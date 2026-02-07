
// services/pix.service.ts
import { supabase } from "../lib/supabase";

export type PixChargeCreateInput = {
  amount: number;
  payer_name?: string;
  payer_email?: string;
  payer_doc?: string | null;

  // Metadados para automação do fluxo
  source_id?: string | null; 
  loan_id?: string | null;
  installment_id?: string | null;
  payment_type?: 'RENEW_INTEREST' | 'FULL' | 'LEND_MORE'; 
  profile_id?: string;
};

export type PixChargeCreateResponse = {
  ok: boolean;
  charge_id?: string;
  provider_payment_id?: string;
  status?: string;
  provider_status?: string;
  qr_code?: string | null;
  qr_code_base64?: string | null;
  external_reference?: string;
  error?: string;
  step?: string;
};

export async function createPixCharge(input: PixChargeCreateInput): Promise<PixChargeCreateResponse> {
  // Invoca a função Edge usando o cliente Supabase configurado
  const { data, error } = await supabase.functions.invoke("mp-create-pix", {
    body: input,
  });

  if (error) {
    // Se erro de invocação (ex: 500, network error, function not found)
    console.error("Supabase Invoke Error:", error);
    return { ok: false, step: "invoke_mp-create-pix", error: error.message };
  }
  
  // Se a função retornou ok:false logicamente (ex: erro de validação interno)
  if (data && data.ok === false) {
      return { ok: false, error: data.error };
  }

  return data as PixChargeCreateResponse;
}

export async function fetchChargeById(chargeId: string) {
  return supabase
    .from("payment_charges")
    .select("id,status,provider_status,paid_at,updated_at,provider_payment_id,qr_code,qr_code_base64,amount")
    .eq("id", chargeId)
    .single();
}
