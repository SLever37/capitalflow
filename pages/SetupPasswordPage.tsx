import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Loader2, CheckCircle, ShieldCheck, AlertCircle, TrendingUp } from 'lucide-react';
import { generateUUID } from '../utils/generators';

export const SetupPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'VALIDATING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [memberData, setMemberData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const params = new URLSearchParams(window.location.search);
  const token = params.get('invite_token');

  useEffect(() => {
    if (!token) {
      setStatus('ERROR');
      setErrorMsg('Link de convite ausente ou inválido.');
      return;
    }

    const validateToken = async () => {
      setStatus('VALIDATING');
      const { data, error } = await supabase
        .from('team_members')
        .select('*, teams(name, owner_profile_id)')
        .eq('invite_token', token)
        .single();

      if (error || !data) {
        setStatus('ERROR');
        setErrorMsg('Este convite não foi encontrado ou expirou.');
        return;
      }

      if (new Date(data.expires_at) < new Date() && data.invite_status === 'PENDING') {
          setStatus('ERROR');
          setErrorMsg('Este convite expirou (validade de 2 dias). Solicite um novo link.');
          return;
      }

      setMemberData(data);
      setStatus('IDLE');
    };

    validateToken();
  }, [token]);

  const handleFinalizeRegistration = async () => {
    if (password.length < 6) {
        alert("Sua senha deve ter pelo menos 6 caracteres.");
        return;
    }

    setLoading(true);
    try {
      // 1. Criar Perfil Real do Operador
      const newProfileId = generateUUID();
      
      const { error: pErr } = await supabase.from('perfis').insert({
          id: newProfileId,
          nome_operador: memberData.full_name.split(' ')[0],
          nome_completo: memberData.full_name,
          usuario_email: memberData.cpf + "@capitalflow.internal", // Email virtual baseado no CPF
          senha_acesso: password,
          access_code: '0000', // Padrão inicial
          document: memberData.cpf,
          phone: '00000000000',
          access_level: 2,
          supervisor_id: memberData.teams.owner_profile_id,
          created_at: new Date().toISOString()
      });

      if (pErr) throw new Error("Falha ao criar perfil: " + pErr.message);

      // 2. Atualizar Membro do Time
      const { error: mErr } = await supabase
        .from('team_members')
        .update({ 
            profile_id: newProfileId,
            invite_status: 'ACCEPTED' 
        })
        .eq('id', memberData.id);

      if (mErr) throw mErr;

      // 3. Login Automático Perpétuo (Demo Session)
      // Como o sistema usa o localStorage para persistir a sessão de perfil:
      localStorage.setItem('cm_session', JSON.stringify({ profileId: newProfileId, ts: Date.now() }));
      
      setStatus('SUCCESS');
      
      setTimeout(() => {
        window.location.href = '/'; 
      }, 2500);

    } catch (e: any) {
      alert("Erro ao finalizar cadastro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'VALIDATING') {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
            <Loader2 className="animate-spin text-blue-500" size={48}/>
            <p className="font-black uppercase text-xs tracking-widest animate-pulse">Validando convite...</p>
        </div>
    );
  }

  if (status === 'ERROR') {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-500/30 p-8 rounded-[2.5rem] text-center max-w-md shadow-2xl">
                <AlertCircle className="text-rose-500 mx-auto mb-4" size={56}/>
                <h2 className="text-white font-black uppercase text-xl mb-2">Convite Inválido</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">{errorMsg}</p>
                <button onClick={() => window.location.href = '/'} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase text-xs">Voltar ao Início</button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-blue-600/5 blur-[120px] pointer-events-none"></div>
      
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95 duration-500">
        {status === 'SUCCESS' ? (
          <div className="text-center space-y-6 py-6 animate-in fade-in">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/20 mx-auto">
                <CheckCircle className="text-emerald-500" size={48} />
            </div>
            <div>
                <h2 className="text-white font-black text-2xl uppercase tracking-tighter">Acesso Ativado!</h2>
                <p className="text-slate-400 text-sm mt-2">Seja bem-vindo à equipe. Você será redirecionado para o painel agora.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 mb-4 animate-bounce-slow">
                 <TrendingUp className="text-white w-8 h-8" />
              </div>
              <h2 className="text-white font-black text-xl uppercase tracking-tighter">Ativar meu Acesso</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Equipe: <span className="text-blue-400">{memberData?.teams?.name}</span></p>
            </div>
            
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Membro Convidado</p>
                <p className="text-white font-bold">{memberData?.full_name}</p>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Crie sua Senha de Acesso</label>
                <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"/>
                    <input 
                        type="password" 
                        placeholder="Mínimo 6 caracteres" 
                        className="w-full bg-slate-950 border border-slate-800 py-4 pl-12 pr-4 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            <button 
              onClick={handleFinalizeRegistration}
              disabled={loading || password.length < 6}
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black uppercase text-xs shadow-2xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20}/> Finalizar e Entrar</>}
            </button>
            
            <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                Ambiente Seguro CapitalFlow • Criptografia de Ponta
            </p>
          </div>
        )}
      </div>
    </div>
  );
};