
import * as XLSX from 'xlsx';
import { FIELD_MAPS, ImportCandidate } from '../domain/importSchema';
import { onlyDigits } from '../../../../utils/formatters';
import { isValidCPForCNPJ } from '../../../../utils/validators';

export const importService = {
    async getSheets(file: File): Promise<{ name: string, headers: string[], rows: any[] }[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
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
        existingData: { documents: string[], phones: string[] }
    ): Promise<ImportCandidate[]> {
        return rows.map(row => {
            const candidate: ImportCandidate = {
                nome: String(row[mapping.nome] || '').trim(),
                documento: onlyDigits(String(row[mapping.documento] || '')),
                whatsapp: onlyDigits(String(row[mapping.whatsapp] || '')),
                email: String(row[mapping.email] || '').trim(),
                endereco: String(row[mapping.endereco] || '').trim(),
                cidade: String(row[mapping.cidade] || '').trim(),
                uf: String(row[mapping.uf] || '').trim().toUpperCase(),
                notas: String(row[mapping.notas] || '').trim(),
                status: 'OK',
                mensagens: [],
                original_row: row
            };

            // Curadoria: Validações de Negócio
            if (!candidate.nome) {
                candidate.status = 'ERRO';
                candidate.mensagens.push("Nome ausente.");
            }
            
            if (candidate.documento) {
                if (!isValidCPForCNPJ(candidate.documento)) {
                    candidate.status = 'AVISO';
                    candidate.mensagens.push("Documento parece inválido.");
                }
                if (existingData.documents.includes(candidate.documento)) {
                    candidate.status = 'AVISO';
                    candidate.mensagens.push("Já cadastrado no sistema.");
                }
            } else {
                candidate.status = 'AVISO';
                candidate.mensagens.push("Sem CPF/CNPJ.");
            }

            if (!candidate.whatsapp) {
                candidate.status = 'AVISO';
                candidate.mensagens.push("Sem telefone de contato.");
            }

            return candidate;
        });
    }
};
