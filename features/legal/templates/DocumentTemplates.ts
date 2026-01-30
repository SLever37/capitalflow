
import { formatMoney } from "../../../utils/formatters";

export const DocumentTemplates = {
    // 1. CONFISSÃO DE DÍVIDA (Art. 784, III CPC - Título Executivo Extrajudicial)
    confissaoDivida: (data: any) => `
        <div style="font-family: 'Times New Roman', serif; padding: 50px; line-height: 1.6; color: #000; background: #fff; max-width: 850px; margin: auto; text-align: justify; border: 1px solid #eee;">
            <div style="text-align: center; border: 2px solid #000; padding: 15px; margin-bottom: 30px;">
                <h2 style="margin: 0; text-transform: uppercase; letter-spacing: 1px;">Instrumento Particular de Confissão de Dívida</h2>
                <small style="font-weight: bold;">FORÇA DE TÍTULO EXECUTIVO EXTRAJUDICIAL - ART. 784, III DO CÓDIGO DE PROCESSO CIVIL</small>
            </div>
            
            <p><strong>CREDOR(A):</strong> ${data.creditorName}, inscrito(a) no CPF/CNPJ sob o nº ${data.creditorDoc}, com endereço em ${data.creditorAddress}.</p>
            <p><strong>DEVEDOR(A):</strong> ${data.debtorName}, inscrito(a) no CPF/CNPJ sob o nº ${data.debtorDoc}, residente e domiciliado(a) em ${data.debtorAddress || 'Endereço não informado'}.</p>

            <p>Pelo presente instrumento, o(a) <strong>DEVEDOR(A)</strong>, de forma livre, consciente e irrevogável, nos termos dos Artigos 389 e 395 do Código Civil, <strong>CONFESSA E RECONHECE</strong> ser devedor(a) da quantia líquida, certa e exigível de <strong>${formatMoney(data.amount)}</strong>.</p>

            <h4 style="text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 5px; margin-top: 25px;">CLÁUSULAS DE RIGOR LEGAL:</h4>
            
            <p><strong>1. DO OBJETO:</strong> A dívida ora confessada é originária de operação de mútuo financeiro, compreendendo o capital principal e os juros remuneratórios pactuados.</p>
            
            <p><strong>2. DO VENCIMENTO ANTECIPADO:</strong> O inadimplemento de qualquer parcela, ou de qualquer obrigação acessória, implicará no <strong>VENCIMENTO ANTECIPADO</strong> de toda a dívida remanescente (Art. 333, inciso II do Código Civil), independente de notificação, tornando o saldo total imediatamente exigível.</p>
            
            <p><strong>3. DOS ENCARGOS MORATÓRIOS:</strong> Em caso de atraso, sobre o saldo devedor atualizado incidirão cumulativamente: 
                (a) Multa moratória de 10% (dez por cento); 
                (b) Juros de mora de 1% (um por cento) ao mês pro-rata die; 
                (c) Correção monetária plena.
            </p>

            <p><strong>4. DOS HONORÁRIOS E CUSTAS:</strong> Na hipótese de cobrança judicial ou utilização de advogado para a recuperação do crédito, o <strong>DEVEDOR</strong> obriga-se ao pagamento de honorários advocatícios fixados em 20% (vinte por cento) sobre o valor total do débito, conforme Art. 395 do Código Civil, além das custas processuais.</p>

            <p><strong>5. DA VALIDADE DIGITAL:</strong> As partes declaram que a assinatura eletrônica deste documento via plataforma CapitalFlow possui plena validade jurídica e eficácia executiva, conforme Medida Provisória nº 2.200-2/2001 e Lei nº 14.063/2020.</p>

            <p><strong>6. DO FORO:</strong> Fica eleito o foro da comarca de ${data.city} para dirimir quaisquer controvérsias, com renúncia expressa a qualquer outro.</p>

            <p style="margin-top: 40px; text-align: center;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}.</p>

            <div style="margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
                <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px;">
                    <small>DEVEDOR(A)</small><br/><b>${data.debtorName}</b>
                </div>
                <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px;">
                    <small>CREDOR(A)</small><br/><b>${data.creditorName}</b>
                </div>
            </div>
        </div>
    `,

    // 2. NOTA PROMISSÓRIA (Decreto 2.044/1908 e Lei Uniforme de Genebra)
    notaPromissoria: (data: any) => `
        <div style="font-family: 'Times New Roman', serif; border: 5px double #000; padding: 40px; max-width: 800px; margin: auto; background: #fff; color: #000;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 28pt; font-weight: 900;">NOTA PROMISSÓRIA</h1>
                <div style="border: 3px solid #000; padding: 10px 25px; font-size: 22pt; font-weight: 900; background: #eee;">${formatMoney(data.amount)}</div>
            </div>
            
            <p style="font-size: 16pt; line-height: 2; text-align: justify; margin-bottom: 30px;">
                Aos <b>${new Date(data.dueDate).toLocaleDateString('pt-BR')}</b>, pagarei por esta única via de <b>NOTA PROMISSÓRIA</b> a <b>${data.creditorName}</b>, CPF/CNPJ ${data.creditorDoc}, ou à sua ordem, a quantia líquida e certa de <b>${formatMoney(data.amount)}</b> em moeda corrente nacional, pagável na praça de <b>${data.city}</b>.
            </p>

            <div style="background: #f0f0f0; padding: 15px; border-left: 5px solid #000; margin-bottom: 30px; font-size: 10pt;">
                VÍNCULO JURÍDICO: Este título de crédito é emitido em garantia e vinculado ao Instrumento de Confissão de Dívida ID ${String(data.loanId).substring(0,8)}.
            </div>

            <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                <div style="font-size: 12pt;">
                    <strong style="text-transform: uppercase; font-size: 9pt; display: block; margin-bottom: 5px;">Emitente (Devedor):</strong>
                    <b>${data.debtorName}</b><br/>
                    Documento: ${data.debtorDoc}<br/>
                    ${data.debtorAddress || 'Endereço registrado'}
                </div>
                <div style="text-align: right; font-size: 12pt;">
                    <strong style="text-transform: uppercase; font-size: 9pt; display: block; margin-bottom: 5px;">Data de Emissão:</strong>
                    <b>${new Date().toLocaleDateString('pt-BR')}</b>
                </div>
            </div>
            
            <div style="margin-top: 80px; border-top: 2px solid #000; width: 70%; margin-left: auto; text-align: center; padding-top: 10px;">
                <span style="font-size: 11pt; font-weight: bold;">ASSINATURA DO EMITENTE</span><br/>
                <small style="font-size: 8pt;">(Assinado Eletronicamente - Prova de Autoria via IP e Timestamp)</small>
            </div>
        </div>
    `,

    notificacao: (data: any) => `...`, // Mantido
    quitacao: (data: any) => `...`    // Mantido
};
