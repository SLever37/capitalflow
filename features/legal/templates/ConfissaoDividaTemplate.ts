
import { LegalDocumentParams } from "../../../types";
import { formatMoney } from "../../../utils/formatters";
import { buildConfissaoDividaVM } from "../viewModels/confissaoVM";

export const generateConfissaoDividaHTML = (data: LegalDocumentParams, docId?: string, hash?: string, signatures: any[] = []) => {
    const vm = buildConfissaoDividaVM(data);

    const installmentsText = vm.installments
        .sort((a: any, b: any) => a.number - b.number)
        .map((i: any) => `
            <tr>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i.number}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${new Date(i.dueDate).toLocaleDateString('pt-BR')}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatMoney(i.amount)}</td>
            </tr>
        `)
        .join('');

    const findSig = (role: string) => signatures.find(s => s.role === role);

    const renderSignature = (role: string, name: string, docLabel: string, docValue: string) => {
        const sig = findSig(role);
        return `
            <div style="text-align: center; position: relative; min-height: 120px;">
                <div style="height: 60px; display: flex; align-items: center; justify-content: center;">
                    ${sig ? `
                        <div style="border: 2px solid #059669; color: #059669; padding: 5px; font-family: monospace; font-weight: bold; font-size: 7pt; transform: rotate(-2deg); background: rgba(5, 150, 105, 0.05);">
                            ASSINADO ELETRONICAMENTE<br/>
                            ID: ${sig.id.substring(0,8)}<br/>
                            DATA: ${new Date(sig.signed_at).toLocaleString('pt-BR')}<br/>
                            IP: ${sig.ip_origem}
                        </div>
                    ` : '<div style="border-bottom: 1px solid #000; width: 80%; margin-bottom: 5px;"></div>'}
                </div>
                <div style="font-size: 9pt; margin-top: 5px;">
                    <small style="text-transform: uppercase; font-weight: bold; color: #666;">${role.replace('_', ' ')}</small><br/>
                    <b>${name.toUpperCase()}</b><br/>
                    <small>${docLabel}: ${docValue || 'N/A'}</small>
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
            body { font-family: 'Times New Roman', serif; line-height: 1.5; color: #000; font-size: 11pt; padding: 0; margin: 0; }
            .container { max-width: 800px; margin: auto; }
            h1 { text-align: center; font-size: 14pt; border-bottom: 2px solid #000; padding-bottom: 10px; text-transform: uppercase; }
            h2 { font-size: 12pt; background: #f3f4f6; padding: 5px 10px; margin-top: 20px; border-left: 4px solid #000; }
            .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; page-break-inside: avoid; }
            .footer-info { margin-top: 50px; font-size: 8pt; color: #666; border-top: 1px dashed #ccc; padding-top: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div style="text-align: center; font-size: 9pt; font-weight: bold; margin-bottom: 10px;">TÍTULO EXECUTIVO EXTRAJUDICIAL (Art. 784, III CPC)</div>
            <h1>Confissão de Dívida e Compromisso de Pagamento</h1>

            <p><strong>CREDOR(A):</strong> ${vm.creditorName}, CPF/CNPJ: ${vm.creditorDoc}, com endereço em ${vm.creditorAddress}.</p>
            <p><strong>DEVEDOR(A):</strong> ${vm.debtorName}, CPF/CNPJ: ${vm.debtorDoc}, residente em ${vm.debtorAddress}.</p>

            <h2>1. OBJETO E RECONHECIMENTO</h2>
            <p>O(A) DEVEDOR(A) reconhece e confessa ser devedor(a) da importância de <strong>${vm.totalDebt}</strong>, referente à operação de crédito ID ${data.loanId.substring(0,8)}.</p>

            <h2>2. FORMA DE PAGAMENTO</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt;">
                <tr style="background: #eee;">
                    <th style="border: 1px solid #000; padding: 8px;">Parcela</th>
                    <th style="border: 1px solid #000; padding: 8px;">Vencimento</th>
                    <th style="border: 1px solid #000; padding: 8px;">Valor</th>
                </tr>
                ${installmentsText}
            </table>

            <h2>3. VALIDADE DAS ASSINATURAS</h2>
            <p>As partes concordam que as assinaturas eletrônicas realizadas neste portal possuem plena validade jurídica e eficácia executiva, nos termos da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020.</p>

            <p style="text-align: center; margin-top: 30px;">${vm.city}, ${new Date().toLocaleDateString('pt-BR')}</p>

            <div class="signatures-grid">
                ${renderSignature('CREDOR', vm.creditorName, 'DOC', vm.creditorDoc)}
                ${renderSignature('DEVEDOR', vm.debtorName, 'DOC', vm.debtorDoc)}
                ${renderSignature('TESTEMUNHA_1', data.witnesses?.[0]?.name || 'Testemunha 1', 'CPF', data.witnesses?.[0]?.document || '')}
                ${renderSignature('TESTEMUNHA_2', data.witnesses?.[1]?.name || 'Testemunha 2', 'CPF', data.witnesses?.[1]?.document || '')}
            </div>

            <div class="footer-info">
                <strong>Protocolo de Integridade:</strong><br/>
                ID Documento: ${docId || 'N/A'}<br/>
                Hash Principal (SHA-256): ${hash || 'N/A'}<br/>
                O registro eletrônico deste documento é imutável após a finalização das assinaturas.
            </div>
        </div>
    </body>
    </html>
    `;
};
