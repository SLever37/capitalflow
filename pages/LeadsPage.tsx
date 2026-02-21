import React, { useEffect, useState } from 'react';
import { leadsService } from '../services/leads.service';
import { Lead } from '../types';
import { supabase } from '../lib/supabase';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { formatMoney, maskPhone } from '../utils/formatters';
import { MessageCircle, Clock, CheckCircle2, XCircle, Loader2, User } from 'lucide-react';

export const LeadsPage: React.FC<{ activeUser: any }> = ({ activeUser }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      const data = await leadsService.listLeads(activeUser.id);
      setLeads(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    const channel = supabase
      .channel('leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads_emprestimo' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads(prev => [payload.new as Lead, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setLeads(prev => prev.map(l => l.id === payload.new.id ? payload.new as Lead : l));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUser.id]);

  const handleStatusChange = async (id: string, status: Lead['status']) => {
    try {
      await leadsService.updateLeadStatus(id, status);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    } catch (error) {
      console.error(error);
    }
  };

  const openWhatsApp = (lead: Lead) => {
    const msg = `Olá ${lead.nome || ''}, vi seu interesse no empréstimo de ${formatMoney(lead.valor_solicitado)}. Podemos conversar?`;
    window.open(buildWhatsAppLink(lead.whatsapp, msg), '_blank');
    if (lead.status === 'NOVO') {
      handleStatusChange(lead.id, 'EM_ATENDIMENTO');
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Leads</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Solicitações de Empréstimo</p>
        </div>
        <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
           <span className="text-xs font-bold text-white">{leads.filter(l => l.status === 'NOVO').length} Novos</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leads.map(lead => (
          <div key={lead.id} className={`bg-slate-900 border ${lead.status === 'NOVO' ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 'border-slate-800'} p-5 rounded-2xl relative overflow-hidden group transition-all hover:border-slate-700`}>
             {lead.status === 'NOVO' && <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl">Novo</div>}
             
             <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                      <User size={20}/>
                   </div>
                   <div>
                      <h3 className="text-white font-bold text-sm">{lead.nome || 'Sem Nome'}</h3>
                      <p className="text-slate-500 text-xs">{maskPhone(lead.whatsapp)}</p>
                   </div>
                </div>
             </div>

             <div className="mb-4">
                <p className="text-[10px] text-slate-500 font-black uppercase">Valor Solicitado</p>
                <p className="text-xl font-black text-emerald-400">{formatMoney(lead.valor_solicitado)}</p>
             </div>

             <div className="flex gap-2">
                <button 
                  onClick={() => openWhatsApp(lead)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all"
                >
                   <MessageCircle size={14}/> Conversar
                </button>
                
                {lead.status !== 'CONVERTIDO' && lead.status !== 'REJEITADO' && (
                  <>
                    <button onClick={() => handleStatusChange(lead.id, 'CONVERTIDO')} className="p-3 bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl transition-all" title="Converter">
                       <CheckCircle2 size={16}/>
                    </button>
                    <button onClick={() => handleStatusChange(lead.id, 'REJEITADO')} className="p-3 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl transition-all" title="Rejeitar">
                       <XCircle size={16}/>
                    </button>
                  </>
                )}
             </div>

             <div className="mt-3 flex items-center justify-between text-[9px] font-bold uppercase text-slate-600">
                <span className="flex items-center gap-1"><Clock size={10}/> {new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
                <span className={`${lead.status === 'CONVERTIDO' ? 'text-blue-500' : lead.status === 'REJEITADO' ? 'text-rose-500' : 'text-slate-500'}`}>{lead.status}</span>
             </div>
          </div>
        ))}

        {leads.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-500">
             <p className="text-sm font-bold uppercase">Nenhum lead encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};
