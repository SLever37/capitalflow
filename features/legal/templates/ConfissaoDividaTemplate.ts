
import { LegalDocumentParams } from "../../../types";
import { formatMoney } from "../../../utils/formatters";
import { buildConfissaoDividaVM } from "../viewModels/confissaoVM";

export const generateConfissaoDividaHTML = (data: LegalDocumentParams, docId?: string, hash?: string) => {
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

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Instrumento de Confissão de Dívida</title>
        <style>
            @page { size: A4; margin: 2.5cm 2cm 2cm 2cm; }
            body { font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 20px; font-size: 11pt; text-align: justify; background: #fff; }
            h1 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; margin-top: 0; }
            h2 { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 20px; margin-bottom: 10px; }
            p { margin-bottom: 10px; text-indent: 0; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt; }
            .signature-box { margin-top: 60px; display: flex; flex-direction: column; gap: 50px; align-items: center; page-break-inside: avoid; }
            .sign-line { width: 80%; border-top: 1px solid #000; text-align: center; padding-top: 5px; }
            .witnesses { margin-top: 60px; display: flex; justify-content: space-between; gap: 40px; width: 100%; page-break-inside: avoid; }
            .witness-line { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 9pt; }
            .header-box { border: 2px solid #000; padding: 15px; margin-bottom: 30px; text-align: center; background-color: #f9f9f9; }
            .footer-hash { margin-top: 50px; border-top: 1px dashed #999; padding-top: 10px; font-size: 8pt; text-align: center; color: #555; font-family: 'Courier New', Courier, monospace; word-break: break-all; }
            @media print { body { padding: 0; margin: 0; } .header-box { background-color: #fff !important; } }
        </style>
    </head>
    <body>
        <div class="header-box">
            <b>INSTRUMENTO PARTICULAR DE CONFISSÃO DE DÍVIDA COM PROMESSA DE PAGAMENTO</b><br>
            <span style="font-size: 10pt; font-weight: normal;">TÍTULO EXECUTIVO EXTRAJUDICIAL (ART. 784, III, CPC)</span>
        </div>

        <p>Pelo presente instrumento particular, e na melhor forma de direito, as partes abaixo qualificadas têm, entre si, justo e contratado o seguinte:</p>

        <h2>1. DAS PARTES</h2>
        
        <p><b>CREDOR(A):</b> <b>${vm.creditorName}</b>, inscrito(a) no CPF/CNPJ sob o nº ${vm.creditorDoc}, com endereço situado em ${vm.creditorAddress}.</p>
        
        <p><b>DEVEDOR(A):</b> <b>${vm.debtorName}</b>, inscrito(a) no CPF/CNPJ sob o nº ${vm.debtorDoc}, com contato telefônico <b>${vm.debtorPhone}</b>, residente e domiciliado(a) em ${vm.debtorAddress}.</p>

        <h2>2. DO RECONHECIMENTO DA DÍVIDA E ORIGEM</h2>
        
        <p><b>CLÁUSULA PRIMEIRA:</b> O <b>DEVEDOR</b> reconhece e confessa expressamente, de forma livre, consciente, irrevogável e irretratável, que é devedor da quantia líquida, certa e exigível de <b>${vm.totalDebt}</b> em favor do <b>CREDOR</b>.</p>
        
        <p><b>Parágrafo Único:</b> A presente dívida tem origem na consolidação de débitos anteriores: <i>${vm.originDescription}</i>.</p>

        <h2>3. DA FORMA DE PAGAMENTO</h2>
        
        <p><b>CLÁUSULA SEGUNDA:</b> O <b>DEVEDOR</b> compromete-se a liquidar o valor confessado mediante o pagamento de ${vm.installments.length} parcelas, conforme cronograma abaixo:</p>
        
        <table>
            <thead>
                <tr style="background-color: #eee;">
                    <th style="border: 1px solid #000; padding: 5px;">Parcela</th>
                    <th style="border: 1px solid #000; padding: 5px;">Vencimento</th>
                    <th style="border: 1px solid #000; padding: 5px;">Valor</th>
                </tr>
            </thead>
            <tbody>
                ${installmentsText}
            </tbody>
        </table>

        <h2>4. DO INADIMPLEMENTO E VENCIMENTO ANTECIPADO</h2>
        
        <p><b>CLÁUSULA TERCEIRA:</b> O não pagamento de qualquer parcela na data de seu vencimento constituirá o <b>DEVEDOR</b> em mora de pleno direito, independentemente de notificação judicial ou extrajudicial, sujeitando-o ao pagamento dos seguintes encargos sobre o valor em atraso:</p>
        <ul>
            <li>a) Multa moratória irredutível de 10% (dez por cento);</li>
            <li>b) Juros de mora de 1% (um por cento) ao mês, calculados <i>pro rata die</i>;</li>
            <li>c) Atualização monetária pelo índice IGP-M/FGV (ou índice oficial substituto).</li>
        </ul>

        <p><b>CLÁUSULA QUARTA (VENCIMENTO ANTECIPADO):</b> O atraso superior a 10 (dez) dias no pagamento de qualquer parcela acarretará o <b>VENCIMENTO ANTECIPADO</b> de todas as parcelas vincendas.</p>

        <h2>5. DO FORO</h2>
        
        <p><b>CLÁUSULA NONA:</b> Fica eleito o foro da comarca de <b>${vm.city}</b> para dirimir quaisquer dúvidas ou litígios oriundos deste instrumento.</p>

        <p style="text-align: center; margin-top: 40px;">${vm.city}, ${vm.date}.</p>

        <div class="signature-box">
            <div class="sign-line">
                <b>${vm.debtorName}</b><br>
                DEVEDOR(A)<br>
                CPF: ${vm.debtorDoc}
            </div>

            <div class="sign-line">
                <b>${vm.creditorName}</b><br>
                CREDOR<br>
                CPF/CNPJ: ${vm.creditorDoc}
            </div>
        </div>

        <div class="witnesses">
            <div class="witness-line"><br>__________________________________<br><b>TESTEMUNHA 1</b><br>CPF:</div>
            <div class="witness-line"><br>__________________________________<br><b>TESTEMUNHA 2</b><br>CPF:</div>
        </div>
        
        <div class="footer-hash">
            <b>REGISTRO DE INTEGRIDADE DIGITAL (IMMUTABLE SNAPSHOT)</b><br>
            Este documento foi gerado eletronicamente e sua integridade é garantida por Hash Criptográfico.<br>
            <b>ID Único:</b> ${docId || 'PENDENTE'} <br>
            <b>Hash SHA-256:</b> ${hash || 'AGUARDANDO ASSINATURA...'} <br>
            <span style="font-size: 7pt;">Qualquer rasura ou alteração neste conteúdo invalidará o Hash acima.</span>
        </div>
    </body>
    </html>
    `;
};
