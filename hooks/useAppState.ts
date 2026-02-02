
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, Client, CapitalSource, UserProfile, SortOption, AppTab } from '../types';
import { maskPhone, maskDocument } from '../utils/formatters';
import { mapLoanFromDB } from '../services/adapters/dbAdapters';
import { asString, asNumber } from '../utils/safe';

const DEFAULT_NAV: AppTab[] = ['DASHBOARD', 'CLIENTS', 'TEAM'];
const DEFAULT_HUB: AppTab[] = ['SOURCES', 'LEGAL', 'PROFILE', 'MASTER'];

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

          // Mapeamento completo dos campos do banco para a interface UserProfile
          const u: UserProfile = {
              id: profileData.id,
              name: asString(profileData.nome_operador), // Nome de Acesso
              fullName: asString(profileData.nome_completo), // Nome Completo
              email: asString(profileData.usuario_email || profileData.email),
              document: asString(profileData.document), // CPF/CNPJ
              phone: asString(profileData.phone),
              
              // Endereço
              address: asString(profileData.address),
              addressNumber: asString(profileData.address_number),
              neighborhood: asString(profileData.neighborhood),
              city: asString(profileData.city),
              state: asString(profileData.state),
              zipCode: asString(profileData.zip_code),
              
              businessName: asString(profileData.nome_empresa),
              accessLevel: asNumber(profileData.access_level),
              interestBalance: asNumber(profileData.interest_balance),
              totalAvailableCapital: asNumber(profileData.total_available_capital),
              supervisor_id: profileData.supervisor_id,
              pixKey: asString(profileData.pix_key),
              photo: profileData.avatar_url,
              brandColor: profileData.brand_color,
              logoUrl: profileData.logo_url,
              password: profileData.senha_acesso,
              recoveryPhrase: profileData.recovery_phrase,
              
              // Configurações e Metas
              defaultInterestRate: asNumber(profileData.default_interest_rate),
              defaultFinePercent: asNumber(profileData.default_fine_percent),
              defaultDailyInterestPercent: asNumber(profileData.default_daily_interest_percent),
              targetCapital: asNumber(profileData.target_capital),
              targetProfit: asNumber(profileData.target_profit),
              
              ui_nav_order: profileData.ui_nav_order || DEFAULT_NAV,
              ui_hub_order: profileData.ui_hub_order || DEFAULT_HUB,
              createdAt: profileData.created_at
          };
          
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

          if (u.accessLevel === 1) {
              const { data: staff } = await supabase.from('perfis').select('*').eq('supervisor_id', u.id);
              if (staff) setStaffMembers(staff as any);
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
