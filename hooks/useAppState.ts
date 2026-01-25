
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, Client, CapitalSource, UserProfile, LoanStatus } from '../types';
import { maskPhone, maskDocument } from '../utils/formatters';

export const useAppState = (activeProfileId: string | null) => {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sources, setSources] = useState<CapitalSource[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]); // For Admin

  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // UI States managed here for persistence/sharing
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CLIENTS' | 'SOURCES' | 'PROFILE' | 'MASTER'>('DASHBOARD');
  const [mobileDashboardTab, setMobileDashboardTab] = useState<'CONTRACTS' | 'BALANCE'>('CONTRACTS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATRASADOS' | 'EM_DIA' | 'PAGOS' | 'ARQUIVADOS' | 'ATRASO_CRITICO'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  
  const [profileEditForm, setProfileEditForm] = useState<UserProfile | null>(null);

  const fetchFullData = useCallback(async (profileId: string) => {
      if (!profileId) return;
      
      // DEMO MODE HANDLING
      if (profileId === 'DEMO') {
          setActiveUser({
              id: 'DEMO', name: 'Usuário Demo', email: 'demo@app.com', totalAvailableCapital: 100000, interestBalance: 5000,
              photo: undefined, businessName: 'Demo Capital', accessLevel: 2, createdAt: new Date().toISOString(),
              brandColor: '#2563eb', defaultInterestRate: 30, defaultFinePercent: 2, defaultDailyInterestPercent: 1, targetCapital: 150000, targetProfit: 20000
          });
          return; 
      }

      setIsLoadingData(true);
      try {
          // 1. Profile
          const { data: profile, error: profileError } = await supabase.from('perfis').select('*').eq('id', profileId).single();
          
          if (profileError || !profile) {
              console.error("Erro ao carregar perfil:", profileError);
              // Não definimos activeUser, o AppGate mostrará o erro
              throw new Error("Perfil não encontrado ou acesso negado.");
          }

          if (profile) {
              const u: UserProfile = {
                  id: profile.id,
                  name: profile.nome_operador,
                  email: profile.usuario_email,
                  businessName: profile.nome_empresa,
                  document: profile.document,
                  phone: profile.phone,
                  address: profile.address,
                  pixKey: profile.pix_key,
                  photo: profile.avatar_url,
                  password: profile.senha_acesso,
                  recoveryPhrase: profile.recovery_phrase,
                  accessLevel: profile.access_level,
                  totalAvailableCapital: Number(profile.total_available_capital) || 0,
                  interestBalance: Number(profile.interest_balance) || 0,
                  createdAt: profile.created_at,
                  // New Fields Mapping
                  brandColor: profile.brand_color || '#2563eb',
                  logoUrl: profile.logo_url,
                  defaultInterestRate: Number(profile.default_interest_rate) || 30,
                  defaultFinePercent: Number(profile.default_fine_percent) || 2,
                  defaultDailyInterestPercent: Number(profile.default_daily_interest_percent) || 1,
                  targetCapital: Number(profile.target_capital) || 0,
                  targetProfit: Number(profile.target_profit) || 0
              };
              setActiveUser(u);
              setProfileEditForm(u);
          }

          // 2. Clients
          const { data: clientsData } = await supabase.from('clientes').select('*').eq('profile_id', profileId);
          if (clientsData) {
              setClients(clientsData.map((c: any) => ({
                  id: c.id,
                  name: c.name,
                  phone: maskPhone(c.phone || ''),
                  document: maskDocument(c.document || c.cpf || c.cnpj || ''),
                  email: c.email,
                  address: c.address,
                  city: c.city,
                  state: c.state,
                  notes: c.notes,
                  createdAt: c.created_at,
                  accessCode: c.access_code,
                  clientNumber: c.client_number
              })));
          }

          // 3. Sources
          const { data: sourcesData } = await supabase.from('fontes').select('*').eq('profile_id', profileId);
          if (sourcesData) {
              setSources(sourcesData.map((s: any) => ({
                  id: s.id,
                  name: s.name,
                  type: s.type,
                  balance: Number(s.balance)
              })));
          }

          // 4. Loans & Agreements
          const { data: loansData } = await supabase
              .from('contratos')
              .select(`
                  *,
                  parcelas (*),
                  transacoes (*),
                  sinalizacoes_pagamento (*),
                  acordos_inadimplencia (
                      *,
                      acordo_parcelas (*)
                  )
              `)
              .eq('profile_id', profileId);

          if (loansData) {
              const mappedLoans: Loan[] = loansData.map((l: any) => {
                  const installments = (l.parcelas || []).map((p: any) => ({
                      id: p.id,
                      dueDate: p.data_vencimento || p.due_date,
                      amount: Number(p.valor_parcela || p.amount),
                      scheduledPrincipal: Number(p.scheduled_principal),
                      scheduledInterest: Number(p.scheduled_interest),
                      principalRemaining: Number(p.principal_remaining),
                      interestRemaining: Number(p.interest_remaining),
                      lateFeeAccrued: Number(p.late_fee_accrued || 0),
                      avApplied: Number(p.av_applied || 0),
                      paidPrincipal: Number(p.paid_principal || 0),
                      paidInterest: Number(p.paid_interest || 0),
                      paidLateFee: Number(p.paid_late_fee || 0),
                      paidTotal: Number(p.paid_total || 0),
                      status: p.status as LoanStatus,
                      paidDate: p.paid_date,
                      logs: []
                  }));

                  const ledger = (l.transacoes || []).map((t: any) => ({
                      id: t.id,
                      date: t.date,
                      type: t.type,
                      amount: Number(t.amount),
                      principalDelta: Number(t.principal_delta),
                      interestDelta: Number(t.interest_delta),
                      lateFeeDelta: Number(t.late_fee_delta),
                      sourceId: t.source_id,
                      installmentId: t.installment_id,
                      agreementId: t.agreement_id,
                      notes: t.notes
                  }));

                  const signals = (l.sinalizacoes_pagamento || []).map((s: any) => ({
                      id: s.id,
                      date: s.created_at,
                      type: s.tipo_intencao,
                      status: s.status,
                      comprovanteUrl: s.comprovante_url,
                      clientViewedAt: s.client_viewed_at,
                      reviewNote: s.review_note
                  }));

                  // Map Active Agreement if exists
                  let activeAgreement = undefined;
                  if (l.acordos_inadimplencia && l.acordos_inadimplencia.length > 0) {
                      // Pega o acordo mais recente ou ativo
                      const rawAgreement = l.acordos_inadimplencia.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                      
                      activeAgreement = {
                          id: rawAgreement.id,
                          loanId: l.id,
                          type: rawAgreement.tipo_acordo,
                          totalDebtAtNegotiation: Number(rawAgreement.total_divida_base),
                          negotiatedTotal: Number(rawAgreement.total_negociado),
                          interestRate: Number(rawAgreement.juros_aplicado),
                          installmentsCount: rawAgreement.qtd_parcelas,
                          frequency: rawAgreement.periodicidade,
                          startDate: rawAgreement.created_at,
                          status: rawAgreement.status,
                          createdAt: rawAgreement.created_at,
                          installments: (rawAgreement.acordo_parcelas || []).map((ap: any) => ({
                              id: ap.id,
                              agreementId: rawAgreement.id,
                              number: ap.numero,
                              dueDate: ap.data_vencimento,
                              amount: Number(ap.valor),
                              status: ap.status,
                              paidAmount: Number(ap.valor_pago),
                              paidDate: ap.data_pagamento
                          }))
                      };
                  }

                  return {
                      id: l.id,
                      clientId: l.client_id,
                      debtorName: l.debtor_name,
                      debtorPhone: l.debtor_phone,
                      debtorDocument: l.debtor_document,
                      debtorAddress: l.debtor_address,
                      sourceId: l.source_id,
                      preferredPaymentMethod: l.preferred_payment_method,
                      pixKey: l.pix_key,
                      principal: Number(l.principal),
                      interestRate: Number(l.interest_rate) || 0,
                      finePercent: Number(l.fine_percent) || 0,
                      dailyInterestPercent: Number(l.daily_interest_percent) || 0,
                      billingCycle: l.billing_cycle,
                      amortizationType: l.amortization_type,
                      startDate: String(l.start_date || new Date().toISOString()),
                      createdAt: String(l.created_at || ''), 
                      totalToReceive: Number(l.total_to_receive) || 0,
                      notes: String(l.notes || ''),
                      guaranteeDescription: String(l.guarantee_description || ''),
                      policiesSnapshot: l.policies_snapshot || null,
                      installments,
                      ledger,
                      paymentSignals: signals,
                      customDocuments: l.policies_snapshot?.customDocuments || [],
                      isArchived: l.is_archived,
                      attachments: [], 
                      documentPhotos: [],
                      activeAgreement
                  };
              });
              setLoans(mappedLoans);
          }
      } catch (error) {
          console.error("Error fetching data:", error);
      } finally {
          setIsLoadingData(false);
      }
  }, []);

  const fetchAllUsers = useCallback(async () => {
     // Admin: Buscar todos e ordenar por última atividade
     const { data, error } = await supabase.from('perfis').select('*').order('last_active_at', { ascending: false, nullsFirst: false });
     if (error) console.error("Admin fetch error:", error);
     if (data) setAllUsers(data);
  }, []);

  useEffect(() => {
    if (activeProfileId) {
      fetchFullData(activeProfileId);
    }
  }, [activeProfileId, fetchFullData]);

  // HEARTBEAT ONLINE STATUS
  useEffect(() => {
      if (!activeUser || activeUser.id === 'DEMO') return;

      const updateHeartbeat = async () => {
          // Atualiza last_active_at sem bloquear a UI
          await supabase.from('perfis').update({ last_active_at: new Date().toISOString() }).eq('id', activeUser.id);
      };

      // Atualiza imediatamente e depois a cada 2 minutos
      updateHeartbeat();
      const interval = setInterval(updateHeartbeat, 120000); 

      return () => clearInterval(interval);
  }, [activeUser?.id]);

  // Efeito Especial: Se for Admin (Access Level 1), carrega todos os usuários
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
