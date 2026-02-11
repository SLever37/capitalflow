
// hooks/useAppState.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, Client, CapitalSource, UserProfile, SortOption, AppTab } from '../types';
import { maskPhone, maskDocument } from '../utils/formatters';
import { mapLoanFromDB } from '../services/adapters/dbAdapters';
import { asString, asNumber } from '../utils/safe';

const DEFAULT_NAV: AppTab[] = ['DASHBOARD', 'CLIENTS', 'TEAM'];
const DEFAULT_HUB: AppTab[] = ['SOURCES', 'LEGAL', 'PROFILE', 'MASTER', 'PERSONAL_FINANCE'];

// Mock completo para o modo demonstração
const DEMO_USER: UserProfile = {
  id: 'DEMO',
  name: 'Gestor Demo',
  fullName: 'Usuário de Demonstração',
  email: 'demo@capitalflow.app',
  businessName: 'Capital Demo',
  accessLevel: 1,
  interestBalance: 1500.0,
  totalAvailableCapital: 50000.0,
  ui_nav_order: DEFAULT_NAV,
  ui_hub_order: DEFAULT_HUB,
  brandColor: '#2563eb',
};

const mapProfileFromDB = (data: any): UserProfile => {
  // Migração on-the-fly: Garante que PERSONAL_FINANCE esteja no menu
  let hubOrder = (data.ui_hub_order || DEFAULT_HUB) as AppTab[];
  if (Array.isArray(hubOrder) && !hubOrder.includes('PERSONAL_FINANCE')) {
    hubOrder = [...hubOrder, 'PERSONAL_FINANCE'];
  }

  return {
    id: data.id,
    name: asString(data.nome_operador),
    fullName: asString(data.nome_completo),
    email: asString(data.usuario_email || data.email),
    document: asString(data.document),
    phone: asString(data.phone),
    address: asString(data.address),
    addressNumber: asString(data.address_number),
    neighborhood: asString(data.neighborhood),
    city: asString(data.city),
    state: asString(data.state),
    zipCode: asString(data.zip_code),
    businessName: asString(data.nome_empresa),
    accessLevel: asNumber(data.access_level),
    interestBalance: asNumber(data.interest_balance),
    totalAvailableCapital: asNumber(data.total_available_capital),
    supervisor_id: data.supervisor_id,
    pixKey: asString(data.pix_key),
    photo: data.avatar_url,
    brandColor: '#2563eb', // Força a cor original
    logoUrl: data.logo_url,
    password: data.senha_acesso,
    recoveryPhrase: data.recovery_phrase,
    defaultInterestRate: asNumber(data.default_interest_rate),
    defaultFinePercent: asNumber(data.default_fine_percent),
    defaultDailyInterestPercent: asNumber(data.default_daily_interest_percent),
    targetCapital: asNumber(data.target_capital),
    targetProfit: asNumber(data.target_profit),
    ui_nav_order: data.ui_nav_order || DEFAULT_NAV,
    ui_hub_order: hubOrder,
    createdAt: data.created_at,
  };
};

