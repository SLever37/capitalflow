import React, { useState } from 'react';
import { Megaphone, Link as LinkIcon, Copy, CheckCircle2, ArrowRight } from 'lucide-react';

export const CustomerAcquisitionPage: React.FC = () => {
  const [campaign, setCampaign] = useState('');
  const [source, setSource] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  const generateLink = () => {
    const baseUrl = `${window.location.origin}/?public=emprestimo`;
    const params = new URLSearchParams();
    
    if (source) params.append('utm_source', source);
    if (campaign) params.append('utm_campaign', campaign);
    
    const queryString = params.toString();
    setGeneratedLink(queryString ? `${baseUrl}&${queryString}` : baseUrl);
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      alert('Link copiado!');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 border border-orange-500/20">
          <Megaphone size={24}/>
        </div>
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Captação de Clientes</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Gerador de Campanhas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gerador de Links */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] space-y-6">
          <div className="flex items-center gap-2 text-white font-bold uppercase text-sm border-b border-slate-800 pb-4">
            <LinkIcon size={16} className="text-blue-500"/>
            <h2>Criar Link de Campanha</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Nome da Campanha (utm_campaign)</label>
              <input 
                type="text" 
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 transition-colors text-sm font-bold"
                placeholder="Ex: verao_2024, instagram_stories"
                value={campaign}
                onChange={e => setCampaign(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Origem do Tráfego (utm_source)</label>
              <input 
                type="text" 
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 transition-colors text-sm font-bold"
                placeholder="Ex: facebook, google, whatsapp_lista"
                value={source}
                onChange={e => setSource(e.target.value)}
              />
            </div>

            <button 
              onClick={generateLink}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
            >
              Gerar Link Rastreado <ArrowRight size={14}/>
            </button>
          </div>

          {generatedLink && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 animate-in zoom-in-95">
              <p className="text-[10px] font-black uppercase text-emerald-500 mb-2 flex items-center gap-1"><CheckCircle2 size={12}/> Link Pronto</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-900 p-3 rounded-lg text-xs text-slate-300 break-all font-mono border border-slate-800">
                  {generatedLink}
                </code>
                <button onClick={copyToClipboard} className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors" title="Copiar">
                  <Copy size={16}/>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Explicação / Dicas */}
        <div className="space-y-6">
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem]">
              <h3 className="text-white font-bold uppercase text-sm mb-4">Como funciona?</h3>
              <ul className="space-y-4 text-xs text-slate-400 leading-relaxed">
                <li className="flex gap-3">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center shrink-0 text-slate-500 font-bold">1</div>
                  <p>Crie links personalizados para cada canal de divulgação (Instagram, Facebook, WhatsApp).</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center shrink-0 text-slate-500 font-bold">2</div>
                  <p>Quando um cliente clicar no link e preencher o formulário, nós salvamos a origem automaticamente.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center shrink-0 text-slate-500 font-bold">3</div>
                  <p>Acesse o menu <strong>LEADS</strong> para ver quem chegou por cada campanha e medir seus resultados.</p>
                </li>
              </ul>
           </div>

           <div className="bg-gradient-to-br from-orange-500/10 to-rose-500/10 border border-orange-500/20 p-6 rounded-[2rem]">
              <h3 className="text-orange-400 font-bold uppercase text-sm mb-2">Dica de Ouro</h3>
              <p className="text-xs text-slate-400">
                Use nomes de campanha consistentes (ex: <code>promo_natal</code>) para agrupar leads de diferentes fontes (Instagram, Email) sob o mesmo objetivo.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};
