
import { formatMoney } from "../../../utils/formatters";

export const DocumentTemplates = {
    // 1. NOTA PROMISSÓRIA (Decreto 2.044/1908)
    notaPromissoria: (data: any) => `
        <div style="font-family: 'Times New Roman', serif; border: 4px double #000; padding: 40px; max-width: 800px; margin: auto; background: #fff; color: #000;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 24pt;">NOTA PROMISSÓRIA</h1>
                <div style="border: 2px solid #000; padding: 5px 20px; font-size: 18pt; font-weight: bold;">${formatMoney(data.amount)}</div>
            </div>
            <p style="font-size: 14pt; line-height: 1.8; text-align: justify;">
                Ao(s) <b>${new Date(data.dueDate).toLocaleDateString('pt-BR')}</b> pagarei por esta única via de NOTA PROMISSÓRIA a <b>${data.creditorName}</b>, CPF/CNPJ ${data.creditorDoc}, ou à sua ordem, a quantia de <b>${data.amountText || formatMoney(data.amount)}</b> em moeda corrente deste país, pagável em <b>${data.city}</b>.
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

    // 2. NOTIFICAÇÃO EXTRAJUDICIAL (Constituição em Mora)
    notificacao: (data: any) => `
        <div style="font-family: Arial, sans-serif; padding: 50px; line-height: 1.6; color: #000; background: #fff;">
            <h1 style="text-align: center; text-decoration: underline;">NOTIFICAÇÃO EXTRAJUDICIAL</h1>
            <p style="text-align: right;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}</p>
            <p><b>À/Ao Sr(a). ${data.debtorName}</b><br/>CPF/CNPJ: ${data.debtorDoc}</p>
            <p>Ref: Inadimplemento do Contrato nº ${data.loanId.substring(0,8)}</p>
            <p style="text-indent: 2em;">Prezado(a),</p>
            <p style="text-indent: 2em;">Na qualidade de credor(a), notificamos V.Sa. que consta em nosso sistema um débito pendente no valor de <b>${formatMoney(data.totalDue)}</b>, vencido em ${new Date(data.dueDate).toLocaleDateString('pt-BR')}.</p>
            <p style="text-indent: 2em;">Solicitamos que a regularização ocorra no prazo de 48 horas. O não atendimento desta poderá acarretar a inscrição em órgãos de proteção ao crédito e o ajuizamento de ação de execução.</p>
            <p style="text-indent: 2em;">Caso o pagamento já tenha sido efetuado, favor desconsiderar e enviar o comprovante via portal.</p>
            <br/><br/>
            <p style="text-align: center;">Atenciosamente,<br/><b>${data.creditorName}</b></p>
        </div>
    `,

    // 3. TERMO DE QUITAÇÃO (Art. 320 Código Civil)
    quitacao: (data: any) => `
        <div style="font-family: 'Times New Roman', serif; padding: 60px; line-height: 2; border: 1px solid #ddd; background: #fff; color: #000;">
            <h1 style="text-align: center;">TERMO DE QUITAÇÃO E LIQUIDAÇÃO DE DÍVIDA</h1>
            <p style="text-indent: 3em;">Pelo presente instrumento, <b>${data.creditorName}</b>, inscrito(a) no CPF/CNPJ sob o nº ${data.creditorDoc}, declara para os devidos fins que recebeu de <b>${data.debtorName}</b>, CPF/CNPJ ${data.debtorDoc}, a importância total de ${formatMoney(data.totalPaid)}, referente ao contrato de mútuo ${data.loanId.substring(0,8)}.</p>
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
