import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, Client, CapitalSource, UserProfile, SortOption, AppTab } from '../types';
import { maskPhone, maskDocument } from '../utils/formatters';
import { mapLoanFromDB } from '../services/adapters/dbAdapters';
import { asString, asNumber } from '../utils/safe';

const DEFAULT_NAV: AppTab[] = ['DASHBOARD', 'CLIENTS', 'TEAM'];
const DEFAULT_HUB: AppTab[] = ['SOURCES', 'LEGAL', 'PROFILE', 'PERSONAL_FINANCE', 'LEADS', 'ACQUISITION'];

const CACHE_KEY = (profileId: string) => `cm_cache_${profileId}`;
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 horas

type AppCacheSnapshot = {
  ts: number;
  activeUser: UserProfile;
  loans: Loan[];
  clients: Client[];
  sources: CapitalSource[];
  staffMembers: UserProfile[];
  navOrder: AppTab[];
  hubOrder: AppTab[];
};

const readCache = (profileId: string): AppCacheSnapshot | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts) return null;
    if (Date.now() - parsed.ts > CACHE_MAX_AGE) return null;
    return parsed as AppCacheSnapshot;
  } catch {
    return null;
  }
};

const writeCache = (profileId: string, snap: Omit<AppCacheSnapshot, 'ts'>) => {
  try {
    const payload: AppCacheSnapshot = { ...snap, ts: Date.now() };
    localStorage.setItem(CACHE_KEY(profileId), JSON.stringify(payload));
  } catch (e) {
    console.warn('Falha ao salvar cache local', e);
  }
};

const DEMO_USER: UserProfile = {
  id: 'DEMO',
  name: 'Gestor Demo',
  fullName: 'Usuário de Demonstração',
  email: 'demo@capitalflow.app',
  businessName: 'Capital Demo',
  accessLevel: 1,
  interestBalance: 1500,
  totalAvailableCapital: 50000,
  ui_nav_order: DEFAULT_NAV,
  ui_hub_order: DEFAULT_HUB,
  brandColor: '#2563eb'
};

const mapProfileFromDB = (data: any): UserProfile => {
  let hubOrder = ((data.ui_hub_order || DEFAULT_HUB) as string[]).filter(t => t !== 'MASTER') as AppTab[];

  if (Array.isArray(hubOrder) && !hubOrder.includes('PERSONAL_FINANCE')) {
    hubOrder = [...hubOrder, 'PERSONAL_FINANCE'];
  }

  if (Array.isArray(hubOrder) && !hubOrder.includes('ACQUISITION')) {
    hubOrder = [...hubOrder, 'ACQUISITION'];
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
    brandColor: '#2563eb',
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
    createdAt: data.created_at
  };
};

