
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, Client, CapitalSource, UserProfile } from '../types';
import { maskPhone, maskDocument } from '../utils/formatters';
import { mapLoanFromDB } from '../services/adapters/dbAdapters';
import { asString, asNumber } from '../utils/safe';

/**
 * Resolve o nome do usuário com a prioridade exata solicitada.
 * Utiliza asString para garantir que nunca retorne undefined/null.
 */
const resolveUserName = (p: any): string => {
  if (!p) return 'Usuário';
  return (
    asString(p.nome_exibicao) || 
    asString(p.nome_operador) || 
    asString(p.nome_empresa) || // Fallback útil se operador estiver vazio
    asString(p.nome_completo) || 
    asString(p.nome) || 
    asString(p.name) || 
    asString(p.usuario_email) || 
    asString(p.email) || 
    'Usuário'
  );
};

export const useAppState = (activeProfileId: string | null) => {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sources, setSources] = useState<CapitalSource[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CLIENTS' | 'SOURCES' | 'PROFILE' | 'MASTER' | 'LEGAL'>('DASHBOARD');
  const [mobileDashboardTab, setMobileDashboardTab] = useState<'CONTRACTS' | 'BALANCE'>('CONTRACTS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATRASADOS' | 'EM_DIA' | 'PAGOS' | 'ARQUIVADOS' | 'ATRASO_CRITICO'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  
  const [profileEditForm, setProfileEditForm] = useState<UserProfile | null>(null);
  
  // Controle de erros do heartbeat para evitar loops
  const heartbeatFailures = useRef(0);

  const fetchFullData = useCallback(async (profileId: string) => {
      if (!profileId || profileId === 'null') return;
      
      setIsLoadingData(true);
      setLoadError(null);
      
      if (profileId === 'DEMO') {
          setActiveUser({
              id: 'DEMO', name: 'Usuário Demo', fullName: 'Operador Demonstração Completo', email: 'demo@app.com', totalAvailableCapital: 100000, interestBalance: 5000,
              photo: undefined, businessName: 'Demo Capital', accessLevel: 2, createdAt: new Date().toISOString(),
              brandColor: '#2563eb', defaultInterestRate: 30, defaultFinePercent: 2, defaultDailyInterestPercent: 1, targetCapital: 150000, targetProfit: 20000
          });
          setIsLoadingData(false);
          return; 
      }

      try {
          const { data: profile, error: profileError } = await supabase
            .from('perfis')
            .select('*')
            .eq('id', profileId)
            .maybeSingle();
          
          if (profileError) throw profileError;

          // GUARD ANTI-TELA BRANCA: Se ID de sessão existe mas o perfil sumiu do banco, reseta o app
          if (!profile) {
              console.warn("Sessão inválida ou perfil removido. Redirecionando...");
              localStorage.removeItem('cm_session');
              window.location.reload();
              return;
          }

          // Mapeamento Robusto: Garante distinção entre Nome Curto (Operador) e Completo
          const u: UserProfile = {
              id: asString(profile.id),
              name: resolveUserName(profile),
              fullName: asString(profile.nome_completo) || asString(profile.nome_operador), // Completo ou fallback p/ Operador
              email: asString(profile.usuario_email || profile.email),
              businessName: asString(profile.nome_empresa),
              document: asString(profile.document),
              phone: asString(profile.phone),
              address: asString(profile.address),
              addressNumber: asString(profile.address_number),
              neighborhood: asString(profile.neighborhood),
              city: asString(profile.city),
              state: asString(profile.state),
              zipCode: asString(profile.zip_code),
              pixKey: asString(profile.pix_key),
              photo: profile.avatar_url,
              password: profile.senha_acesso,
              recoveryPhrase: profile.recovery_phrase,
              accessLevel: asNumber(profile.access_level, 2),
              totalAvailableCapital: asNumber(profile.total_available_capital),
              interestBalance: asNumber(profile.interest_balance),
              createdAt: asString(profile.created_at),
              brandColor: asString(profile.brand_color, '#2563eb'),
              logoUrl: profile.logo_url,
              defaultInterestRate: asNumber(profile.default_interest_rate, 30),
              defaultFinePercent: asNumber(profile.default_fine_percent, 2),
              defaultDailyInterestPercent: asNumber(profile.default_daily_interest_percent, 1),
              targetCapital: asNumber(profile.target_capital),
              targetProfit: asNumber(profile.target_profit)
          };
          
          setActiveUser(u);
          setProfileEditForm(u);

          const [clientsRes, sourcesRes, loansRes] = await Promise.all([
              supabase.from('clientes').select('*').eq('profile_id', profileId),
              supabase.from('fontes').select('*').eq('profile_id', profileId),
              supabase.from('contratos').select(`
                  *,
                  parcelas (*),
                  transacoes (*),
                  sinalizacoes_pagamento (*),
                  acordos_inadimplencia (*)
              `).eq('profile_id', profileId)
          ]);

          if (clientsRes.data) {
              setClients(clientsRes.data.map((c: any) => ({
                  id: asString(c.id),
                  name: asString(c.name, 'Desconhecido'),
                  phone: maskPhone(asString(c.phone)),
                  document: maskDocument(asString(c.document || c.cpf || c.cnpj)),
                  email: asString(c.email),
                  address: asString(c.address),
                  city: asString(c.city),
                  state: asString(c.state),
                  notes: asString(c.notes),
                  createdAt: asString(c.created_at),
                  accessCode: asString(c.access_code),
                  clientNumber: asString(c.client_number),
                  fotoUrl: asString(c.foto_url)
              })));
          }

          if (sourcesRes.data) {
              setSources(sourcesRes.data.map((s: any) => ({
                  id: asString(s.id),
                  name: asString(s.name, 'Fonte'),
                  type: s.type,
                  balance: asNumber(s.balance)
              })));
          }

          if (loansRes.data) {
              const mappedLoans = loansRes.data.map((l: any) => mapLoanFromDB(l, clientsRes.data || []));
              setLoans(mappedLoans);
          }

      } catch (error: any) {
          console.error("Falha ao sincronizar dados:", error);
          setLoadError(error.message);
          // Se for erro de autenticidade (Sessão corrompida no Android), desloga limpo
          if (error.message && (error.message.includes('401') || error.message.includes('permission denied'))) {
              localStorage.removeItem('cm_session');
              window.location.reload();
          }
      } finally {
          setIsLoadingData(false);
      }
  }, []);

  const fetchAllUsers = useCallback(async () => {
     const { data, error } = await supabase.from('perfis').select('*').order('last_active_at', { ascending: false, nullsFirst: false });
     if (error) console.error("Admin fetch error:", error);
     if (data) setAllUsers(data);
  }, []);

  useEffect(() => {
    if (activeProfileId) {
      fetchFullData(activeProfileId);
    } else {
        setActiveUser(null);
    }
  }, [activeProfileId, fetchFullData]);

  // HEARTBEAT SEGURO - Se falhar 3x, desiste para não travar o app
  useEffect(() => {
      if (!activeUser || activeUser.id === 'DEMO') return;
      
      const updateHeartbeat = async () => {
          if (heartbeatFailures.current > 3) return; // Circuit breaker
          
          try {
            await supabase.from('perfis').update({ last_active_at: new Date().toISOString() }).eq('id', activeUser.id);
            heartbeatFailures.current = 0; // Reset sucesso
          } catch (e) {
            console.warn("Heartbeat falhou (ignorado):", e);
            heartbeatFailures.current += 1;
          }
      };
      
      updateHeartbeat();
      const interval = setInterval(updateHeartbeat, 120000); 
      return () => clearInterval(interval);
  }, [activeUser?.id]);

  useEffect(() => {
    if (activeUser?.accessLevel === 1) {
        fetchAllUsers();
    }
  }, [activeUser, fetchAllUsers]);

  return {
    loans, setLoans,
    clients, setClients,
    sources, setSources,
    activeUser, setActiveUser,
    allUsers, fetchAllUsers,
    isLoadingData, setIsLoadingData,
    loadError,
    fetchFullData,
    activeTab, setActiveTab,
    mobileDashboardTab, setMobileDashboardTab,
    statusFilter, setStatusFilter,
    searchTerm, setSearchTerm,
    clientSearchTerm, setClientSearchTerm,
    profileEditForm, setProfileEditForm
  };
};
