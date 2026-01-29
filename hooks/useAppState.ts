
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, Client, CapitalSource, UserProfile } from '../types';
import { maskPhone, maskDocument } from '../utils/formatters';
import { mapLoanFromDB } from '../services/adapters/dbAdapters';
import { asString, asNumber } from '../utils/safe';

export const useAppState = (activeProfileId: string | null) => {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sources, setSources] = useState<CapitalSource[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CLIENTS' | 'SOURCES' | 'PROFILE' | 'MASTER' | 'LEGAL'>('DASHBOARD');
  const [mobileDashboardTab, setMobileDashboardTab] = useState<'CONTRACTS' | 'BALANCE'>('CONTRACTS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATRASADOS' | 'EM_DIA' | 'PAGOS' | 'ARQUIVADOS' | 'ATRASO_CRITICO'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  
  const [profileEditForm, setProfileEditForm] = useState<UserProfile | null>(null);

  const fetchFullData = useCallback(async (profileId: string) => {
      if (!profileId) return;
      
      setIsLoadingData(true);
      
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
          // 1. Perfil (PASSO CRÍTICO)
          const { data: profile, error: profileError } = await supabase.from('perfis').select('*').eq('id', profileId).single();
          
          if (profileError || !profile) {
              console.error("Erro ao carregar perfil:", profileError);
              if (profileError?.code === 'PGRST116') {
                  localStorage.removeItem('cm_session');
                  window.location.reload();
                  return;
              }
              throw new Error("Perfil não encontrado.");
          }

          const u: UserProfile = {
              id: asString(profile.id),
              name: asString(profile.nome_operador, 'Sem Nome'),
              fullName: asString(profile.nome_completo),
              email: asString(profile.usuario_email),
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

          // 2. Carregamento de Dados Secundários (NÃO CRÍTICO - Try/Catch isolado)
          // Isso evita que a falta de uma tabela ou erro de fuso impeça o login
          try {
              // 2.1 Clientes
              const { data: clientsData } = await supabase.from('clientes').select('*').eq('profile_id', profileId);
              if (clientsData) {
                  setClients(clientsData.map((c: any) => ({
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
                      clientNumber: asString(c.client_number)
                  })));
              }

              // 2.2 Fontes
              const { data: sourcesData } = await supabase.from('fontes').select('*').eq('profile_id', profileId);
              if (sourcesData) {
                  setSources(sourcesData.map((s: any) => ({
                      id: asString(s.id),
                      name: asString(s.name, 'Fonte Sem Nome'),
                      type: s.type,
                      balance: asNumber(s.balance)
                  })));
              }

              // 2.3 Contratos e Acordos
              const { data: loansData, error: loansError } = await supabase
                  .from('contratos')
                  .select(`
                      *,
                      parcelas (*),
                      transacoes (*),
                      sinalizacoes_pagamento (*),
                      acordos_inadimplencia (
                          id, loan_id, profile_id, status, tipo, total_base, total_negociado,
                          num_parcelas, juros_mensal_percent, periodicidade, first_due_date, created_at, updated_at,
                          acordo_parcelas (*)
                      )
                  `)
                  .eq('profile_id', profileId);

              if (loansData) {
                  const mappedLoans = loansData.map((l: any) => mapLoanFromDB(l, []));
                  setLoans(mappedLoans);
              } else if (loansError) {
                  console.warn("Erro ao buscar contratos (pode ser falta de tabelas de acordo):", loansError.message);
              }
          } catch (secondaryError) {
              console.warn("Falha ao carregar dados secundários (Contratos/Clientes):", secondaryError);
          }

      } catch (error) {
          console.error("Erro crítico ao carregar perfil:", error);
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
    }
  }, [activeProfileId, fetchFullData]);

  useEffect(() => {
      if (!activeUser || activeUser.id === 'DEMO') return;
      const updateHeartbeat = async () => {
          await supabase.from('perfis').update({ last_active_at: new Date().toISOString() }).eq('id', activeUser.id);
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
    fetchFullData,
    activeTab, setActiveTab,
    mobileDashboardTab, setMobileDashboardTab,
    statusFilter, setStatusFilter,
    searchTerm, setSearchTerm,
    clientSearchTerm, setClientSearchTerm,
    profileEditForm, setProfileEditForm
  };
};
