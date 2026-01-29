
import { LegalDocumentParams } from "../../../types";
import { formatMoney } from "../../../utils/formatters";
import { buildConfissaoDividaVM } from "../viewModels/confissaoVM";

export const generateConfissaoDividaHTML = (data: LegalDocumentParams, docId?: string, hash?: string, signatures?: any[]) => {
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

    // Preenche testemunhas se disponíveis
    const witness1 = signatures?.find(s => s.signer_email?.includes('Operador')) || { signer_name: '_______________________________', signer_document: '' };
    const witness2 = signatures?.find(s => s.signer_email?.includes('System')) || { signer_name: '_______________________________', signer_document: '' };

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Instrumento Particular de Confissão de Dívida</title>
        <style>
            @page { size: A4; margin: 2.5cm 2cm 2.5cm 2cm; }
            body { font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 20px; font-size: 11pt; text-align: justify; background: #fff; }
            h1 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; margin-top: 0; border-bottom: 2px solid #000; padding-bottom: 10px; }
            h2 { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 20px; margin-bottom: 10px; background-color: #eee; padding: 5px; }
            p { margin-bottom: 10px; text-indent: 1cm; }
            ul { list-style-type: none; padding-left: 0; }
            li { margin-bottom: 5px; text-indent: 1cm; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt; }
            .header-box { border: 1px solid #000; padding: 10px; margin-bottom: 20px; font-size: 9pt; text-align: center; }
            .signatures { margin-top: 60px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 40px; page-break-inside: avoid; }
            .sign-box { width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 5px; font-size: 10pt; margin-bottom: 30px; }
            .footer-legal { 
                margin-top: 50px; 
                border-top: 1px solid #000; 
                padding-top: 10px; 
                font-size: 8pt; 
                text-align: center; 
                font-family: Arial, sans-serif;
                color: #444;
            }
            .manifesto-box {
                margin-top: 30px;
                border: 1px dashed #666;
                background-color: #f9f9f9;
                padding: 10px;
                font-size: 8pt;
                font-family: 'Courier New', Courier, monospace;
                page-break-inside: avoid;
            }
            .hash-tag { font-family: 'Courier New', monospace; font-weight: bold; background: #f0f0f0; padding: 2px 5px; }
            @media print { body { padding: 0; margin: 0; } .header-box { background-color: #fff !important; } }
        </style>
    </head>
    <body>
        <div class="header-box">
            <strong>TÍTULO EXECUTIVO EXTRAJUDICIAL</strong><br>
            (Artigo 784, inciso III, do Código de Processo Civil)
        </div>

        <h1>Instrumento Particular de Confissão de Dívida</h1>

        <p>Pelo presente instrumento particular, de um lado:</p>

        <p><b>CREDOR(A):</b> <b>${vm.creditorName}</b>, inscrito(a) no CPF/CNPJ sob o nº ${vm.creditorDoc}, com endereço em ${vm.creditorAddress}.</p>
        
        <p>e de outro lado,</p>
        
        <p><b>DEVEDOR(A):</b> <b>${vm.debtorName}</b>, inscrito(a) no CPF/CNPJ sob o nº ${vm.debtorDoc}, telefone <b>${vm.debtorPhone}</b>, residente e domiciliado(a) em ${vm.debtorAddress}.</p>

        <p>Têm entre si, justo e contratado, o presente termo, mediante as cláusulas e condições seguintes:</p>

        <h2>1. DO RECONHECIMENTO DA DÍVIDA</h2>
        <p><b>CLÁUSULA PRIMEIRA:</b> O <b>DEVEDOR</b> reconhece e confessa, de forma livre e consciente, irrevogável e irretratável, dever ao <b>CREDOR</b> a quantia líquida, certa e exigível de <b>${vm.totalDebt}</b>, referente à ${vm.originDescription}.</p>

        <h2>2. DO PAGAMENTO</h2>
        <p><b>CLÁUSULA SEGUNDA:</b> O valor confessado será pago em ${vm.installments.length} parcelas, conforme cronograma abaixo:</p>
        
        <table>
            <thead>
                <tr style="background-color: #ddd;">
                    <th style="border: 1px solid #000; padding: 5px;">Parcela</th>
                    <th style="border: 1px solid #000; padding: 5px;">Vencimento</th>
                    <th style="border: 1px solid #000; padding: 5px;">Valor</th>
                </tr>
            </thead>
            <tbody>
                ${installmentsText}
            </tbody>
        </table>

        <h2>3. DOS ENCARGOS E MORA</h2>
        <p><b>CLÁUSULA TERCEIRA:</b> O inadimplemento de qualquer parcela na data aprazada constituirá o <b>DEVEDOR</b> em mora de pleno direito, independentemente de notificação, sujeitando-o ao pagamento de:</p>
        <ul>
            <li>a) Multa moratória de 10% (dez por cento) sobre o valor do débito;</li>
            <li>b) Juros de mora de 1% (um por cento) ao mês;</li>
            <li>c) Correção monetária pelo índice IGP-M/FGV.</li>
        </ul>

        <h2>4. DO VENCIMENTO ANTECIPADO</h2>
        <p><b>CLÁUSULA QUARTA:</b> Fica convencionado o <b>VENCIMENTO ANTECIPADO</b> de toda a dívida, tornando-a imediatamente exigível em sua totalidade, em caso de atraso superior a 10 (dez) dias no pagamento de qualquer parcela ou insolvência do DEVEDOR.</p>

        <h2>5. DA ASSINATURA ELETRÔNICA</h2>
        <p><b>CLÁUSULA QUINTA:</b> As partes reconhecem expressamente a validade jurídica da assinatura eletrônica aposta neste instrumento, nos termos do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020. Declaram reconhecer como válidos e autênticos os meios de comprovação de autoria e integridade utilizados, incluindo o registro de IP, data, hora e o hash criptográfico SHA-256 gerado pelo sistema.</p>

        <h2>6. DO FORO</h2>
        <p><b>CLÁUSULA SEXTA:</b> As partes elegem o foro da comarca de <b>${vm.city}</b> para dirimir quaisquer questões oriundas deste instrumento, renunciando a qualquer outro, por mais privilegiado que seja.</p>

        <p style="text-align: center; margin-top: 40px; margin-bottom: 40px;">${vm.city}, ${vm.date}.</p>

        <div class="signatures">
            <div class="sign-box">
                <b>${vm.debtorName}</b><br>
                DEVEDOR(A)<br>
                <span style="font-size: 8pt;">Assinado Eletronicamente</span>
            </div>

            <div class="sign-box">
                <b>${vm.creditorName}</b><br>
                CREDOR(A)<br>
                <span style="font-size: 8pt;">Assinado Eletronicamente</span>
            </div>

            <div class="sign-box">
                <b>${witness1.signer_name}</b><br>
                TESTEMUNHA 1 (Operador)<br>
                <span style="font-size: 8pt;">CPF: ${witness1.signer_document || 'N/A'}</span>
            </div>

            <div class="sign-box">
                <b>${witness2.signer_name}</b><br>
                TESTEMUNHA 2 (Sistema)<br>
                <span style="font-size: 8pt;">Hash: ${witness2.assinatura_hash ? witness2.assinatura_hash.substring(0,8) : 'N/A'}...</span>
            </div>
        </div>
        
        <div class="manifesto-box">
            <strong>MANIFESTO DE ASSINATURA E INTEGRIDADE</strong><br/>
            Este documento foi gerado e assinado digitalmente através da plataforma CapitalFlow.<br/>
            <ul>
                <li><strong>ID Único:</strong> ${docId || 'PENDENTE'}</li>
                <li><strong>Hash SHA-256 (Conteúdo Original):</strong> ${hash || 'GERANDO...'}</li>
                <li><strong>Carimbo de Tempo:</strong> ${new Date().toISOString()}</li>
                <li><strong>Legislação:</strong> Lei 14.063/2020, MP 2.200-2/2001, CPC Art. 784 III.</li>
            </ul>
            <p style="margin:0; text-indent:0;">A integridade deste documento pode ser verificada recalculando o Hash SHA-256 do seu conteúdo JSON canônico.</p>
        </div>
    </body>
    </html>
    `;
};
