import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, ShieldCheck } from 'lucide-react';

export const InvitePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const token = searchParams.get('token');

  useEffect(() => {
    const validateInvite = async () => {
      if (!token) {
        setStatus('error');
        return;
      }

      // 1. Verifica se o token existe na team_members
      const { data: member, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('invite_token', token)
        .single();

      if (error || !member) {
        setStatus('error');
        return;
      }

      // 2. Aqui simulamos o login automático
      // Em um sistema real, você usaria o token para criar uma sessão.
      // Por enquanto, vamos redirecionar ela para definir a senha.
      localStorage.setItem('pending_invite_token', token);
      setStatus('success');
      
      setTimeout(() => {
        navigate('/setup-password'); // Página onde ela criará a senha
      }, 2000);
    };

    validateInvite();
  }, [token, navigate]);

  if (status === 'error') return <div className="text-white p-20 text-center font-bold">Link de convite inválido ou expirado.</div>;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        {status === 'loading' ? (
          <>
            <Loader2 className="animate-spin text-blue-500 mx-auto" size={48} />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Validando seu convite...</p>
          </>
        ) : (
          <>
            <ShieldCheck className="text-emerald-500 mx-auto" size={48} />
            <p className="text-white font-bold uppercase text-lg">Convite Aceito!</p>
            <p className="text-slate-400 text-sm">Redirecionando para criar sua senha...</p>
          </>
        )}
      </div>
    </div>
  );
};