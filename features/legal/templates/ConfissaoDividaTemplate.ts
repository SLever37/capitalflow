import { LegalDocumentParams } from "../../../types";
import { formatMoney, numberToWordsBRL } from "../../../utils/formatters";
import { buildConfissaoDividaVM } from "../viewModels/confissaoVM";

export const generateConfissaoDividaHTML = (data: LegalDocumentParams, docId?: string, hash?: string, signatures: any[] = []) => {
    const vm = buildConfissaoDividaVM(data);
    const findSig = (role: string) => signatures.find(s => s.role === role);

    const renderSignatureBlock = (role: string, name: string, doc: string) => {
        const sig = findSig(role);
        return `
            <div style="text-align: center; padding: 15px; border: 1px solid #f1f5f9; border-radius: 8px; position: relative; min-height: 120px; display: flex; flex-direction: column; justify-content: flex-end;">
                ${sig ? `
                    <div style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); width: 85%; border: 2px solid #10b981; color: #10b981; padding: 5px; font-family: monospace; font-size: 7pt; font-weight: bold; background: rgba(16,185,129,0.05); text-transform: uppercase; line-height: 1.2;">
                        Assinado Eletronicamente<br/>
                        IP: ${sig.ip_origem}<br/>
                        ${new Date(sig.signed_at).toLocaleString('pt-BR')}<br/>
                        HASH: ${sig.assinatura_hash.substring(0,12)}
                    </div>
                ` : '<div style="width: 80%; border-bottom: 1px solid #334155; margin: 0 auto 10px auto;"></div>'}
                <div style="font-size: 9pt; color: #1e293b;">
                    <b style="text-transform: uppercase;">${name}</b><br/>
                    <span style="color: #64748b; font-size: 8pt;">${role.replace('_', ' ')}</span><br/>
                    <small style="color: #94a3b8;">DOC: ${doc || 'N/A'}</small>
                </div>
            </div>
        `;
    };

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <style>
            @page { size: A4; margin: 2.5cm; }
            body { font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #1e293b; font-size: 11pt; padding: 0; margin: 0; }
            .container { max-width: 800px; margin: auto; }
            .header-box { text-align: center; border: 2px solid #1e293b; padding: 20px; margin-bottom: 30px; }
            h1 { font-size: 14pt; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
            h2 { font-size: 11pt; border-left: 4px solid #3b82f6; padding-left: 10px; margin: 25px 0 15px 0; text-transform: uppercase; color: #334155; }
            .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px; page-break-inside: avoid; }
            .compliance-footer { margin-top: 50px; font-size: 8pt; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #f8fafc; font-size: 9pt; text-transform: uppercase; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header-box">
                <h1>Instrumento Particular de Confissão de Dívida</h1>
                <div style="font-size: 9pt; font-weight: bold; margin-top: 5px;">TÍTULO EXECUTIVO EXTRAJUDICIAL (Art. 784, III CPC)</div>
            </div>

            <p><strong>CREDOR(A):</strong> ${vm.creditorName}, inscrito no CPF/CNPJ sob nº ${vm.creditorDoc}, com sede/endereço em ${vm.creditorAddress}.</p>
            <p><strong>DEVEDOR(A):</strong> ${vm.debtorName}, inscrito no CPF/CNPJ sob nº ${vm.debtorDoc}, residente em ${vm.debtorAddress}.</p>

            <h2>1. DO RECONHECIMENTO DA DÍVIDA</h2>
            <p>Pelo presente instrumento, o(a) <strong>DEVEDOR(A)</strong> reconhece e confessa ser devedor(a) legítimo(a) da importância líquida e certa de <strong>${vm.totalDebt} (${numberToWordsBRL(data.totalDebt)})</strong>, correspondente ao montante total da operação ID ${data.loanId.substring(0,8)}.</p>

            <h2>2. DO PLANO DE PAGAMENTO</h2>
            <p>O montante acima confessado será liquidado mediante o seguinte cronograma de parcelas:</p>
            <table>
                <thead>
                    <tr>
                        <th>Parcela</th>
                        <th>Vencimento</th>
                        <th>Valor Nominal</th>
                    </tr>
                </thead>
                <tbody>
                    // Fix: cast installment item to any to avoid property access errors on unknown type (number, dueDate, amount)
                    ${vm.installments.map((i: any) => `
                        <tr>
                            <td>${i.number || '—'}ª</td>
                            <td>${new Date(i.dueDate).toLocaleDateString('pt-BR')}</td>
                            <td>${formatMoney(i.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <h2>3. DA EFICÁCIA EXECUTIVA E ASSINATURA</h2>
            <p>Este documento constitui título executivo extrajudicial, apto para execução imediata em caso de inadimplemento. As partes elegem as assinaturas eletrônicas aqui colhidas como válidas e íntegras nos termos da MP 2.200-2/2001.</p>

            <p style="text-align: center; margin-top: 30px;">${vm.city}, ${new Date().toLocaleDateString('pt-BR')}</p>

            <div class="signatures-grid">
                ${renderSignatureBlock('CREDOR', vm.creditorName, vm.creditorDoc)}
                ${renderSignatureBlock('DEVEDOR', vm.debtorName, vm.debtorDoc)}
                ${renderSignatureBlock('TESTEMUNHA_1', data.witnesses?.[0]?.name || 'Testemunha 1', data.witnesses?.[0]?.document || '')}
                ${renderSignatureBlock('TESTEMUNHA_2', data.witnesses?.[1]?.name || 'Testemunha 2', data.witnesses?.[1]?.document || '')}
            </div>

            <div class="compliance-footer">
                <strong>Protocolo CapitalFlow Compliance:</strong><br/>
                ID Título: ${docId || 'S/N'} | Hash Integridade: ${hash || 'PENDENTE'}<br/>
                Certificado de integridade gerado mediante carimbo de tempo forense e registro de IP de todos os signatários.
            </div>
        </div>
    </body>
    </html>
    `;
};
