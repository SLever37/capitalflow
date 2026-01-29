
import * as XLSX from 'xlsx';
import { FIELD_MAPS, ImportCandidate } from '../domain/importSchema';
import { onlyDigits, parseCurrency } from '../../../../utils/formatters';

const parseExcelDate = (val: any): string | undefined => {
    if (!val) return undefined;
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'number' && val > 20000) {
        return new Date(Math.round((val - 25569) * 86400 * 1000)).toISOString();
    }
    const str = String(val).trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
        const [d, m, y] = str.split('/').map(Number);
        return new Date(y < 100 ? y + 2000 : y, m - 1, d).toISOString();
    }
    return undefined;
};

export const importService = {
    async getSheets(file: File): Promise<{ name: string, headers: string[], rows: any[] }[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const sheets = workbook.SheetNames.map(name => {
                        const sheet = workbook.Sheets[name];
                        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
                        return {
                            name,
                            headers: (json[0] || []).map(h => String(h || '').trim()),
                            rows: json.slice(1)
                        };
                    });
                    resolve(sheets);
                } catch (err) { reject(err); }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    inferMapping(headers: string[]): Record<string, number> {
        const mapping: Record<string, number> = {};
        headers.forEach((h, idx) => {
            const lower = h.toLowerCase();
            FIELD_MAPS.forEach(field => {
                if (field.labels.some(l => lower.includes(l)) && mapping[field.key] === undefined) {
                    mapping[field.key] = idx;
                }
            });
        });
        return mapping;
    },

    async buildPreview(
        rows: any[], 
        mapping: Record<string, number>, 
        existingData: { escolas: string[], cpfs: string[], matriculas: string[] }
    ): Promise<ImportCandidate[]> {
        return rows.map(row => {
            const candidate: ImportCandidate = {
                nome: String(row[mapping.nome] || '').trim(),
                cpf: onlyDigits(String(row[mapping.cpf] || '')),
                matricula: String(row[mapping.matricula] || '').trim(),
                escola: String(row[mapping.escola] || '').trim(),
                setor: String(row[mapping.setor] || '').trim(),
                funcao: String(row[mapping.funcao] || '').trim(),
                data_admissao: parseExcelDate(row[mapping.data_admissao]),
                salario: parseCurrency(row[mapping.salario]),
                carga_horaria: String(row[mapping.carga_horaria] || '').trim(),
                status: 'OK',
                mensagens: [],
                original_row: row
            };

            // Validações de Curadoria
            if (!candidate.nome) {
                candidate.status = 'ERRO';
                candidate.mensagens.push("Nome obrigatório ausente.");
            }
            if (candidate.cpf && candidate.cpf.length !== 11) {
                candidate.status = 'ERRO';
                candidate.mensagens.push("CPF inválido.");
            }
            if (existingData.cpfs.includes(candidate.cpf)) {
                candidate.status = 'AVISO';
                candidate.mensagens.push("CPF já cadastrado no sistema (será ignorado ou atualizado).");
            }
            if (candidate.escola && !existingData.escolas.some(e => e.toLowerCase() === candidate.escola.toLowerCase())) {
                candidate.status = 'AVISO';
                candidate.mensagens.push(`Escola '${candidate.escola}' não encontrada. Será movido para 'OUTROS'.`);
            }

            return candidate;
        });
    }
};
