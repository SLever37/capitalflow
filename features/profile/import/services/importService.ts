
import * as XLSX from 'xlsx';
import { FIELD_MAPS, ImportCandidate } from '../domain/importSchema';
import { onlyDigits, parseCurrency } from '../../../../utils/formatters';
import { isValidCPForCNPJ } from '../../../../utils/validators';

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
                        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
                        
                        // Captura cabeçalhos (primeira linha que não seja vazia)
                        let headers: string[] = [];
                        let startRow = 0;
                        for (let i = 0; i < json.length; i++) {
                            if (json[i].some(cell => cell !== null && cell !== '')) {
                                headers = json[i].map(h => String(h || '').trim());
                                startRow = i + 1;
                                break;
                            }
                        }

                        return {
                            name,
                            headers,
                            rows: json.slice(startRow).filter(row => row.some(cell => cell !== null && cell !== ''))
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
                valor_base: parseCurrency(row[mapping.valor_base]),
                data_referencia: row[mapping.data_referencia] ? new Date(row[mapping.data_referencia]).toISOString() : undefined,
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
                    candidate.mensagens.push("Documento inválido.");
                }
                if (existingData.documents.includes(candidate.documento)) {
                    candidate.status = 'AVISO';
                    candidate.mensagens.push("Documento já existe no sistema.");
                }
            }

            if (!candidate.whatsapp) {
                candidate.status = 'AVISO';
                candidate.mensagens.push("Sem contato WhatsApp.");
            } else if (candidate.whatsapp.length < 10) {
                candidate.status = 'AVISO';
                candidate.mensagens.push("WhatsApp incompleto.");
            }

            return candidate;
        });
    }
};
