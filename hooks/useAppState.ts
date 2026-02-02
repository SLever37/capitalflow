
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, Client, CapitalSource, UserProfile, SortOption, AppTab } from '../types';
import { maskPhone, maskDocument } from '../utils/formatters';
import { mapLoanFromDB } from '../services/adapters/dbAdapters';
import { asString, asNumber } from '../utils/safe';

const DEFAULT_NAV: AppTab[] = ['DASHBOARD', 'CLIENTS', 'TEAM'];
const DEFAULT_HUB: AppTab[] = ['SOURCES', 'LEGAL', 'PROFILE', 'MASTER'];

// Helper de mapeamento para reutilização
const mapProfileFromDB = (data: any): UserProfile => ({
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
    brandColor: data.brand_color,
    logoUrl: data.logo_url,
    password: data.senha_acesso,
    recoveryPhrase: data.recovery_phrase,
    defaultInterestRate: asNumber(data.default_interest_rate),
    defaultFinePercent: asNumber(data.default_fine_percent),
    defaultDailyInterestPercent: asNumber(data.default_daily_interest_percent),
    targetCapital: asNumber(data.target_capital),
    targetProfit: asNumber(data.target_profit),
    ui_nav_order: data.ui_nav_order || DEFAULT_NAV,
    ui_hub_order: data.ui_hub_order || DEFAULT_HUB,
    createdAt: data.created_at
});

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
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATRASADOS' | 'EM_DIA' | 'PAGOS' | 'ARQUIVADOS' | 'ATRASO_CRITICO'>('TODOS');
  const [sortOption, setSortOption] = useState<SortOption>('DUE_DATE_ASC');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [profileEditForm, setProfileEditForm] = useState<UserProfile | null>(null);

  const fetchFullData = useCallback(async (profileId: string) => {
      if (!profileId || profileId === 'null') return;
      
      // Proteção para modo Demo
      if (profileId === 'DEMO') {
          return;
      }

      setIsLoadingData(true);
      try {
          const { data: profileData, error: profileError } = await supabase.from('perfis').select('*').eq('id', profileId).single();
          if (profileError) throw profileError;

          // Mapeamento do Usuário Ativo
          const u = mapProfileFromDB(profileData);
          
          setActiveUser(u);
          setProfileEditForm(u);
          setNavOrder(u.ui_nav_order!);
          setHubOrder(u.ui_hub_order!);

          const ownerId = u.supervisor_id || u.id;
          const isStaff = !!u.supervisor_id;

          let loansQuery = supabase.from('contratos').select('*, parcelas(*), transacoes(*)').eq('profile_id', ownerId);
          if (isStaff) loansQuery = loansQuery.eq('operador_responsavel_id', u.id);

          const [clientsRes, sourcesRes, loansRes] = await Promise.all([
              supabase.from('clientes').select('*').eq('profile_id', ownerId),
              supabase.from('fontes').select('*').eq('profile_id', ownerId),
              loansQuery
          ]);

          if (clientsRes.data) setClients(clientsRes.data.map((c: any) => ({ ...c, phone: maskPhone(c.phone), document: maskDocument(c.document) })));
          if (sourcesRes.data) setSources(sourcesRes.data.map((s: any) => ({ ...s, balance: asNumber(s.balance) })));
          if (loansRes.data) setLoans(loansRes.data.map((l: any) => mapLoanFromDB(l, clientsRes.data || [])));

          // Carregamento de Equipe (Se for Master)
          if (u.accessLevel === 1) {
              const { data: staffData } = await supabase.from('perfis').select('*').eq('supervisor_id', u.id);
              if (staffData) {
                  // AQUI ESTAVA O ERRO: Mapeamos o array de staff corretamente agora
                  const mappedStaff = staffData.map(s => mapProfileFromDB(s));
                  setStaffMembers(mappedStaff);
              }
          }

      } catch (error: any) {
          console.error("Erro ao carregar dados do perfil:", error);
          setLoadError(error.message);
      } finally {
          setIsLoadingData(false);
      }
  }, []);

  const saveNavConfig = async (newNav: AppTab[], newHub: AppTab[]) => {
      if (!activeUser) return;
      
      // 1. Atualização Imediata da UI (Estado das Listas)
      setNavOrder(newNav);
      setHubOrder(newHub);

      // 2. Sincronização do objeto do Usuário Ativo
      const updatedUser = { 
          ...activeUser, 
          ui_nav_order: newNav, 
          ui_hub_order: newHub 
      };
      setActiveUser(updatedUser);
      
      // Sincroniza também o formulário de edição se estiver aberto
      if (profileEditForm?.id === activeUser.id) {
          setProfileEditForm(updatedUser);
      }

      // 3. Persistência no Banco de Dados (apenas se não for demo)
      if (activeUser.id !== 'DEMO') {
          try {
              const { error } = await supabase
                .from('perfis')
                .update({ 
                    ui_nav_order: newNav, 
                    ui_hub_order: newHub 
                })
                .eq('id', activeUser.id);
                
              if (error) {
                  console.error("Falha ao salvar configuração no banco:", error);
              }
          } catch (e) {
              console.error("Erro técnico na persistência dos menus:", e);
          }
      }
  };

  useEffect(() => { if (activeProfileId) fetchFullData(activeProfileId); }, [activeProfileId, fetchFullData]);

  return {
    loans, setLoans, clients, setClients, sources, setSources, activeUser, setActiveUser, staffMembers,
    isLoadingData, setIsLoadingData, loadError, fetchFullData, activeTab, setActiveTab,
    statusFilter, setStatusFilter, sortOption, setSortOption, searchTerm, setSearchTerm,
    clientSearchTerm, setClientSearchTerm, profileEditForm, setProfileEditForm,
    selectedStaffId, setSelectedStaffId, navOrder, hubOrder, saveNavConfig
  };
};