export const useAppState = (activeProfileId: string | null) => {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sources, setSources] = useState<CapitalSource[]>([]);
  const [staffMembers, setStaffMembers] = useState<UserProfile[]>([]);
  const [navOrder, setNavOrder] = useState<AppTab[]>(DEFAULT_NAV);
  const [hubOrder, setHubOrder] = useState<AppTab[]>(DEFAULT_HUB);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Restore missing states
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<AppTab>('DASHBOARD');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATRASADOS' | 'EM_DIA' | 'PAGOS' | 'ARQUIVADOS' | 'ATRASO_CRITICO'>('TODOS');
  const [sortOption, setSortOption] = useState<SortOption>('DUE_DATE_ASC');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [profileEditForm, setProfileEditForm] = useState<UserProfile | null>(null);

  const fetchFullData = useCallback(async (profileId: string) => {
    if (!profileId || profileId === 'null') return;

    if (profileId === 'DEMO') {
      setActiveUser(DEMO_USER);
      setProfileEditForm(DEMO_USER);
      setNavOrder(DEFAULT_NAV);
      setHubOrder(DEFAULT_HUB);
      return;
    }

    setIsLoadingData(true);
    setLoadError(null);

    try {
      const { data: profileData, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (error) throw error;
      if (!profileData) throw new Error('Perfil não encontrado');

      const u = mapProfileFromDB(profileData);

      const ownerId = profileData.owner_profile_id || profileData.id;

      const [clientsRes, sourcesRes, loansRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('owner_id', ownerId),
        supabase.from('fontes').select('*').eq('profile_id', ownerId),
        supabase
          .from('contratos')
          .select('*, parcelas(*), transacoes(*), acordos_inadimplencia(*, acordo_parcelas(*)), sinalizacoes_pagamento(*)')
          .eq('owner_id', ownerId)
      ]);

      const mappedClients = (clientsRes.data || []).map((c: any) => ({
        ...c,
        phone: maskPhone(c.phone),
        document: maskDocument(c.document)
      }));

      const mappedSources = (sourcesRes.data || []).map((s: any) => ({
        ...s,
        balance: asNumber(s.balance)
      }));

      const mappedLoans = (loansRes.data || []).map((l: any) =>
        mapLoanFromDB(l, clientsRes.data || [])
      );

      let mappedStaff: UserProfile[] = [];

      const { data: staffData } = await supabase
        .from('perfis')
        .select('*')
        .eq('owner_profile_id', ownerId)
        .order('nome_operador', { ascending: true });

      if (staffData) {
        mappedStaff = staffData.map(s => mapProfileFromDB(s));
      }

      setActiveUser(u);
      setProfileEditForm(u);
      setNavOrder(u.ui_nav_order || DEFAULT_NAV);
      setHubOrder(u.ui_hub_order || DEFAULT_HUB);
      setClients(mappedClients);
      setSources(mappedSources);
      setLoans(mappedLoans);
      setStaffMembers(mappedStaff);

      writeCache(profileId, {
        activeUser: u,
        clients: mappedClients,
        sources: mappedSources,
        loans: mappedLoans,
        staffMembers: mappedStaff,
        navOrder: u.ui_nav_order || DEFAULT_NAV,
        hubOrder: u.ui_hub_order || DEFAULT_HUB
      });

    } catch (error: any) {
      const errMsg = error.message || String(error);
      console.error('Erro ao carregar dados:', error);

      // Se for erro de token inválido, sinaliza necessidade de reauth
      if (
        errMsg.includes('Refresh Token') || 
        errMsg.includes('JWT') ||
        error.code === 'PGRST301' // JWT expired
      ) {
        setLoadError('SESSAO_EXPIRADA');
        return;
      }

      setLoadError(errMsg || 'Erro de conexão.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!activeProfileId) {
      setActiveUser(null);
      return;
    }

    const cached = readCache(activeProfileId);

    if (cached?.activeUser) {
      setActiveUser(cached.activeUser);
      setProfileEditForm(cached.activeUser);
      setNavOrder(cached.navOrder);
      setHubOrder(cached.hubOrder);
      setClients(cached.clients);
      setSources(cached.sources);
      setLoans(cached.loans);
      setStaffMembers(cached.staffMembers);

      setTimeout(() => {
        fetchFullData(activeProfileId);
      }, 1000);
    } else {
      fetchFullData(activeProfileId);
    }
  }, [activeProfileId]);

  const saveNavConfig = async (newNav: AppTab[], newHub: AppTab[]) => {
    if (!activeUser) return;
    setNavOrder(newNav);
    setHubOrder(newHub);
    const updatedUser = { ...activeUser, ui_nav_order: newNav, ui_hub_order: newHub };
    setActiveUser(updatedUser);

    if (profileEditForm?.id === activeUser.id) {
      setProfileEditForm(updatedUser);
    }

    if (activeUser.id !== 'DEMO') {
        try {
            await supabase.from('perfis').update({ ui_nav_order: newNav, ui_hub_order: newHub }).eq('id', activeUser.id);
        } catch (e) { console.error(e); }
    }
  };

  return {
    loans, setLoans,
    clients, setClients,
    sources, setSources,
    activeUser, setActiveUser,
    staffMembers, systemUsers: staffMembers,
    navOrder,
    hubOrder,
    isLoadingData, setIsLoadingData,
    loadError, setLoadError,
    fetchFullData,
    // Returned extra states
    selectedStaffId, setSelectedStaffId,
    activeTab, setActiveTab,
    statusFilter, setStatusFilter,
    sortOption, setSortOption,
    searchTerm, setSearchTerm,
    clientSearchTerm, setClientSearchTerm,
    profileEditForm, setProfileEditForm,
    saveNavConfig
  };
};