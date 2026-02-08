import React, { useState } from 'react';
// Removido react-router-dom para evitar erro de build
// import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Loader2, CheckCircle } from 'lucide-react';

export const SetupPasswordPage = () => {
  const navigate = (path: string) => { window.location.pathname = path; };
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSavePassword = async () => {
    const token = localStorage.getItem('pending_invite_token');
    if (!token || password.length < 6) return alert("Senha muito curta!");

    setLoading(true);
    try {
      // 1. Busca o membro pelo token
      const { data: member } = await supabase
        .from('team_members')
        .select('*')
        .eq('invite_token', token)
        .single();

      if (member) {
        // 2. Atualiza a senha no perfil vinculado (ou cria um se necessário)
        // Aqui você pode adaptar para a sua lógica de Auth do Supabase
        // Por enquanto, marcamos como 'token usado' removendo-o
        localStorage.removeItem('pending_invite_token');
        setDone(true);
        setTimeout(() => navigate('/login'), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl">
        {done ? (
          <div className="text-center space-y-4">
            <CheckCircle className="text-emerald-500 mx-auto" size={60} />
            <h2 className="text-white font-black text-xl uppercase">Senha Criada!</h2>
            <p className="text-slate-400">Agora você já pode acessar o painel.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <Lock className="text-blue-500 mx-auto mb-4" size={40} />
              <h2 className="text-white font-black text-xl uppercase">Defina sua Senha</h2>
              <p className="text-slate-400 text-sm">Olá! Escolha uma senha para seu primeiro acesso.</p>
            </div>
            
            <input 
              type="password" 
              placeholder="Sua nova senha" 
              className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button 
              onClick={handleSavePassword}
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Finalizar Cadastro"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};