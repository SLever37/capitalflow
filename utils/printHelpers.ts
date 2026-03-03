
// Promissória do sistema (fallback): abre uma janela de impressão para o cliente salvar em PDF.
export const openSystemPromissoriaPrint = (args: {
  clientName: string;
  clientPhone?: string;
  loanId: string;
  loanCreatedAt?: string;
  principal?: number;
  interestRate?: number | string;
  debtorDocument?: string;
  totalToPay?: number;
}) => {
  const {
    clientName,
    clientPhone,
    loanId,
    loanCreatedAt,
    principal,
    interestRate,
    debtorDocument,
    totalToPay,
  } = args;

  const fmtMoney = (v?: number) =>
    typeof v === 'number' && !Number.isNaN(v)
      ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—';

  const fmtDate = (v?: string) => {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
  };
  const computedTotalToPay = (() => {
    if (typeof totalToPay === 'number' && !Number.isNaN(totalToPay)) return totalToPay;
    const p = typeof principal === 'number' && !Number.isNaN(principal) ? principal : 0;
    const ir = Number(interestRate);
    if (!Number.isFinite(ir)) return p;
    return p * (1 + (ir / 100));
  })();

  const html = `
  <!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Promissória</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #0f172a; }
        h1 { font-size: 18px; margin: 0 0 12px; }
        .muted { color: #475569; font-size: 12px; }
        .box { border: 1px solid #cbd5e1; padding: 16px; margin-top: 12px; }
        .row { display: flex; gap: 12px; flex-wrap: wrap; }
        .col { flex: 1; min-width: 220px; }
        .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
        .value { font-size: 14px; font-weight: 700; }
        .divider { border-top: 1px dashed #cbd5e1; margin: 16px 0; }
        .sign { margin-top: 22px; }
        .line { border-bottom: 1px solid #0f172a; height: 20px; margin-top: 28px; }
        .small { font-size: 11px; color: #334155; margin-top: 6px; }
        @media print { body { margin: 0.8cm; } }
      </style>
    </head>
    <body>
      <h1>Promissória (Sistema)</h1>
      <div class="muted">
        Documento gerado automaticamente com base no contrato. Você pode imprimir ou salvar como PDF.
      </div>
      <div style="margin: 10px 0 16px 0;">
        <button onclick="window.print()" style="background:#0f172a;color:#fff;border:0;padding:10px 14px;border-radius:10px;font-weight:800;cursor:pointer;">Imprimir / Salvar PDF</button>
      </div>

      <div class="box">
        <div class="row">
          <div class="col">
            <div class="label">Cliente</div>
            <div class="value">${clientName || '—'}</div>
          </div>
          <div class="col">
            <div class="label">Telefone</div>
            <div class="value">${clientPhone || '—'}</div>
          </div>
          <div class="col">
            <div class="label">Documento (CPF/CNPJ do contrato)</div>
            <div class="value">${debtorDocument || '—'}</div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="row">
          <div class="col">
            <div class="label">Contrato (ID)</div>
            <div class="value">${loanId || '—'}</div>
          </div>
          <div class="col">
            <div class="label">Data do contrato</div>
            <div class="value">${fmtDate(loanCreatedAt)}</div>
          </div>
        </div>

        <div class="row" style="margin-top: 12px;">
          <div class="col">
            <div class="label">Valor total a pagar</div>
            <div class="value">${fmtMoney(computedTotalToPay)}</div>
          </div>
        </div>

        <div class="sign">
          <div class="small">Assinatura do Devedor</div>
          <div class="line"></div>
          <div class="small">Assinatura do Credor</div>
          <div class="line"></div>
        </div>
      </div>
      <script>setTimeout(() => window.print(), 250);</script>
    </body>
  </html>
  `;

  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
};

export const openDreReportPrint = (args: {
    period: string;
    businessName: string;
    dre: { grossRevenue: number, principalRecovered: number, investment: number, cashFlow: number };
    transactions: any[];
}) => {
    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const { period, businessName, dre, transactions } = args;

    const html = `
    <!doctype html>
    <html lang="pt-BR">
    <head>
        <meta charset="utf-8" />
        <title>Relatório Financeiro - ${period}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; color: #0f172a; }
            .header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
            
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
            .card .label { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; margin-bottom: 5px; }
            .card .value { font-size: 18px; font-weight: bold; }
            .text-green { color: #10b981; }
            .text-blue { color: #3b82f6; }
            .text-red { color: #f43f5e; }
            
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { text-align: left; padding: 10px; background: #f1f5f9; text-transform: uppercase; font-size: 10px; color: #64748b; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
            tr:last-child td { border-bottom: none; }
            .badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
            .bg-green { background: #dcfce7; color: #166534; }
            .bg-red { background: #ffe4e6; color: #9f1239; }
            .bg-blue { background: #dbeafe; color: #1e40af; }

            @media print {
                body { margin: 0; padding: 0; }
                button { display: none; }
                .card { border: 1px solid #000; }
                th { background: #eee !important; -webkit-print-color-adjust: exact; }
            }
        </style>
    </head>
    <body>
        <div style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background:#0f172a;color:#fff;border:0;padding:8px 16px;border-radius:6px;font-weight:bold;cursor:pointer;">IMPRIMIR RELATÓRIO</button>
        </div>

        <div class="header">
            <h1>Relatório de Fechamento</h1>
            <p>${businessName}</p>
            <p>Período: <strong>${period}</strong></p>
        </div>

        <div class="summary-grid">
            <div class="card">
                <div class="label">Receita Bruta (Juros)</div>
                <div class="value text-green">${fmt(dre.grossRevenue)}</div>
            </div>
            <div class="card">
                <div class="label">Recuperação Principal</div>
                <div class="value text-blue">${fmt(dre.principalRecovered)}</div>
            </div>
            <div class="card">
                <div class="label">Novos Aportes</div>
                <div class="value text-red">${fmt(dre.investment)}</div>
            </div>
            <div class="card" style="background: #f8fafc;">
                <div class="label">Caixa Líquido</div>
                <div class="value">${fmt(dre.cashFlow)}</div>
            </div>
        </div>

        <h3>Detalhamento das Operações</h3>
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Categoria</th>
                    <th style="text-align:right">Valor</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(t => `
                    <tr>
                        <td>${new Date(t.date).toLocaleDateString()}</td>
                        <td><strong>${t.clientName}</strong></td>
                        <td>${t.type === 'LEND_MORE' ? 'Empréstimo' : t.type === 'PAYMENT_FULL' ? 'Quitação' : 'Pagamento'}</td>
                        <td><span class="badge ${t.type === 'LEND_MORE' ? 'bg-red' : t.category === 'RECEITA' ? 'bg-green' : 'bg-blue'}">${t.category || 'GERAL'}</span></td>
                        <td style="text-align:right; font-weight:bold; color: ${t.type === 'LEND_MORE' ? '#f43f5e' : '#10b981'}">
                            ${t.type === 'LEND_MORE' ? '-' : '+'} ${fmt(t.amount)}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #94a3b8; text-align: center;">
            Relatório gerado automaticamente pelo sistema CapitalFlow em ${new Date().toLocaleString()}.
        </div>
        <script>setTimeout(() => window.print(), 500);</script>
    </body>
    </html>
    `;

    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
};
