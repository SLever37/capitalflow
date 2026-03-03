
import { formatMoney, numberToWordsBRL } from "../../../utils/formatters";

export const DocumentTemplates = {
    // 1. CONFISSÃO DE DÍVIDA (Art. 784, III CPC)
    confissaoDivida: (data: any) => `
        <div style="font-family: 'Times New Roman', serif; padding: 50px; line-height: 1.6; color: #000; background: #fff; max-width: 850px; margin: auto; text-align: justify; border: 1px solid #eee;">
            <div style="text-align: center; border: 2px solid #000; padding: 15px; margin-bottom: 30px;">
                <h2 style="margin: 0; text-transform: uppercase; letter-spacing: 1px;">Instrumento Particular de Confissão de Dívida</h2>
                <small style="font-weight: bold;">TÍTULO EXECUTIVO EXTRAJUDICIAL - ART. 784, III DO CPC</small>
            </div>
            
            <p><strong>CREDOR(A):</strong> ${data.creditorName}, CPF/CNPJ sob o nº ${data.creditorDoc}, com endereço profissional em ${data.creditorAddress}.</p>
            <p><strong>DEVEDOR(A):</strong> ${data.debtorName}, CPF/CNPJ sob o nº ${data.debtorDoc}, residente e domiciliado(a) em ${data.debtorAddress || 'Endereço não informado'}.</p>

            <p>Pelo presente instrumento, o(a) <strong>DEVEDOR(A)</strong> reconhece e confessa, de forma irrevogável e irretratável, nos termos dos Artigos 389, 394 e 395 do Código Civil Brasileiro, ser devedor(a) da quantia líquida, certa e exigível de <strong>${formatMoney(data.amount)} (${numberToWordsBRL(data.amount)})</strong>.</p>

            <h4 style="text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 5px; margin-top: 25px;">CLÁUSULAS E CONDIÇÕES:</h4>
            
            <p><strong>1. DO OBJETO:</strong> A dívida ora reconhecida é líquida e certa, referente à operação de mútuo financeiro detalhada no contrato eletrônico ID ${data.loanId.substring(0,8)}.</p>
            
            <p><strong>2. DO PAGAMENTO:</strong> O pagamento será realizado conforme as condições pactuadas no contrato original ou termo de acordo anexo, mediante transferência bancária, PIX ou boleto emitido pelo CREDOR.</p>

            <p><strong>3. DA MORA E INADIMPLEMENTO:</strong> O não pagamento de qualquer parcela no seu vencimento importará no vencimento antecipado de toda a dívida, sujeitando o DEVEDOR ao pagamento do valor principal acrescido de:</p>
            <ul style="list-style-type: disc; margin-left: 20px;">
                <li>Correção monetária pelo índice INPC/IBGE (ou outro índice oficial que o substitua);</li>
                <li>Juros de mora de 1% (um por cento) ao mês, calculados pro rata die;</li>
                <li>Multa moratória de 2% (dois por cento) sobre o valor do débito;</li>
                <li>Honorários advocatícios de 20% (vinte por cento) em caso de cobrança judicial ou extrajudicial.</li>
            </ul>

            <p><strong>4. DO VENCIMENTO ANTECIPADO:</strong> O CREDOR poderá considerar antecipadamente vencida toda a dívida, independentemente de aviso ou notificação judicial ou extrajudicial, caso o DEVEDOR deixe de cumprir qualquer das obrigações assumidas neste instrumento ou tenha títulos protestados.</p>

            <p><strong>5. DA VALIDADE DIGITAL:</strong> As partes reconhecem a validade desta assinatura eletrônica, conforme MP 2.200-2/2001 e Lei 14.063/2020, possuindo este documento plena eficácia executiva para todos os fins de direito, renunciando o DEVEDOR à faculdade de impugnar a validade das assinaturas digitais aposta neste instrumento.</p>

            <p><strong>6. DO FORO:</strong> As partes elegem o foro da Comarca de <strong>${data.city}/${data.state}</strong> para dirimir quaisquer dúvidas ou litígios oriundos deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>

            <p style="margin-top: 40px; text-align: center;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}.</p>

            <div style="margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
                <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px;">
                    <small>DEVEDOR(A)</small><br/><b>${data.debtorName}</b>
                </div>
                <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px;">
                    <small>CREDOR(A)</small><br/><b>${data.creditorName}</b>
                </div>
            </div>
            
            <div style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
                <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px;">
                    <small>TESTEMUNHA 1</small><br/>${data.witnesses?.[0]?.name || '____________________'}<br/><small>${data.witnesses?.[0]?.document || 'CPF: ____________'}</small>
                </div>
                <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px;">
                    <small>TESTEMUNHA 2</small><br/>${data.witnesses?.[1]?.name || '____________________'}<br/><small>${data.witnesses?.[1]?.document || 'CPF: ____________'}</small>
                </div>
            </div>
        </div>
    `,

    // 2. NOTA PROMISSÓRIA (Autônoma conforme Decreto 2.044/1908)
    notaPromissoria: (data: any) => `
        <div style="font-family: 'Times New Roman', serif; border: 4px double #000; padding: 40px; max-width: 800px; margin: auto; background: #fff; color: #000; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 24pt; font-weight: 900; letter-spacing: 2px;">NOTA PROMISSÓRIA</h1>
                <div style="border: 2px solid #000; padding: 10px 20px; font-size: 18pt; font-weight: 900; background: #eee;">${formatMoney(data.amount)}</div>
            </div>
            
            <div style="position: absolute; top: 10px; right: 10px; font-size: 10px; color: #999;">VENCIMENTO: ${new Date(data.dueDate).toLocaleDateString('pt-BR')}</div>

            <p style="font-size: 16pt; line-height: 2.2; text-align: justify; margin-bottom: 40px; text-indent: 50px;">
                Aos <b>${new Date(data.dueDate).toLocaleDateString('pt-BR')}</b>, pagarei por esta única via de <b>NOTA PROMISSÓRIA</b> a <b>${data.creditorName}</b>, CPF/CNPJ nº ${data.creditorDoc}, ou à sua ordem, a quantia líquida e certa de <b>${formatMoney(data.amount)} (${numberToWordsBRL(data.amount)})</b> em moeda corrente nacional, pagável na praça de <b>${data.city}</b>.
            </p>

            <p style="font-size: 10pt; text-align: justify; margin-bottom: 20px;">
                O não pagamento na data do vencimento sujeitará o emitente aos encargos legais, juros de mora e atualização monetária, além das despesas de cobrança e honorários advocatícios.
            </p>

            <div style="margin-top: 40px; display: grid; grid-template-columns: 1.5fr 1fr; gap: 40px; font-size: 11pt;">
                <div>
                    <strong style="text-transform: uppercase; font-size: 9pt; display: block; margin-bottom: 5px;">Emitente (Devedor):</strong>
                    <b>${data.debtorName}</b><br/>
                    CPF/CNPJ: ${data.debtorDoc}<br/>
                    Endereço: ${data.debtorAddress || '________________________________'}
                </div>
                <div style="text-align: right;">
                    <strong style="text-transform: uppercase; font-size: 9pt; display: block; margin-bottom: 5px;">Data de Emissão:</strong>
                    <b>${new Date().toLocaleDateString('pt-BR')}</b>
                </div>
            </div>
            
            <div style="margin-top: 80px; border-top: 1px solid #000; width: 60%; margin-left: auto; text-align: center; padding-top: 10px;">
                <span style="font-size: 11pt; font-weight: bold;">ASSINATURA DO EMITENTE</span><br/>
                <small style="font-size: 8pt; color: #555;">(Assinado eletronicamente conforme MP 2.200-2/2001)</small>
            </div>
        </div>
    `,

    notificacao: (data: any) => `
        <div style="font-family: Arial, sans-serif; padding: 40px; line-height: 1.5; color: #000; max-width: 800px; margin: auto;">
            <h2 style="text-align: center; text-transform: uppercase;">Notificação Extrajudicial</h2>
            <p style="text-align: right;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}</p>
            
            <p><strong>A/C Sr(a). ${data.debtorName}</strong><br/>CPF/CNPJ: ${data.debtorDoc}</p>
            
            <p style="margin-top: 30px;">Pela presente notificação, informamos que consta em aberto o débito referente ao contrato <strong>${data.loanId.substring(0,8)}</strong>, vencido em ${new Date(data.dueDate).toLocaleDateString('pt-BR')}, no valor total atualizado de <strong>${formatMoney(data.totalDue)}</strong>.</p>
            
            <p>Solicitamos a regularização do pagamento em até 48 horas para evitar a adoção de medidas judiciais cabíveis e registro em órgãos de proteção ao crédito.</p>
            
            <p style="margin-top: 50px; text-align: center;">Atenciosamente,<br/><strong>${data.creditorName}</strong></p>
        </div>
    `,

    quitacao: (data: any) => `
        <div style="font-family: serif; padding: 50px; line-height: 1.8; color: #000; max-width: 850px; margin: auto; border: 1px solid #ccc;">
            <h1 style="text-align: center; text-transform: uppercase;">Termo de Quitação</h1>
            
            <p>Pelo presente instrumento, eu, <strong>${data.creditorName}</strong>, inscrito(a) no CPF/CNPJ sob o nº ${data.creditorDoc}, declaro para os devidos fins que recebi de <strong>${data.debtorName}</strong>, CPF/CNPJ nº ${data.debtorDoc}, a importância de <strong>${formatMoney(data.totalPaid)}</strong>, referente à liquidação integral do contrato <strong>${data.loanId.substring(0,8)}</strong>.</p>
            
            <p>Com o recebimento desta quantia, dou ao devedor plena, geral e irrevogável quitação de toda e qualquer obrigação referente ao citado contrato, nada mais tendo a reclamar em tempo algum.</p>
            
            <p style="margin-top: 40px; text-align: center;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}</p>
            
            <div style="margin-top: 60px; text-align: center; border-top: 1px solid #000; width: 60%; margin: auto; padding-top: 10px;">
                <strong>${data.creditorName}</strong><br/>Credor
            </div>
        </div>
    `
};

