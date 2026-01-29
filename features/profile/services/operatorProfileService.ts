import { supabase } from '../../../lib/supabase';
import { UserProfile } from '../../../types';
import { generateUUID } from '../../../utils/generators';
import { onlyDigits, maskDocument, maskPhone } from '../../../utils/formatters';
import * as XLSX from 'xlsx';

type UpdatableProfileFields = Partial<Omit<UserProfile, 'id' | 'createdAt' | 'totalAvailableCapital' | 'interestBalance'>>;

export const operatorProfileService = {
    /**
     * Realiza o upload da foto do operador para o storage
     */
    async uploadAvatar(file: File, profileId: string): Promise<string> {
        if (!file) throw new Error("Arquivo inválido.");
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${profileId}/avatar_${Date.now()}.${fileExt}`;
        const filePath = `profiles/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            throw new Error(`Erro no storage: ${uploadError.message}`);
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        return data.publicUrl;
    },

    async updateProfile(profileId: string, data: UpdatableProfileFields, origin: 'MANUAL' | 'IMPORT' | 'RESTORE' = 'MANUAL'): Promise<UserProfile | null> {
        if (!profileId) throw new Error("ID do perfil inválido.");

        const curatedData = this.curateProfileData(data);

        const { data: updated, error } = await supabase
            .from('perfis')
            .update({
                nome_operador: curatedData.name,
                nome_completo: curatedData.fullName,
                nome_empresa: curatedData.businessName,
                document: curatedData.document,
                phone: curatedData.phone,
                address: curatedData.address,
                address_number: (curatedData as any).addressNumber,
                neighborhood: (curatedData as any).neighborhood,
                city: (curatedData as any).city,
                state: (curatedData as any).state,
                zip_code: (curatedData as any).zipCode,
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

        if (error) {
            console.error("Erro ao atualizar perfil no banco:", error);
            throw new Error("Falha ao atualizar perfil: " + error.message);
        }
        
        await this.logAudit(profileId, `PROFILE_UPDATE_${origin}`, `Perfil atualizado via ${origin}.`);
        return this.mapToUserProfile(updated);
    },

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
                        fullName: row['Nome Completo'] || row['fullName'],
                        businessName: row['Empresa'] || row['Negocio'] || row['businessName'],
                        document: row['CPF'] || row['CNPJ'] || row['Documento'] || row['document'],
                        phone: row['Telefone'] || row['Celular'] || row['phone'],
                        address: row['Endereco'] || row['address'],
                        addressNumber: row['Numero'] || row['Nº'] || row['addressNumber'],
                        pixKey: row['Pix'] || row['Chave Pix'] || row['pixKey'],
                        defaultInterestRate: row['Taxa Padrão'] || row['defaultInterestRate'],
                        targetCapital: row['Meta Capital'] || row['targetCapital']
                    };

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

    curateProfileData(raw: any): UpdatableProfileFields {
        const cleanDoc = onlyDigits(raw.document || '');
        const cleanPhone = onlyDigits(raw.phone || '');
        return {
            name: (raw.name || 'Operador').trim().substring(0, 100),
            fullName: (raw.fullName || '').trim().substring(0, 200),
            businessName: (raw.businessName || 'Minha Empresa').trim().substring(0, 100),
            document: cleanDoc ? maskDocument(cleanDoc) : '000.000.000-00',
            phone: cleanPhone ? maskPhone(cleanPhone) : '00000000000',
            address: (raw.address || '').substring(0, 200),
            addressNumber: (raw.addressNumber || '').substring(0, 20),
            pixKey: (raw.pixKey || '').substring(0, 100),
            photo: raw.photo,
            brandColor: raw.brandColor || '#2563eb',
            logoUrl: raw.logoUrl,
            defaultInterestRate: Math.abs(Number(raw.defaultInterestRate) || 30),
            defaultFinePercent: Math.abs(Number(raw.defaultFinePercent) || 2),
            defaultDailyInterestPercent: Math.abs(Number(raw.defaultDailyInterestPercent) || 1),
            targetCapital: Math.abs(Number(raw.targetCapital) || 0),
            targetProfit: Math.abs(Number(raw.targetProfit) || 0),
            neighborhood: (raw.neighborhood || '').substring(0, 100),
            city: (raw.city || '').substring(0, 100),
            state: (raw.state || '').substring(0, 2).toUpperCase(),
            zipCode: onlyDigits(raw.zipCode || '').substring(0, 8)
        } as any;
    },

    mapToUserProfile(dbProfile: any): UserProfile {
        if (!dbProfile) throw new Error("Dados de perfil nulos no mapeamento.");
        return {
            id: dbProfile.id,
            name: dbProfile.nome_operador,
            fullName: dbProfile.nome_completo || '',
            email: dbProfile.usuario_email,
            businessName: dbProfile.nome_empresa,
            document: dbProfile.document,
            phone: dbProfile.phone,
            address: dbProfile.address,
            addressNumber: dbProfile.address_number || '',
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