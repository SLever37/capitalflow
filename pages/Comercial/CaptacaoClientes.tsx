import React, { useState, useEffect } from 'react';
import { Megaphone, Link as LinkIcon, Copy, CheckCircle2, ArrowRight, Trash2, Calendar, MousePointer2, Image as ImageIcon, Loader2, MessageCircle, Share2, Plus } from 'lucide-react';
import { Campaign } from '../../types';
import { campaignService } from '../../services/campaign.service';
import { GoogleGenAI } from "@google/genai";

const DEFAULT_VALUES = [300, 500, 800, 1000, 1500];
const DEFAULT_TEMPLATE = "Olá! Me chamo {NOME}. Vim pela campanha {CAMPANHA}. Tenho interesse no valor de R$ {VALOR}. Link: {LINK}";

export const CustomerAcquisitionPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [form, setForm] = useState<Partial<Campaign>>({
    name: '',
    source: '',
    description: '',
    values: DEFAULT_VALUES,
    messageTemplate: DEFAULT_TEMPLATE,
    status: 'ACTIVE'
  });
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = () => {
    setCampaigns(campaignService.getCampaigns());
  };

  const handleSave = () => {
    if (!form.name || !form.source) {
      alert('Preencha nome e origem.');
      return;
    }

    const id = form.id || crypto.randomUUID();
    const link = `${window.location.origin}/?campaign_id=${id}`;

    const newCampaign: Campaign = {
      id,
      name: form.name,
      description: form.description,
      source: form.source,
      link,
      createdAt: form.createdAt || new Date().toISOString(),
      status: form.status || 'ACTIVE',
      values: form.values || DEFAULT_VALUES,
      messageTemplate: form.messageTemplate || DEFAULT_TEMPLATE,
      imageUrl: generatedImage || form.imageUrl,
      clicks: form.clicks || 0,
      leads: form.leads || 0
    };

    try {
      campaignService.saveCampaign(newCampaign);
      loadCampaigns();
      setView('LIST');
      setForm({ values: DEFAULT_VALUES, messageTemplate: DEFAULT_TEMPLATE, status: 'ACTIVE' });
      setGeneratedImage(null);
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar campanha. Tente usar uma imagem menor.');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Excluir campanha?')) {
      campaignService.deleteCampaign(id);
      loadCampaigns();
    }
  };

  const handleGenerateImage = async () => {
    if (!form.name) {
      alert('Preencha o nome da campanha primeiro.');
      return;
    }
    
    setGeneratingImage(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Create a professional, clean, and trustworthy social media image for a financial service campaign named "${form.name}". 
      Text to include: "Simule seu crédito" and "Escolha o valor e fale no WhatsApp". 
      Style: Commercial, financial, blue and white tones, high quality. 
      Aspect ratio 1:1.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
            imageConfig: {
                aspectRatio: "1:1",
            }
        }
      });

      let base64Image = null;
      if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                  base64Image = `data:image/png;base64,${part.inlineData.data}`;
                  break;
              }
          }
      }

      if (base64Image) {
        setGeneratedImage(base64Image);
      } else {
        alert('Não foi possível gerar a imagem. Tente novamente.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar imagem.');
    } finally {
      setGeneratingImage(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado!');
  };

  const shareWhatsApp = (campaign: Campaign) => {
    const msg = campaign.messageTemplate
      .replace('{NOME}', 'Cliente')
      .replace('{VALOR}', campaign.values[0].toString())
      .replace('{LINK}', campaign.link)
      .replace('{CAMPANHA}', campaign.name);
    
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 border border-orange-500/20">
            <Megaphone size={24}/>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Captação de Clientes</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Gerador de Campanhas</p>
          </div>
        </div>
        
        {view === 'LIST' && (
          <button 
            onClick={() => { setForm({ values: DEFAULT_VALUES, messageTemplate: DEFAULT_TEMPLATE, status: 'ACTIVE' }); setGeneratedImage(null); setView('FORM'); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold uppercase text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Plus size={16}/> Nova Campanha
          </button>
        )}
      </div>

      {view === 'FORM' ? (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-white font-bold uppercase text-sm border-b border-slate-800 pb-4 mb-6">
            <LinkIcon size={16} className="text-blue-500"/>
            <h2>{form.id ? 'Editar Campanha' : 'Nova Campanha'}</h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Nome (utm_campaign) *</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 transition-colors text-sm font-bold"
                  placeholder="Ex: verao_2024"
                  value={form.name || ''}
                  onChange={e => setForm({...form, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Origem (utm_source) *</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 transition-colors text-sm font-bold"
                  placeholder="Ex: instagram"
                  value={form.source || ''}
                  onChange={e => setForm({...form, source: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Descrição</label>
              <input 
                type="text" 
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 transition-colors text-sm font-bold"
                value={form.description || ''}
                onChange={e => setForm({...form, description: e.target.value})}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Valores Disponíveis (separados por vírgula)</label>
              <input 
                type="text" 
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 transition-colors text-sm font-bold"
                value={form.values?.join(', ') || ''}
                onChange={e => setForm({...form, values: e.target.value.split(',').map(v => Number(v.trim())).filter(n => !isNaN(n))})}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 block">Template de Mensagem WhatsApp</label>
              <textarea 
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-blue-500 transition-colors text-sm font-bold h-24"
                value={form.messageTemplate || ''}
                onChange={e => setForm({...form, messageTemplate: e.target.value})}
              />
              <p className="text-[10px] text-slate-500 mt-1">Variáveis: {'{NOME}, {VALOR}, {LINK}, {CAMPANHA}'}</p>
            </div>

            <div className="border-t border-slate-800 pt-6">
               <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-2 block">Imagem da Campanha</label>
               <div className="flex items-start gap-4">
                  <div className="w-32 h-32 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden">
                    {generatedImage || form.imageUrl ? (
                      <img src={generatedImage || form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-slate-700" size={32}/>
                    )}
                  </div>
                  <div className="flex-1">
                    <button 
                      onClick={handleGenerateImage}
                      disabled={generatingImage || !form.name}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold uppercase text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                    >
                      {generatingImage ? <Loader2 className="animate-spin" size={14}/> : <ImageIcon size={14}/>}
                      Gerar com IA
                    </button>
                    <p className="text-[10px] text-slate-500 mt-2">Gera uma imagem exclusiva para usar nas redes sociais.</p>
                  </div>
               </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setView('LIST')}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase text-xs"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-xs shadow-lg shadow-emerald-600/20"
              >
                Salvar Campanha
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-900 rounded-[2rem] border border-slate-800">
              <Megaphone size={48} className="mx-auto mb-4 opacity-20"/>
              <p className="text-sm font-bold">Nenhuma campanha criada.</p>
              <p className="text-xs mt-1">Crie sua primeira campanha para começar a captar leads.</p>
            </div>
          ) : (
            campaigns.map(campaign => (
              <div key={campaign.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-6 group hover:border-slate-700 transition-colors">
                {campaign.imageUrl && (
                  <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                    <img src={campaign.imageUrl} alt={campaign.name} className="w-full h-full object-cover"/>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold text-lg truncate">{campaign.name}</h3>
                    <span className="px-2 py-0.5 bg-slate-950 rounded text-[10px] font-bold uppercase text-slate-400 border border-slate-800">
                      {campaign.source}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs truncate mb-3">{campaign.description || 'Sem descrição'}</p>
                  
                  <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-950/50 p-2 rounded-lg w-fit">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(campaign.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 text-blue-400"><MousePointer2 size={12}/> {campaign.clicks || 0} Cliques</span>
                    <span className="flex items-center gap-1 text-emerald-400"><MessageCircle size={12}/> {campaign.leads || 0} Leads</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full md:w-auto">
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => copyToClipboard(campaign.link)}
                        className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-colors"
                      >
                        <LinkIcon size={14}/> Copiar Link
                      </button>
                      <button 
                        onClick={() => shareWhatsApp(campaign)}
                        className="px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 rounded-lg transition-colors"
                        title="Testar WhatsApp"
                      >
                        <Share2 size={16}/>
                      </button>
                   </div>
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setForm(campaign); setGeneratedImage(campaign.imageUrl || null); setView('FORM'); }}
                        className="flex-1 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-lg text-[10px] font-bold uppercase transition-colors"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(campaign.id)}
                        className="px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16}/>
                      </button>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};