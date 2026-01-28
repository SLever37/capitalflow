import * as XLSX from 'xlsx';
import { ImportCandidate } from '../domain/importSchema';
import { onlyDigits, normalizeBrazilianPhone } from '../../../../utils/formatters';

// Helper para converter valores monetários de forma agressiva
const parseCurrency = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).trim();
    // Suporte a R$ 1.000,00 ou 1,000.00
    if (str.includes(',') && str.includes('.')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
        }
    }
    if (str.includes(',')) return parseFloat(str.replace(',', '.')) || 0;
    return parseFloat(str.replace(/[^0-9.-]+/g, '')) || 0;
};

// Helper para datas do Excel (Serial ou String)
const parseExcelDate = (val: any): string | undefined => {
    if (!val) return undefined;
    if (val instanceof Date) return val.toISOString();
    
    if (typeof val === 'number' && val > 20000) {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return date.toISOString();
    }
    
    const str = String(val).trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
        const parts = str.split('/');
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        let y = parseInt(parts[2]);
        if (y < 100) y += 2000;
        return new Date(y, m - 1, d).toISOString();
    }
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str).toISOString();
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
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const targetSheetName = sheetName || workbook.SheetNames[0];
                    const sheet = workbook.Sheets[targetSheetName];
                    
                    if (!sheet) throw new Error(`Aba '${targetSheetName}' não encontrada.`);

                    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
                    if (json.length < 2) throw new Error("A planilha deve conter cabeçalho e dados.");

                    const header = json[0].map(h => String(h || '').toLowerCase().trim());
                    const findIdx = (terms: string[]) => header.findIndex(h => terms.some(t => h.includes(t)));

                    const idxName = findIdx(['nome', 'cliente', 'devedor', 'name', 'razao']);
                    const idxPhone = findIdx(['tel', 'cel', 'whats', 'fone', 'phone', 'contato']);
                    const idxDoc = findIdx(['cpf', 'cnpj', 'doc', 'identidade', 'documento']);
                    const idxEmail = findIdx(['email', 'e-mail', 'correio']);
                    const idxAddress = findIdx(['end', 'rua', 'address', 'local']);
                    const idxPrincipal = findIdx(['valor', 'principal', 'emprestimo', 'montante', 'capital', 'divida']);
                    const idxRate = findIdx(['taxa', 'juro', '%', 'interest', 'rate']);
                    const idxDate = findIdx(['data', 'inicio', 'contrato', 'vencimento', 'date', 'created']);

                    if (idxName === -1) throw new Error("Coluna 'Nome' não identificada.");

                    const candidates: ImportCandidate[] = [];
                    for (let i = 1; i < json.length; i++) {
                        const row = json[i];
                        if (!row || !row[idxName]) continue;

                        const name = String(row[idxName]).trim();
                        if (name.length < 2) continue;

                        const candidate: ImportCandidate = {
                            name,
                            phone: normalizeBrazilianPhone(idxPhone > -1 ? String(row[idxPhone] || '') : ''),
                            document: onlyDigits(idxDoc > -1 ? String(row[idxDoc] || '') : ''),
                            email: idxEmail > -1 ? String(row[idxEmail] || '') : undefined,
                            address: idxAddress > -1 ? String(row[idxAddress] || '') : undefined,
                            principal: idxPrincipal > -1 ? parseCurrency(row[idxPrincipal]) : undefined,
                            interestRate: idxRate > -1 ? parseCurrency(row[idxRate]) : undefined,
                            startDate: idxDate > -1 ? parseExcelDate(row[idxDate]) : undefined,
                            status: 'VALID'
                        };
                        
                        if (candidate.phone && candidate.phone.length < 8) {
                            candidate.status = 'INVALID';
                            candidate.error = 'Telefone inválido';
                        }
                        
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