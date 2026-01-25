
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, Client, CapitalSource, UserProfile, LoanStatus, Agreement, AgreementStatus } from '../types';
import { maskPhone, maskDocument } from '../utils/formatters';

// --- ADAPTER JURÍDICO (BANCO -> FRONTEND) ---
// Converte schema real do banco (acordos_inadimplencia) para o modelo da aplicação (Agreement)
// Garante integridade de dados para o Módulo Jurídico e evita quebras de renderização.
const agreementAdapter = (raw: any): Agreement => {
    // 1. Normalização de Status (Banco -> Frontend)
    const dbStatus = String(raw.status || '').toUpperCase();
    let normalizedStatus: AgreementStatus = 'ACTIVE'; // Default seguro

    if (['PAGO', 'PAID', 'QUITADO'].includes(dbStatus)) normalizedStatus = 'PAID';
    else if (['BROKEN', 'QUEBRADO', 'CANCELADO', 'INATIVO'].includes(dbStatus)) normalizedStatus = 'BROKEN';
    else if (['ATIVO', 'ACTIVE'].includes(dbStatus)) normalizedStatus = 'ACTIVE';
    else normalizedStatus = 'ACTIVE'; // Fallback para ATIVO se desconhecido, para não esconder o acordo

    // 2. Normalização de Parcelas
    const installments = (raw.acordo_parcelas || []).map((p: any) => ({
        id: p.id,
        agreementId: raw.id,
        number: p.numero, // Campo DB: numero
        dueDate: p.due_date, // Campo DB: due_date
        amount: Number(p.amount), // Campo DB: amount
        status: (['PAGO', 'PAID'].includes(String(p.status).toUpperCase())) ? 'PAID' : String(p.status || 'PENDING').toUpperCase(),
        paidAmount: Number(p.paid_amount || 0), // Campo DB: paid_amount
        paidDate: p.paid_at // Campo DB: paid_at
    })).sort((a: any, b: any) => a.number - b.number);

    // 3. Objeto Final Tipado
    return {
        id: raw.id,
        loanId: raw.loan_id,
        type: raw.tipo || 'PARCELADO_COM_JUROS', // Campo DB: tipo
        totalDebtAtNegotiation: Number(raw.total_base || 0), // Campo DB: total_base
        negotiatedTotal: Number(raw.total_negociado || 0), // Campo DB: total_negociado
        interestRate: Number(raw.juros_mensal_percent || 0), // Campo DB: juros_mensal_percent
        installmentsCount: Number(raw.num_parcelas || installments.length), // Campo DB: num_parcelas
        frequency: raw.periodicidade || 'MONTHLY', // Campo DB: periodicidade
        startDate: raw.created_at, // Usa data de criação como início
        status: normalizedStatus,
        createdAt: raw.created_at,
        installments: installments
    } as Agreement;
};

export const useAppState = (activeProfileId: string | null) => {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sources, setSources] = useState<CapitalSource[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]); // For Admin

  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // UI States managed here for persistence/sharing
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CLIENTS' | 'SOURCES' | 'PROFILE' | 'MASTER' | 'LEGAL'>('DASHBOARD');
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
                  addressNumber: profile.address_number,
                  neighborhood: profile.neighborhood,
                  city: profile.city,
                  state: profile.state,
                  zipCode: profile.zip_code,

                  pixKey: profile.pix_key,
                  photo: profile.avatar_url,
                  password: profile.senha_acesso,
                  recoveryPhrase: profile.recovery_phrase,
                  accessLevel: profile.access_level,
                  totalAvailableCapital: Number(profile.total_available_capital) || 0,
                  interestBalance: Number(profile.interest_balance) || 0,
                  createdAt: profile.created_at,
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
                      id,
                      loan_id,
                      profile_id,
                      status,
                      tipo,
                      total_base,
                      total_negociado,
                      num_parcelas,
                      juros_mensal_percent,
                      periodicidade,
                      first_due_date,
                      created_at,
                      updated_at,
                      acordo_parcelas (
                          id,
                          acordo_id,
                          numero,
                          due_date,
                          amount,
                          paid_amount,
                          status,
                          paid_at
                      )
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

                  // Mapeamento Estrito de Acordos (MÓDULO JURÍDICO)
                  let activeAgreement = undefined;
                  if (l.acordos_inadimplencia && l.acordos_inadimplencia.length > 0) {
                      // Ordena para pegar o mais recente e aplica o Adapter
                      const rawAgreement = l.acordos_inadimplencia.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                      activeAgreement = agreementAdapter(rawAgreement);
                  }

                  // LÓGICA DE FALLBACK ROBUSTO PARA TELEFONE
                  let phone = l.debtor_phone || l.phone || l.telefone || l.celular;
                  if ((!phone || String(phone).trim() === '') && l.client_id && clientsData) {
                      const linkedClient = clientsData.find((c: any) => c.id === l.client_id);
                      if (linkedClient) {
                          phone = linkedClient.phone || linkedClient.telefone || linkedClient.celular;
                      }
                  }
                  
                  if (!phone || String(phone).trim() === '') {
                      phone = '000.000.000-00';
                  }

                  return {
                      id: l.id,
                      clientId: l.client_id,
                      debtorName: l.debtor_name,
                      debtorPhone: maskPhone(phone),
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
