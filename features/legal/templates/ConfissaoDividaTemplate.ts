
import { LegalDocumentParams } from "../../../types";
import { formatMoney } from "../../../utils/formatters";

export const generateConfissaoDividaHTML = (data: LegalDocumentParams, docId?: string, hash?: string) => {
    const installmentsText = data.installments
        .sort((a, b) => a.number - b.number)
        .map(i => `
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
            .clause-title { font-weight: bold; text-decoration: underline; }
            .signature-box { margin-top: 60px; display: flex; flex-direction: column; gap: 50px; align-items: center; page-break-inside: avoid; }
            .sign-line { width: 80%; border-top: 1px solid #000; text-align: center; padding-top: 5px; }
            .witnesses { margin-top: 60px; display: flex; justify-content: space-between; gap: 40px; width: 100%; page-break-inside: avoid; }
            .witness-line { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 9pt; }
            .header-box { border: 2px solid #000; padding: 15px; margin-bottom: 30px; text-align: center; background-color: #f9f9f9; }
            .footer-hash { margin-top: 50px; border-top: 1px dashed #999; padding-top: 10px; font-size: 8pt; text-align: center; color: #555; font-family: 'Courier New', Courier, monospace; word-break: break-all; }
            
            @media print {
                body { padding: 0; margin: 0; }
                .no-print { display: none; }
                .header-box { background-color: #fff !important; }
            }
        </style>
    </head>
    <body>
        <div class="header-box">
            <b>INSTRUMENTO PARTICULAR DE CONFISSÃO DE DÍVIDA COM PROMESSA DE PAGAMENTO</b><br>
            <span style="font-size: 10pt; font-weight: normal;">TÍTULO EXECUTIVO EXTRAJUDICIAL (ART. 784, III, CPC)</span>
        </div>

        <p>Pelo presente instrumento particular, e na melhor forma de direito, as partes abaixo qualificadas têm, entre si, justo e contratado o seguinte:</p>

        <h2>1. DAS PARTES</h2>
        
        <p><b>CREDOR(A):</b> <b>${data.creditorName.toUpperCase()}</b>, inscrito(a) no CPF/CNPJ sob o nº ${data.creditorDoc}, com endereço situado em ${data.creditorAddress || '__________________'}.</p>
        
        <p><b>DEVEDOR(A):</b> <b>${data.debtorName.toUpperCase()}</b>, inscrito(a) no CPF/CNPJ sob o nº ${data.debtorDoc}, com contato telefônico <b>${data.debtorPhone || '000.000.000-00'}</b>, residente e domiciliado(a) em ${data.debtorAddress}.</p>

        <h2>2. DO RECONHECIMENTO DA DÍVIDA E ORIGEM</h2>
        
        <p><b>CLÁUSULA PRIMEIRA:</b> O <b>DEVEDOR</b> reconhece e confessa expressamente, de forma livre, consciente, irrevogável e irretratável, que é devedor da quantia líquida, certa e exigível de <b>${formatMoney(data.totalDebt)}</b> em favor do <b>CREDOR</b>.</p>
        
        <p><b>Parágrafo Único:</b> A presente dívida tem origem na consolidação de débitos anteriores, especificamente relacionados ao Contrato Original (ID Sistema: <i>${data.originDescription.split('ID: ')[1]?.split(')')[0] || 'N/A'}</i>) e ao Acordo de Inadimplência firmado nesta data, cujos valores foram atualizados e aceitos pelo <b>DEVEDOR</b>.</p>

        <h2>3. DA FORMA DE PAGAMENTO</h2>
        
        <p><b>CLÁUSULA SEGUNDA:</b> O <b>DEVEDOR</b> compromete-se a liquidar o valor confessado mediante o pagamento de ${data.installments.length} parcelas, conforme cronograma abaixo:</p>
        
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

        <p><b>Parágrafo Primeiro:</b> O pagamento deverá ser realizado via PIX, Transferência Bancária ou em moeda corrente nacional, servindo o comprovante de transferência ou recibo emitido pelo <b>CREDOR</b> como prova de quitação da respectiva parcela.</p>

        <h2>4. DO INADIMPLEMENTO E VENCIMENTO ANTECIPADO</h2>
        
        <p><b>CLÁUSULA TERCEIRA:</b> O não pagamento de qualquer parcela na data de seu vencimento constituirá o <b>DEVEDOR</b> em mora de pleno direito, independentemente de notificação judicial ou extrajudicial, sujeitando-o ao pagamento dos seguintes encargos sobre o valor em atraso:</p>
        <ul>
            <li>a) Multa moratória irredutível de 10% (dez por cento);</li>
            <li>b) Juros de mora de 1% (um por cento) ao mês, calculados <i>pro rata die</i>;</li>
            <li>c) Atualização monetária pelo índice IGP-M/FGV (ou índice oficial substituto).</li>
        </ul>

        <p><b>CLÁUSULA QUARTA (VENCIMENTO ANTECIPADO):</b> O atraso superior a 10 (dez) dias no pagamento de qualquer parcela ou a infração de qualquer cláusula deste instrumento acarretará o <b>VENCIMENTO ANTECIPADO</b> de todas as parcelas vincendas, tornando-se a dívida total imediatamente exigível, autorizando o <b>CREDOR</b> a promover a imediata <b>EXECUÇÃO JUDICIAL</b> deste título.</p>

        <h2>5. DA NÃO NOVAÇÃO E GARANTIAS</h2>
        
        <p><b>CLÁUSULA QUINTA:</b> O presente acordo <b>NÃO CONFIGURA NOVAÇÃO</b> (Art. 360 do Código Civil), servindo apenas para confirmar e renegociar a forma de pagamento do débito originário. Permanecem válidas e eficazes todas as garantias, avais e obrigações acessórias constituídas no contrato original, que poderão ser executadas em caso de descumprimento deste instrumento.</p>

        <h2>6. DAS RENÚNCIAS E DISPOSIÇÕES GERAIS</h2>
        
        <p><b>CLÁUSULA SEXTA:</b> O <b>DEVEDOR</b> renuncia expressamente a qualquer benefício de ordem, bem como à alegação futura de desconhecimento dos termos aqui pactuados ou de inexigibilidade do título.</p>
        
        <p><b>CLÁUSULA SÉTIMA (TÍTULO EXECUTIVO):</b> As partes atribuem ao presente instrumento a eficácia de <b>TÍTULO EXECUTIVO EXTRAJUDICIAL</b>, nos termos do artigo 784, inciso III, do Código de Processo Civil Brasileiro.</p>

        <h2>7. DA ASSINATURA ELETRÔNICA</h2>
        
        <p><b>CLÁUSULA OITAVA:</b> As partes reconhecem a validade jurídica, autoria e integridade da assinatura deste contrato por meio eletrônico, digital ou biométrico, concordando expressamente com a utilização de tais meios de comprovação de autoria e integridade, conforme disposto na Medida Provisória nº 2.200-2/2001 e na Lei nº 14.063/2020.</p>

        <h2>8. DO FORO</h2>
        
        <p><b>CLÁUSULA NONA:</b> Fica eleito o foro da comarca de <b>${data.city.toUpperCase()}</b> para dirimir quaisquer dúvidas ou litígios oriundos deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>

        <p>E, por estarem assim justos e contratados, firmam o presente instrumento em 02 (duas) vias de igual teor e forma, na presença de 02 (duas) testemunhas, para que produza seus jurídicos e legais efeitos.</p>

        <p style="text-align: center; margin-top: 40px;">${data.city}, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>

        <div class="signature-box">
            <div class="sign-line">
                <b>${data.debtorName.toUpperCase()}</b><br>
                DEVEDOR(A)<br>
                CPF: ${data.debtorDoc}
            </div>

            <div class="sign-line">
                <b>${data.creditorName.toUpperCase()}</b><br>
                CREDOR<br>
                CPF/CNPJ: ${data.creditorDoc}
            </div>
        </div>

        <div class="witnesses">
            <div class="witness-line">
                <br>__________________________________<br>
                <b>TESTEMUNHA 1</b><br>
                Nome:<br>
                CPF:
            </div>
            <div class="witness-line">
                <br>__________________________________<br>
                <b>TESTEMUNHA 2</b><br>
                Nome:<br>
                CPF:
            </div>
        </div>
        
        <div class="footer-hash">
            <b>REGISTRO DE INTEGRIDADE DIGITAL (IMMUTABLE SNAPSHOT)</b><br>
            Este documento foi gerado eletronicamente e sua integridade é garantida por Hash Criptográfico.<br>
            <b>ID Único:</b> ${docId || 'PENDENTE'} <br>
            <b>Hash SHA-256:</b> ${hash || 'AGUARDANDO ASSINATURA...'} <br>
            Gerado pelo Sistema CapitalFlow em ${new Date().toLocaleString('pt-BR')}.<br>
            <span style="font-size: 7pt;">Qualquer rasura ou alteração neste conteúdo invalidará o Hash acima.</span>
        </div>
    </body>
    </html>
    `;
};
