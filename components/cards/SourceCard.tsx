
import React, { useState, useEffect } from 'react';
import { Landmark, Banknote, Wallet, CreditCard, Edit2, PlusCircle, Trash2 } from 'lucide-react';
import { CapitalSource } from '../../types';
import { formatMoney } from '../../utils/formatters';

interface SourceCardProps {
    source: CapitalSource;
    onEdit: (source: CapitalSource) => void;
    onAddFunds: (source: CapitalSource) => void;
    onDelete: (id: string) => void;
    isStealthMode?: boolean;
}

// Helper para mapear nomes comuns de bancos para URLs de logos
const getBankLogoUrl = (name: string): string | null => {
    const lower = name.toLowerCase().trim();
    
    // Mapeamento dos principais bancos e fintechs brasileiros
    if (lower.includes('nubank')) return 'https://logo.clearbit.com/nubank.com.br';
    if (lower.includes('inter')) return 'https://logo.clearbit.com/bancointer.com.br';
    if (lower.includes('itaú') || lower.includes('itau')) return 'https://logo.clearbit.com/itau.com.br';
    if (lower.includes('bradesco')) return 'https://logo.clearbit.com/bradesco.com.br';
    if (lower.includes('santander')) return 'https://logo.clearbit.com/santander.com.br';
    if (lower.includes('brasil') || lower.includes('bb')) return 'https://logo.clearbit.com/bb.com.br';
    if (lower.includes('caixa')) return 'https://logo.clearbit.com/caixa.gov.br';
    if (lower.includes('c6')) return 'https://logo.clearbit.com/c6bank.com.br';
    if (lower.includes('picpay')) return 'https://logo.clearbit.com/picpay.com';
    if (lower.includes('mercado') && lower.includes('pago')) return 'https://logo.clearbit.com/mercadopago.com.br';
    if (lower.includes('sicredi')) return 'https://logo.clearbit.com/sicredi.com.br';
    if (lower.includes('sicoob')) return 'https://logo.clearbit.com/sicoob.com.br';
    if (lower.includes('neon')) return 'https://logo.clearbit.com/neon.com.br';
    if (lower.includes('original')) return 'https://logo.clearbit.com/original.com.br';
    if (lower.includes('pagbank') || lower.includes('pagseguro')) return 'https://logo.clearbit.com/pagseguro.uol.com.br';
    if (lower.includes('btg')) return 'https://logo.clearbit.com/btgpactual.com';
    if (lower.includes('pan')) return 'https://logo.clearbit.com/bancopan.com.br';
    if (lower.includes('safra')) return 'https://logo.clearbit.com/safra.com.br';
    if (lower.includes('stone')) return 'https://logo.clearbit.com/stone.com.br';
    if (lower.includes('infinite')) return 'https://logo.clearbit.com/infinitepay.io';
    if (lower.includes('ton')) return 'https://logo.clearbit.com/ton.com.br';
    if (lower.includes('cora')) return 'https://logo.clearbit.com/cora.com.br';
    if (lower.includes('nomad')) return 'https://logo.clearbit.com/nomadglobal.com';
    if (lower.includes('wise')) return 'https://logo.clearbit.com/wise.com';
    if (lower.includes('revolut')) return 'https://logo.clearbit.com/revolut.com';
    
    return null;
};

export const SourceCard: React.FC<SourceCardProps> = ({ 
    source, onEdit, onAddFunds, onDelete, isStealthMode 
}) => {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        const url = getBankLogoUrl(source.name);
        if (url) {
            setLogoUrl(url);
            setImgError(false);
        } else {
            setLogoUrl(null);
        }
    }, [source.name]);

    // Ícone padrão baseado no tipo
    const DefaultIcon = source.type === 'BANK' ? Landmark : source.type === 'CASH' ? Banknote : source.type === 'CARD' ? CreditCard : Wallet;
    
    // Cores baseadas no tipo
    const colorClass = source.type === 'BANK' ? 'text-blue-500' : source.type === 'CASH' ? 'text-emerald-500' : source.type === 'CARD' ? 'text-rose-500' : 'text-purple-500';
    const bgClass = source.type === 'BANK' ? 'bg-blue-500/10' : source.type === 'CASH' ? 'bg-emerald-500/10' : source.type === 'CARD' ? 'bg-rose-500/10' : 'bg-purple-500/10';

    return (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-slate-700 transition-all">
            {/* Background Icon (Marca d'água grande) - Mantido sempre o ícone padrão para estética */}
            <div className={`absolute top-0 right-0 p-6 opacity-10 transition-opacity group-hover:opacity-20 ${colorClass}`}>
                <DefaultIcon size={80} />
            </div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    {/* Área do Logo / Ícone Pequeno */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden ${bgClass} ${colorClass}`}>
                        {logoUrl && !imgError && source.type !== 'CARD' ? (
                            <img 
                                src={logoUrl} 
                                alt={source.name} 
                                className="w-full h-full object-cover"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <DefaultIcon size={24} />
                        )}
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(source); }} 
                        className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                        title="Editar Saldo Manualmente"
                    >
                        <Edit2 size={14}/>
                    </button>
                </div>
                
                <h3 className="text-lg font-black text-white uppercase tracking-tight truncate pr-2" title={source.name}>{source.name}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">
                    {source.type === 'BANK' ? 'Conta Bancária' : source.type === 'CASH' ? 'Dinheiro Físico' : source.type === 'CARD' ? 'Cartão de Crédito' : 'Carteira Digital'}
                </p>
                
                <p className={`text-2xl font-black mb-6 ${source.balance < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                    {formatMoney(source.balance, isStealthMode)}
                </p>
                
                <div className="flex gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAddFunds(source); }} 
                        className="flex-1 py-3 bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-500 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        <PlusCircle size={14}/> Adicionar
                    </button>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(source.id); }} 
                        className="p-3 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-500 rounded-xl transition-all"
                        title="Excluir Fonte"
                    >
                        <Trash2 size={16}/>
                    </button>
                </div>
            </div>
        </div>
    );
};