export const useAppState = (activeProfileId: string | null) => {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sources, setSources] = useState<CapitalSource[]>([]);
  const [staffMembers, setStaffMembers] = useState<UserProfile[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [navOrder, setNavOrder] = useState<AppTab[]>(DEFAULT_NAV);
  const [hubOrder, setHubOrder] = useState<AppTab[]>(DEFAULT_HUB);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('DASHBOARD');
  const [statusFilter, setStatusFilter] = useState<
    'TODOS' | 'ATRASADOS' | 'EM_DIA' | 'PAGOS' | 'ARQUIVADOS' | 'ATRASO_CRITICO'
  >('TODOS');
  const [sortOption, setSortOption] = useState<SortOption>('DUE_DATE_ASC');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [profileEditForm, setProfileEditForm] = useState<UserProfile | null>(null);

  // RESET DE ESTADO QUANDO LOGOUT ACONTECE
  useEffect(() => {
    if (!activeProfileId || activeProfileId === 'null') {
      setActiveUser(null);
      setLoadError(null);
      setIsLoadingData(false);
      setLoans([]);
      setClients([]);
      setSources([]);
    }
  }, [activeProfileId]);

  const fetchFullData = useCallback(async (profileId: string) => {
    if (!profileId || profileId === 'null' || profileId === 'undefined') {
      setIsLoadingData(false);
      return;
    }

    if (profileId === 'DEMO') {
      setActiveUser(DEMO_USER);
      setProfileEditForm(DEMO_USER);
      setNavOrder(DEFAULT_NAV);
      setHubOrder(DEFAULT_HUB);
      setIsLoadingData(false);
      setLoadError(null);
      return;
    }

    setIsLoadingData(true);
    setLoadError(null);

    try {
      // PERFIL (não quebrar com single quando não houver linha)
      const { data: profileData, error: profileError } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        throw { code: 'PROFILE_NOT_FOUND', message: 'Perfil não encontrado. Faça login novamente.' };
      }

      const u = mapProfileFromDB(profileData);
      setActiveUser(u);
      setProfileEditForm(u);
      setNavOrder(u.ui_nav_order || DEFAULT_NAV);
      setHubOrder(u.ui_hub_order);

      // ✅ ownerId calculado (mas vamos ter fallback)
      const ownerId = u.supervisor_id || u.id;

      const fetchClientsByProfile = async (pid: string) => {
        const res = await supabase
          .from('clientes')
          .select('*')
          .eq('profile_id', pid)
          .order('created_at', { ascending: false })
          .limit(1000);
        return res;
      };

      const fetchSourcesByProfile = async (pid: string) => {
        const res = await supabase.from('fontes').select('*').eq('profile_id', pid);
        return res;
      };

      const fetchLoansByProfile = async (pid: string) => {
        const res = await supabase
          .from('contratos')
          .select('*, parcelas(*), transacoes(*), acordos_inadimplencia(*, acordo_parcelas(*)), sinalizacoes_pagamento(*)')
          .eq('profile_id', pid);
        return res;
      };

      // 1ª tentativa: tudo no ownerId
      let [clientsRes, sourcesRes, loansRes] = await Promise.all([
        fetchClientsByProfile(ownerId),
        fetchSourcesByProfile(ownerId),
        fetchLoansByProfile(ownerId),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (sourcesRes.error) throw sourcesRes.error;
      if (loansRes.error) throw loansRes.error;

      // ✅ Fallback: se clientes vier vazio e ownerId != u.id, tenta buscar também no u.id
      if ((clientsRes.data?.length || 0) === 0 && ownerId !== u.id) {
        const fallbackClients = await fetchClientsByProfile(u.id);
        if (fallbackClients.error) throw fallbackClients.error;

        const merged = [
          ...(clientsRes.data || []),
          ...(fallbackClients.data || []),
        ].reduce((acc: any[], item: any) => {
          if (!acc.some((x) => x.id === item.id)) acc.push(item);
          return acc;
        }, []);
        clientsRes = { ...clientsRes, data: merged } as any;
      }

      // ✅ Fallback opcional também para fontes
      if ((sourcesRes.data?.length || 0) === 0 && ownerId !== u.id) {
        const fallbackSources = await fetchSourcesByProfile(u.id);
        if (fallbackSources.error) throw fallbackSources.error;

        const merged = [
          ...(sourcesRes.data || []),
          ...(fallbackSources.data || []),
        ].reduce((acc: any[], item: any) => {
          if (!acc.some((x) => x.id === item.id)) acc.push(item);
          return acc;
        }, []);
        sourcesRes = { ...sourcesRes, data: merged } as any;
      }

      // set clients
      if (clientsRes.data) {
        setClients(
          clientsRes.data.map((c: any) => ({
            ...c,
            phone: maskPhone(c.phone),
            document: maskDocument(c.document),
          }))
        );
      } else {
        setClients([]);
      }

      // set sources
      if (sourcesRes.data) {
        setSources(sourcesRes.data.map((s: any) => ({ ...s, balance: asNumber(s.balance) })));
      } else {
        setSources([]);
      }

      // set loans
      if (loansRes.data) {
        setLoans(loansRes.data.map((l: any) => mapLoanFromDB(l, clientsRes.data || [])));
      } else {
        setLoans([]);
      }

      // MASTER: lista usuários
      if (u.accessLevel === 1) {
        const { data: staffData, error: staffErr } = await supabase
          .from('perfis')
          .select('*')
          .neq('id', u.id)
          .order('nome_operador', { ascending: true });

        if (staffErr) throw staffErr;
        if (staffData) setStaffMembers(staffData.map((s) => mapProfileFromDB(s)));
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setLoadError(error?.message || 'Erro de conexão com o banco de dados.');
      // CRÍTICO: Limpa o usuário para tirar do estado de loading e forçar o App a mostrar a tela de Login ou Erro
      setActiveUser(null);
      setClients([]);
      setLoans([]);
      setSources([]);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const saveNavConfig = async (newNav: AppTab[], newHub: AppTab[]) => {
    if (!activeUser) return;

    setNavOrder(newNav);
    setHubOrder(newHub);

    const updatedUser = { ...activeUser, ui_nav_order: newNav, ui_hub_order: newHub };
    setActiveUser(updatedUser);

    if (profileEditForm?.id === activeUser.id) setProfileEditForm(updatedUser);

    if (activeUser.id !== 'DEMO') {
      try {
        await supabase.from('perfis').update({ ui_nav_order: newNav, ui_hub_order: newHub }).eq('id', activeUser.id);
      } catch (e) {
        console.error('Erro técnico na persistência dos menus:', e);
      }
    }
  };

  useEffect(() => {
    if (activeProfileId && activeProfileId !== 'null') {
      fetchFullData(activeProfileId);
    }
  }, [activeProfileId, fetchFullData]);

  return {
    loans,
    setLoans,
    clients,
    setClients,
    sources,
    setSources,
    activeUser,
    setActiveUser,
    staffMembers,
    systemUsers: staffMembers,
    isLoadingData,
    setIsLoadingData,
    loadError,
    setLoadError,
    fetchFullData,
    activeTab,
    setActiveTab,
    statusFilter,
    setStatusFilter,
    sortOption,
    setSortOption,
    searchTerm,
    setSearchTerm,
    clientSearchTerm,
    setClientSearchTerm,
    profileEditForm,
    setProfileEditForm,
    selectedStaffId,
    setSelectedStaffId,
    navOrder,
    hubOrder,
    saveNavConfig,
  };
};
