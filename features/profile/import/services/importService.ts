
import * as XLSX from 'xlsx';
import { ImportCandidate } from '../domain/importSchema';
import { onlyDigits, normalizeBrazilianPhone } from '../../../../utils/formatters';

// Helper para converter valores monetários (R$ 1.000,00 -> 1000.00) ou (1,000.00 -> 1000.00)
const parseCurrency = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).trim();
    // Se tiver formato brasileiro (ponto separando milhar, vírgula decimal)
    if (str.includes(',') && !str.includes('US') && !str.includes('$')) {
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }
    return parseFloat(str.replace(/[^0-9.-]+/g, '')) || 0;
};

// Helper para datas do Excel
const parseExcelDate = (val: any): string | undefined => {
    if (!val) return undefined;
    if (val instanceof Date) return val.toISOString();
    // Excel Serial Date
    if (typeof val === 'number' && val > 20000) {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return date.toISOString();
    }
    // String DD/MM/YYYY
    const str = String(val).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [d, m, y] = str.split('/').map(Number);
        return new Date(y, m - 1, d).toISOString();
    }
    return undefined;
};

export const importService = {
    async getSheetNames(file: File): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    resolve(workbook.SheetNames);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    async parseFile(file: File, sheetName?: string): Promise<ImportCandidate[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Se sheetName não for fornecido, pega a primeira
                    const targetSheetName = sheetName || workbook.SheetNames[0];
                    const sheet = workbook.Sheets[targetSheetName];
                    
                    if (!sheet) throw new Error(`Aba '${targetSheetName}' não encontrada.`);

                    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
                    
                    if (json.length < 2) throw new Error("Aba vazia ou sem cabeçalho");

                    // Smart Header Mapping
                    const header = json[0].map(h => String(h).toLowerCase().trim());
                    
                    // Identificadores de Coluna
                    const idxName = header.findIndex(h => h.includes('nome') || h.includes('cliente') || h.includes('devedor') || h.includes('name'));
                    const idxPhone = header.findIndex(h => h.includes('tel') || h.includes('cel') || h.includes('phone') || h.includes('whats'));
                    const idxDoc = header.findIndex(h => h.includes('cpf') || h.includes('cnpj') || h.includes('doc'));
                    const idxEmail = header.findIndex(h => h.includes('email') || h.includes('e-mail'));
                    const idxNotes = header.findIndex(h => h.includes('obs') || h.includes('nota') || h.includes('desc'));
                    
                    // Financeiros
                    const idxPrincipal = header.findIndex(h => h.includes('valor') || h.includes('principal') || h.includes('emprestimo') || h.includes('montante'));
                    const idxRate = header.findIndex(h => h.includes('taxa') || h.includes('juro') || h.includes('%'));
                    const idxDate = header.findIndex(h => h.includes('data') || h.includes('inicio') || h.includes('criacao'));

                    if (idxName === -1) throw new Error("Coluna 'Nome' não encontrada nesta aba.");

                    const candidates: ImportCandidate[] = [];
                    
                    for (let i = 1; i < json.length; i++) {
                        const row = json[i];
                        if (!row[idxName]) continue;

                        const name = String(row[idxName]).trim();
                        const phoneRaw = idxPhone > -1 ? String(row[idxPhone] || '') : '';
                        const docRaw = idxDoc > -1 ? String(row[idxDoc] || '') : '';
                        
                        // Parse Financeiro
                        let principal = 0;
                        let interestRate = 0;
                        let startDate = undefined;

                        if (idxPrincipal > -1) principal = parseCurrency(row[idxPrincipal]);
                        if (idxRate > -1) interestRate = parseCurrency(row[idxRate]);
                        if (idxDate > -1) startDate = parseExcelDate(row[idxDate]);

                        const candidate: ImportCandidate = {
                            name,
                            phone: normalizeBrazilianPhone(phoneRaw),
                            document: onlyDigits(docRaw),
                            email: idxEmail > -1 ? String(row[idxEmail] || '') : undefined,
                            notes: idxNotes > -1 ? String(row[idxNotes] || '') : undefined,
                            
                            principal: principal > 0 ? principal : undefined,
                            interestRate: interestRate > 0 ? interestRate : undefined,
                            startDate: startDate,

                            status: 'VALID'
                        };
                        
                        if (!candidate.name) { candidate.status = 'INVALID'; candidate.error = 'Nome vazio'; }
                        
                        candidates.push(candidate);
                    }
                    resolve(candidates);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
};
