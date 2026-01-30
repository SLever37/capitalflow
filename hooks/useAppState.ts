
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, Client, CapitalSource, UserProfile, SortOption } from '../types';
import { maskPhone, maskDocument } from '../utils/formatters';
import { mapLoanFromDB } from '../services/adapters/dbAdapters';
import { asString, asNumber } from '../utils/safe';

/**
 * Resolve o nome de EXIBIÇÃO de forma inteligente.
 * Sincronizado com useAuth.ts
 */
const resolveSmartName = (p: any): string => {
  if (!p) return 'Gestor';

  const isGeneric = (s: string) => {
      if (!s) return true;
      const clean = s.toLowerCase().trim();
      return ['usuário', 'usuario', 'user', 'operador', 'admin', 'gestor', 'undefined', 'null', ''].includes(clean);
  };

  if (p.nome_exibicao && !isGeneric(p.nome_exibicao)) return p.nome_exibicao;

  const candidates = [
      asString(p.nome_operador),
      asString(p.nome_empresa),
      asString(p.nome_completo).split(' ')[0],
      asString(p.nome),
      asString(p.name)
  ];

  for (const c of candidates) {
      if (c && !isGeneric(c)) return c;
  }

  const email = asString(p.usuario_email || p.email);
  if (email && email.includes('@')) {
      const prefix = email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  return 'Gestor';
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
  const [sortOption, setSortOption] = useState<SortOption>('DUE_DATE_ASC'); // Padrão: Vencimento Próximo
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  
  const [profileEditForm, setProfileEditForm] = useState<UserProfile | null>(null);
  const heartbeatFailures = useRef(0);

  const fetchFullData = useCallback(async (profileId: string) => {
      if (!profileId || profileId === 'null') return;
      
      setIsLoadingData(true);
      setLoadError(null);
      
      // MODO DEMO
      if (profileId === 'DEMO') {
          setActiveUser({
              id: 'DEMO', name: 'Usuário Demo', fullName: 'Operador Demonstração', email: 'demo@app.com', totalAvailableCapital: 100000, interestBalance: 5000,
              photo: undefined, businessName: 'Demo Capital', accessLevel: 2, createdAt: new Date().toISOString(),
              brandColor: '#2563eb', defaultInterestRate: 30, defaultFinePercent: 2, defaultDailyInterestPercent: 1, targetCapital: 150000, targetProfit: 20000
          });
          setIsLoadingData(false);
          return; 
      }

      try {
          let profileData: any = null;

          // 1. Tenta usar rpc_me (Preferencial)
          try {
              const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_me');
              if (!rpcError && rpcData) {
                  const me = Array.isArray(rpcData) ? rpcData[0] : rpcData;
                  if (me && me.id === profileId) { 
                      profileData = me;
                  }
              }
          } catch (e) {
              console.warn("rpc_me failed or not available:", e);
          }

          // 2. Fallback: Busca direta na tabela
          if (!profileData) {
              const { data: tableData, error: tableError } = await supabase
                .from('perfis')
                .select('*')
                .eq('id', profileId)
                .maybeSingle();
              
              if (tableError) throw tableError;
              profileData = tableData;
          }

          if (!profileData) {
              console.warn("Perfil não encontrado. Encerrando sessão.");
              localStorage.removeItem('cm_session');
              window.location.reload();
              return;
          }

          const smartName = resolveSmartName(profileData);
          
          const u: UserProfile = {
              id: asString(profileData.id),
              name: smartName,
              fullName: asString(profileData.nome_completo || profileData.nome_operador),
              email: asString(profileData.usuario_email || profileData.email),
              businessName: asString(profileData.nome_empresa),
              document: asString(profileData.document),
              phone: asString(profileData.phone),
              address: asString(profileData.address),
              addressNumber: asString(profileData.address_number),
              neighborhood: asString(profileData.neighborhood),
              city: asString(profileData.city),
              state: asString(profileData.state),
              zipCode: asString(profileData.zip_code),
              pixKey: asString(profileData.pix_key),
              photo: profileData.avatar_url,
              password: profileData.senha_acesso,
              recoveryPhrase: profileData.recovery_phrase,
              accessLevel: asNumber(profileData.access_level || profileData.perfil, 2),
              totalAvailableCapital: asNumber(profileData.total_available_capital),
              interestBalance: asNumber(profileData.interest_balance),
              createdAt: asString(profileData.created_at),
              brandColor: asString(profileData.brand_color, '#2563eb'),
              logoUrl: profileData.logo_url,
              defaultInterestRate: asNumber(profileData.default_interest_rate, 30),
              defaultFinePercent: asNumber(profileData.default_fine_percent, 2),
              defaultDailyInterestPercent: asNumber(profileData.default_daily_interest_percent, 1),
              targetCapital: asNumber(profileData.target_capital),
              targetProfit: asNumber(profileData.target_profit)
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
          setLoadError(error.message || "Erro de conexão.");
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
     if (!error && data) setAllUsers(data);
  }, []);

  useEffect(() => {
    if (activeProfileId) {
      fetchFullData(activeProfileId);
    } else {
        setActiveUser(null);
        setIsLoadingData(false);
    }
  }, [activeProfileId, fetchFullData]);

  useEffect(() => {
      if (!activeUser || activeUser.id === 'DEMO') return;
      
      const updateHeartbeat = async () => {
          if (heartbeatFailures.current > 3) return;
          try {
            await supabase.from('perfis').update({ last_active_at: new Date().toISOString() }).eq('id', activeUser.id);
            heartbeatFailures.current = 0;
          } catch (e) {
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
    sortOption, setSortOption, // Expose sort state
    searchTerm, setSearchTerm,
    clientSearchTerm, setClientSearchTerm,
    profileEditForm, setProfileEditForm
  };
};