
import { supabase } from '../../../lib/supabase';
import { UserProfile } from '../../../types';
import { generateUUID } from '../../../utils/generators';
import { onlyDigits, maskDocument, maskPhone } from '../../../utils/formatters';
import * as XLSX from 'xlsx';

// Definição de campos permitidos para atualização
type UpdatableProfileFields = Partial<Omit<UserProfile, 'id' | 'createdAt' | 'totalAvailableCapital' | 'interestBalance'>>;

export const operatorProfileService = {
    
    /**
     * Atualiza o perfil do operador com validação estrita e auditoria.
     * BLOQUEIO: Não permite alterar saldo financeiro por esta via.
     */
    async updateProfile(profileId: string, data: UpdatableProfileFields, origin: 'MANUAL' | 'IMPORT' | 'RESTORE' = 'MANUAL'): Promise<UserProfile | null> {
        if (!profileId) throw new Error("ID do perfil inválido.");

        // 1. Curadoria de Dados (Sanitização)
        const curatedData = this.curateProfileData(data);

        // 2. Persistência Blindada
        const { data: updated, error } = await supabase
            .from('perfis')
            .update({
                nome_operador: curatedData.name,
                nome_empresa: curatedData.businessName,
                document: curatedData.document,
                phone: curatedData.phone,
                
                // Endereço Completo (Jurídico)
                address: curatedData.address,
                address_number: curatedData.addressNumber,
                neighborhood: curatedData.neighborhood,
                city: curatedData.city,
                state: curatedData.state,
                zip_code: curatedData.zipCode,

                pix_key: curatedData.pixKey,
                avatar_url: curatedData.photo,
                brand_color: curatedData.brandColor,
                logo_url: curatedData.logoUrl,
                default_interest_rate: curatedData.defaultInterestRate,
                default_fine_percent: curatedData.defaultFinePercent,
                default_daily_interest_percent: curatedData.defaultDailyInterestPercent,
                target_capital: curatedData.targetCapital,
                target_profit: curatedData.targetProfit,
                last_active_at: new Date().toISOString()
            })
            .eq('id', profileId)
            .select()
            .single();

        if (error) throw new Error("Falha ao atualizar perfil: " + error.message);

        // 3. Auditoria de Segurança
        await this.logAudit(profileId, `PROFILE_UPDATE_${origin}`, `Perfil atualizado via ${origin}. Nome: ${curatedData.name}`);

        return this.mapToUserProfile(updated);
    },

    /**
     * Restaura perfil a partir de um arquivo de Backup (JSON) ou Planilha (XLSX).
     */
    async restoreProfileFromSnapshot(snapshot: Partial<UserProfile>, profileId: string): Promise<UserProfile> {
        return this.updateProfile(profileId, snapshot, 'RESTORE') as Promise<UserProfile>;
    },

    async importProfileFromSheet(file: File, profileId: string): Promise<UserProfile> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet) as any[];

                    if (json.length === 0) throw new Error("Planilha vazia.");

                    const row = json[0];

                    const mappedData: UpdatableProfileFields = {
                        name: row['Nome'] || row['Operador'] || row['name'],
                        businessName: row['Empresa'] || row['Negocio'] || row['businessName'],
                        document: row['CPF'] || row['CNPJ'] || row['Documento'] || row['document'],
                        phone: row['Telefone'] || row['Celular'] || row['phone'],
                        address: row['Endereco'] || row['address'],
                        pixKey: row['Pix'] || row['Chave Pix'] || row['pixKey'],
                        email: row['Email'] || row['E-mail'] || row['email'],
                        defaultInterestRate: row['Taxa Padrão'] || row['defaultInterestRate'],
                        targetCapital: row['Meta Capital'] || row['targetCapital']
                    };

                    // Atualiza usando a função segura
                    const updated = await this.updateProfile(profileId, mappedData, 'IMPORT');
                    
                    if (!updated) throw new Error("Falha na atualização pós-importação.");
                    
                    resolve(updated);
                } catch (err: any) {
                    reject(new Error("Erro ao processar arquivo: " + err.message));
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Curadoria de Dados: Regras de Negócio para Integridade
     */
    curateProfileData(raw: any): UpdatableProfileFields & { addressNumber?: string, neighborhood?: string, city?: string, state?: string, zipCode?: string } {
        const cleanDoc = onlyDigits(raw.document || '');
        const cleanPhone = onlyDigits(raw.phone || '');

        return {
            name: (raw.name || 'Operador').trim().substring(0, 100),
            businessName: (raw.businessName || 'Minha Empresa').trim().substring(0, 100),
            
            // CPF/CNPJ: Fallback seguro (000...) se vazio ou inválido
            document: cleanDoc ? (cleanDoc.length > 11 ? maskDocument(cleanDoc) : maskDocument(cleanDoc)) : '000.000.000-00',
            
            // Telefone: Se ausente, preencher com zeros (jurídico)
            phone: cleanPhone ? maskPhone(cleanPhone) : '00000000000',
            
            // Endereço Completo (Jurídico)
            address: (raw.address || '').substring(0, 200),
            addressNumber: (raw.addressNumber || '').substring(0, 20),
            neighborhood: (raw.neighborhood || '').substring(0, 100),
            city: (raw.city || '').substring(0, 100),
            state: (raw.state || '').substring(0, 2).toUpperCase(),
            zipCode: onlyDigits(raw.zipCode || '').substring(0, 8),

            pixKey: (raw.pixKey || '').substring(0, 100),
            photo: raw.photo,
            brandColor: raw.brandColor || '#2563eb',
            logoUrl: raw.logoUrl,
            
            // Valores numéricos seguros (sempre positivos)
            defaultInterestRate: Math.abs(Number(raw.defaultInterestRate) || 30),
            defaultFinePercent: Math.abs(Number(raw.defaultFinePercent) || 2),
            defaultDailyInterestPercent: Math.abs(Number(raw.defaultDailyInterestPercent) || 1),
            targetCapital: Math.abs(Number(raw.targetCapital) || 0),
            targetProfit: Math.abs(Number(raw.targetProfit) || 0)
        };
    },

    /**
     * Mapeia retorno do banco para o tipo UserProfile da aplicação
     */
    mapToUserProfile(dbProfile: any): UserProfile {
        return {
            id: dbProfile.id,
            name: dbProfile.nome_operador,
            email: dbProfile.usuario_email,
            businessName: dbProfile.nome_empresa,
            document: dbProfile.document,
            phone: dbProfile.phone,
            
            // Mapeamento Estendido (Jurídico)
            address: dbProfile.address,
            addressNumber: dbProfile.address_number,
            neighborhood: dbProfile.neighborhood,
            city: dbProfile.city,
            state: dbProfile.state,
            zipCode: dbProfile.zip_code,

            pixKey: dbProfile.pix_key,
            photo: dbProfile.avatar_url,
            password: dbProfile.senha_acesso,
            recoveryPhrase: dbProfile.recovery_phrase,
            accessLevel: dbProfile.access_level,
            totalAvailableCapital: Number(dbProfile.total_available_capital) || 0,
            interestBalance: Number(dbProfile.interest_balance) || 0,
            createdAt: dbProfile.created_at,
            brandColor: dbProfile.brand_color,
            logoUrl: dbProfile.logo_url,
            defaultInterestRate: Number(dbProfile.default_interest_rate),
            defaultFinePercent: Number(dbProfile.default_fine_percent),
            defaultDailyInterestPercent: Number(dbProfile.default_daily_interest_percent),
            targetCapital: Number(dbProfile.target_capital),
            targetProfit: Number(dbProfile.target_profit)
        };
    },

    /**
     * Registra auditoria de segurança
     */
    async logAudit(profileId: string, type: string, notes: string) {
        await supabase.from('transacoes').insert({
            id: generateUUID(),
            profile_id: profileId,
            date: new Date().toISOString(),
            type: 'ADJUSTMENT', 
            amount: 0,
            principal_delta: 0,
            interest_delta: 0,
            late_fee_delta: 0,
            category: 'AUDIT',
            notes: `[${type}] ${notes}`
        });
    }
};
