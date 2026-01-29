
import { formatMoney } from "../../../utils/formatters";

export const DocumentTemplates = {
    // 1. CONFISSÃO DE DÍVIDA (Art. 784, III CPC)
    confissaoDivida: (data: any) => `
        <div style="font-family: 'Times New Roman', serif; padding: 50px; line-height: 1.5; color: #000; background: #fff; max-width: 900px; margin: auto; text-align: justify;">
            <h2 style="text-align: center; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px;">Instrumento Particular de Confissão de Dívida</h2>
            <p style="text-align: right; font-size: 10pt;">ID Controle: ${data.loanId?.substring(0, 8) || '---'}</p>
            
            <p><strong>CREDOR(A):</strong> ${data.creditorName}, inscrito(a) no CPF/CNPJ sob o nº ${data.creditorDoc}, residente e domiciliado(a) em ${data.creditorAddress}.</p>
            <p><strong>DEVEDOR(A):</strong> ${data.debtorName}, inscrito(a) no CPF/CNPJ sob o nº ${data.debtorDoc}, residente e domiciliado(a) em ${data.debtorAddress || 'Endereço não informado'}.</p>

            <p>Pelo presente instrumento, o(a) DEVEDOR(A) confessa e reconhece ser devedor(a) da quantia líquida, certa e exigível de <strong>${formatMoney(data.amount)}</strong>, referente ao contrato de mútuo financeiro.</p>

            <h4>CLÁUSULAS:</h4>
            <p><strong>1. DO PAGAMENTO:</strong> O débito será pago conforme cronograma disponível no Portal do Cliente, sob pena de vencimento antecipado das parcelas vincendas.</p>
            <p><strong>2. DOS ENCARGOS:</strong> O atraso implicará em multa de ${data.finePercent}% e juros de mora de ${data.dailyInterestPercent}% ao dia.</p>
            <p><strong>3. DA VALIDADE DIGITAL:</strong> As partes reconhecem a validade da assinatura eletrônica deste documento nos termos da Medida Provisória nº 2.200-2/2001 e Lei nº 14.063/2020.</p>
            <p><strong>4. DO FORO:</strong> Fica eleito o foro da comarca de ${data.city} para dirimir quaisquer controvérsias.</p>

            <p style="margin-top: 40px; text-align: center;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}.</p>

            <div style="margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
                <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px;">
                    <small>DEVEDOR(A)</small><br/><b>${data.debtorName}</b>
                </div>
                <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px;">
                    <small>CREDOR(A)</small><br/><b>${data.creditorName}</b>
                </div>
                <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px; margin-top: 20px;">
                    <small>TESTEMUNHA 1</small><br/><br/>CPF:
                </div>
                <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px; margin-top: 20px;">
                    <small>TESTEMUNHA 2</small><br/><br/>CPF:
                </div>
            </div>
            
            <div style="margin-top: 40px; padding: 10px; border: 1px dashed #ccc; font-size: 8pt; color: #666; font-family: monospace;">
                HASH DE INTEGRIDADE SHA-256: ${data.hash || '---'}<br/>
                ASSINATURA DIGITAL DISPONÍVEL EM: ${window.location.origin}/?portal=${data.loanId}
            </div>
        </div>
    `,

    // 2. NOTA PROMISSÓRIA (Decreto 2.044/1908)
    notaPromissoria: (data: any) => `
        <div style="font-family: 'Times New Roman', serif; border: 4px double #000; padding: 40px; max-width: 800px; margin: auto; background: #fff; color: #000;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 24pt;">NOTA PROMISSÓRIA</h1>
                <div style="border: 2px solid #000; padding: 5px 20px; font-size: 18pt; font-weight: bold;">${formatMoney(data.amount)}</div>
            </div>
            <p style="font-size: 14pt; line-height: 1.8; text-align: justify;">
                Ao(s) <b>${new Date(data.dueDate).toLocaleDateString('pt-BR')}</b> pagarei por esta única via de NOTA PROMISSÓRIA a <b>${data.creditorName}</b>, CPF/CNPJ ${data.creditorDoc}, ou à sua ordem, a quantia de <b>${formatMoney(data.amount)}</b> em moeda corrente deste país, pagável em <b>${data.city}</b>.
            </p>
            <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                <div>
                    <small>EMITENTE (DEVEDOR):</small><br/>
                    <b>${data.debtorName}</b><br/>
                    CPF/CNPJ: ${data.debtorDoc}<br/>
                    ${data.debtorAddress}
                </div>
                <div style="text-align: right;">
                    <small>DATA DE EMISSÃO:</small><br/>
                    <b>${new Date().toLocaleDateString('pt-BR')}</b>
                </div>
            </div>
            <div style="margin-top: 60px; border-top: 1px solid #000; width: 60%; margin-left: auto; text-align: center; padding-top: 5px;">
                ASSINATURA DO EMITENTE
            </div>
        </div>
    `,

    // 3. NOTIFICAÇÃO EXTRAJUDICIAL
    notificacao: (data: any) => `
        <div style="font-family: Arial, sans-serif; padding: 50px; line-height: 1.6; color: #000; background: #fff;">
            <h1 style="text-align: center; text-decoration: underline;">NOTIFICAÇÃO EXTRAJUDICIAL</h1>
            <p style="text-align: right;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}</p>
            <p><b>À/Ao Sr(a). ${data.debtorName}</b><br/>CPF/CNPJ: ${data.debtorDoc}</p>
            <p>Ref: Inadimplemento do Contrato nº ${data.loanId?.substring(0,8)}</p>
            <p style="text-indent: 2em;">Prezado(a),</p>
            <p style="text-indent: 2em;">Na qualidade de credor(a), notificamos V.Sa. que consta em nosso sistema um débito pendente no valor de <b>${formatMoney(data.totalDue)}</b>, vencido em ${new Date(data.dueDate).toLocaleDateString('pt-BR')}.</p>
            <p style="text-indent: 2em;">Solicitamos que a regularização ocorra no prazo de 48 horas através do Portal do Cliente. O não atendimento desta poderá acarretar a inscrição em órgãos de proteção ao crédito e medidas jurídicas.</p>
            <p style="text-indent: 2em;">Link para Regularização: ${window.location.origin}/?portal=${data.loanId}</p>
            <br/><br/>
            <p style="text-align: center;">Atenciosamente,<br/><b>${data.creditorName}</b></p>
        </div>
    `,

    // 4. TERMO DE QUITAÇÃO (Art. 320 Código Civil)
    quitacao: (data: any) => `
        <div style="font-family: 'Times New Roman', serif; padding: 60px; line-height: 2; border: 1px solid #ddd; background: #fff; color: #000;">
            <h1 style="text-align: center;">TERMO DE QUITAÇÃO E LIQUIDAÇÃO DE DÍVIDA</h1>
            <p style="text-indent: 3em;">Pelo presente instrumento, <b>${data.creditorName}</b>, inscrito(a) no CPF/CNPJ sob o nº ${data.creditorDoc}, declara para os devidos fins que recebeu de <b>${data.debtorName}</b>, CPF/CNPJ ${data.debtorDoc}, a importância total de ${formatMoney(data.totalPaid)}, referente ao contrato de mútuo ${data.loanId?.substring(0,8)}.</p>
            <p style="text-indent: 3em;">Com o recebimento desta quantia, o credor dá ao devedor a mais plena, rasa, geral e irrevogável <b>QUITAÇÃO</b> para nada mais reclamar a qualquer título, no presente ou no futuro, em relação à dívida mencionada.</p>
            <p style="text-align: center; margin-top: 50px;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}.</p>
            <div style="margin-top: 80px; display: flex; justify-content: center;">
                <div style="border-top: 1px solid #000; width: 300px; text-align: center; padding-top: 10px;">
                    <b>${data.creditorName}</b><br/>Credor(a)
                </div>
            </div>
        </div>
    `
};
