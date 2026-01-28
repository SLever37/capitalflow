import * as XLSX from 'xlsx';
import { ImportCandidate, SYNONYMS } from '../domain/importSchema';
import { onlyDigits, normalizeBrazilianPhone, parseCurrency } from '../../../../utils/formatters';

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
                } catch (err) { reject(err); }
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
                    if (json.length < 2) throw new Error("Planilha vazia ou sem dados.");

                    const header = json[0].map(h => String(h || '').toLowerCase().trim());
                    const findIdx = (list: string[]) => header.findIndex(h => list.some(s => h.includes(s)));

                    const idxs = {
                        name: findIdx(SYNONYMS.name),
                        phone: findIdx(SYNONYMS.phone),
                        document: findIdx(SYNONYMS.document),
                        email: findIdx(SYNONYMS.email),
                        address: findIdx(SYNONYMS.address),
                        principal: findIdx(SYNONYMS.principal),
                        rate: findIdx(SYNONYMS.interestRate),
                        date: findIdx(SYNONYMS.startDate)
                    };

                    if (idxs.name === -1) throw new Error("Coluna de 'Nome' não identificada. Verifique o cabeçalho.");

                    const candidates: ImportCandidate[] = [];
                    for (let i = 1; i < json.length; i++) {
                        const row = json[i];
                        if (!row || !row[idxs.name]) continue;

                        const name = String(row[idxs.name]).trim();
                        if (name.length < 2) continue;

                        const candidate: ImportCandidate = {
                            name,
                            phone: normalizeBrazilianPhone(idxs.phone > -1 ? row[idxs.phone] : ''),
                            document: onlyDigits(idxs.document > -1 ? row[idxs.document] : ''),
                            email: idxs.email > -1 ? String(row[idxs.email] || '') : undefined,
                            address: idxs.address > -1 ? String(row[idxs.address] || '') : undefined,
                            principal: idxs.principal > -1 ? parseCurrency(row[idxs.principal]) : undefined,
                            interestRate: idxs.rate > -1 ? parseCurrency(row[idxs.rate]) : undefined,
                            startDate: idxs.date > -1 ? parseExcelDate(row[idxs.date]) : undefined,
                            status: 'VALID'
                        };
                        
                        if (candidate.phone && candidate.phone.length < 8) {
                            candidate.status = 'INVALID';
                            candidate.error = 'Telefone inválido';
                        }
                        
                        candidates.push(candidate);
                    }
                    resolve(candidates);
                } catch (err) { reject(err); }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
};