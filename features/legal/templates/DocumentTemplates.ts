
import { formatMoney } from "../../../utils/formatters";

export const DocumentTemplates = {
    // 1. CONFISSÃO DE DÍVIDA (Art. 784, III CPC - Título Executivo Extrajudicial)
    confissaoDivida: (data: any) => `
        <div style="font-family: 'Times New Roman', serif; padding: 50px; line-height: 1.6; color: #000; background: #fff; max-width: 900px; margin: auto; text-align: justify; border: 1px solid #eee;">
            <div style="text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 30px;">
                <h2 style="margin: 0; text-transform: uppercase; letter-spacing: 1px;">Instrumento Particular de Confissão de Dívida</h2>
                <small>FORÇA DE TÍTULO EXECUTIVO EXTRAJUDICIAL - ART. 784, III DO CPC</small>
            </div>
            
            <p><strong>CREDOR(A):</strong> ${data.creditorName}, inscrito(a) no CPF/CNPJ sob o nº ${data.creditorDoc}, com endereço em ${data.creditorAddress}.</p>
            <p><strong>DEVEDOR(A):</strong> ${data.debtorName}, inscrito(a) no CPF/CNPJ sob o nº ${data.debtorDoc}, residente e domiciliado(a) em ${data.debtorAddress || 'Endereço não informado'}.</p>

            <p>Pelo presente instrumento, o(a) <strong>DEVEDOR(A)</strong> de forma livre, consciente e irrevogável, <strong>CONFESSA E RECONHECE</strong> ser devedor(a) da quantia líquida, certa e exigível de <strong>${formatMoney(data.amount)}</strong>.</p>

            <h4 style="text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 5px;">CLÁUSULAS DE RIGOR LEGAL:</h4>
            
            <p><strong>1. DO OBJETO E VALOR:</strong> A presente dívida é originária de mútuo financeiro, totalizando o montante de principal e juros remuneratórios acordados na data de emissão.</p>
            
            <p><strong>2. DO VENCIMENTO ANTECIPADO:</strong> O inadimplemento de qualquer parcela, ou de qualquer obrigação acessória, implicará no <strong>VENCIMENTO ANTECIPADO</strong> de toda a dívida remanescente, independente de notificação judicial ou extrajudicial, tornando o saldo total imediatamente exigível.</p>
            
            <p><strong>3. DOS ENCARGOS MORATÓRIOS:</strong> Em caso de atraso, sobre o saldo devedor incidirá: 
                (a) Multa moratória irredutível de 10% (dez por cento); 
                (b) Juros de mora de 1% (um por cento) ao mês; 
                (c) Correção monetária plena pelo índice IGP-M/FGV ou IPCA.
            </p>

            <p><strong>4. DOS HONORÁRIOS E CUSTAS:</strong> Fica estipulado que, em caso de cobrança judicial ou utilização de advogado para recuperação do crédito, o <strong>DEVEDOR</strong> arcará com honorários advocatícios fixados em 20% (vinte por cento) sobre o valor total do débito atualizado, além de custas processuais.</p>

            <p><strong>5. DA VALIDADE DIGITAL:</strong> As partes declaram que a assinatura eletrônica deste documento através da plataforma CapitalFlow possui plena validade jurídica e eficácia executiva, renunciando a qualquer contestação sobre a autenticidade do método, conforme MP 2.200-2/2001 e Lei 14.063/2020.</p>

            <p><strong>6. DO FORO:</strong> Fica eleito o foro da comarca de ${data.city} para dirimir quaisquer controvérsias, com renúncia expressa a qualquer outro por mais privilegiado que seja.</p>

            <p style="margin-top: 40px; text-align: center;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}.</p>

            <div style="margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
                <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px;">
                    <small>DEVEDOR(A)</small><br/><b>${data.debtorName}</b>
                </div>
                <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px;">
                    <small>CREDOR(A)</small><br/><b>${data.creditorName}</b>
                </div>
            </div>
            
            <div style="margin-top: 50px; padding: 15px; border: 1px dashed #000; font-size: 8pt; color: #000; font-family: monospace; background: #f9f9f9;">
                <strong>CERTIFICADO DE INTEGRIDADE DIGITAL</strong><br/>
                ID DO TÍTULO: ${data.loanId || '---'}<br/>
                EVIDÊNCIA Criptográfica: ${data.hash || 'GERADO_NA_ASSINATURA'}<br/>
                Este documento é um Título Executivo Extrajudicial conforme CPC brasileiro.
            </div>
        </div>
    `,

    // 2. NOTA PROMISSÓRIA (Decreto 2.044/1908 e Lei Uniforme de Genebra)
    notaPromissoria: (data: any) => `
        <div style="font-family: 'Times New Roman', serif; border: 5px double #000; padding: 40px; max-width: 800px; margin: auto; background: #fff; color: #000; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 28pt; font-weight: 900;">NOTA PROMISSÓRIA</h1>
                <div style="border: 3px solid #000; padding: 10px 25px; font-size: 22pt; font-weight: 900; background: #eee;">${formatMoney(data.amount)}</div>
            </div>
            
            <p style="font-size: 16pt; line-height: 2; text-align: justify; margin-bottom: 30px;">
                Ao(s) <b>${new Date(data.dueDate).toLocaleDateString('pt-BR')}</b>, pagarei por esta única via de <b>NOTA PROMISSÓRIA</b> a <b>${data.creditorName}</b>, CPF/CNPJ ${data.creditorDoc}, ou à sua ordem, a quantia líquida e certa de <b>${formatMoney(data.amount)}</b> em moeda corrente deste país, pagável na praça de <b>${data.city}</b>.
            </p>

            <div style="background: #f0f0f0; padding: 15px; border-left: 5px solid #000; margin-bottom: 30px;">
                <p style="margin: 0; font-size: 10pt; font-weight: bold;">VÍNCULO: Este título está vinculado ao Instrumento de Confissão de Dívida ID ${data.loanId?.substring(0,8)}.</p>
            </div>

            <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                <div style="font-size: 12pt;">
                    <strong style="text-transform: uppercase; font-size: 9pt; display: block; margin-bottom: 5px;">Emitente (Devedor):</strong>
                    <b>${data.debtorName}</b><br/>
                    Documento: ${data.debtorDoc}<br/>
                    ${data.debtorAddress}
                </div>
                <div style="text-align: right; font-size: 12pt;">
                    <strong style="text-transform: uppercase; font-size: 9pt; display: block; margin-bottom: 5px;">Data de Emissão:</strong>
                    <b>${new Date().toLocaleDateString('pt-BR')}</b>
                </div>
            </div>
            
            <div style="margin-top: 80px; border-top: 2px solid #000; width: 70%; margin-left: auto; text-align: center; padding-top: 10px;">
                <span style="font-size: 11pt; font-weight: bold;">ASSINATURA DO EMITENTE</span><br/>
                <small style="font-size: 8pt;">(Assinado Eletronicamente - Identidade Validada via Plataforma)</small>
            </div>

            <div style="margin-top: 40px; font-size: 7pt; color: #555; text-align: center; font-family: Arial;">
                A emissão deste título eletrônico observa os requisitos do Decreto nº 2.044/1908 e da Lei Uniforme de Genebra.
            </div>
        </div>
    `,

    notificacao: (data: any) => `...`, // Mantido conforme original
    quitacao: (data: any) => `...`    // Mantido conforme original
};
