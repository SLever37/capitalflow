
# Auditoria Técnica: Parte 9 - Amortização Seletiva e Fluxo de Caixa

Esta auditoria prova a implementação da lógica financeira avançada solicitada, garantindo que o sistema não seja genérico.

## 1. Amortização Seletiva (Engine de Domínio)
**Arquivo:** `src/domain/loanEngine.ts`
- **Lógica:** Implementada a função `calculateAmortization` que segue a prioridade rigorosa:
  1. `paidLateFee` (Multa/Mora)
  2. `paidInterest` (Juros)
  3. `paidPrincipal` (Principal/Capital)
- **Ciclo de 30 Dias:** A função `computeRemainingBalance` agora calcula `daysInCycle` e `isCyclePaid`. Se o juros/multa do mês for zerado, a parcela é considerada "MÊS PAGO".

## 2. Gestão de Fluxo de Caixa (Capital vs Lucro)
**Arquivo:** `supabase/migrations/20260227_process_payment_v3_selective.sql`
- **Capital Investido:** O valor de `p_principal_paid` retorna para a `p_source_id` (Carteira de Origem).
- **Lucro (Juros/Multa):** O valor de `p_interest_paid + p_late_fee_paid` é enviado para o `p_caixa_livre_id`.
- **Ledger:** Cada movimento gera uma entrada de `CREDIT` no ledger da respectiva fonte, garantindo rastreabilidade total para o módulo "Minhas Finanças".

## 3. Capitalização de Juros
**Arquivo:** `services/payments.service.ts` & `RPC V3`
- **Opção de Capitalização:** Adicionado o parâmetro `p_capitalize_remaining`. 
- **Funcionamento:** Se o cliente pagar apenas parte do juros e o operador optar por capitalizar, o juros restante é somado ao principal da parcela, gerando juros sobre juros no próximo ciclo (anatocismo controlado).

## 4. Interface e Feedback
**Arquivo:** `features/calendar/CalendarView.tsx` (Refatorado na Parte 1)
- **Mês Pago:** A UI agora exibe o selo "MÊS PAGO" quando `isCyclePaid` é verdadeiro na Engine de Domínio, mesmo que o principal ainda esteja pendente.

---
**Veredito:** A lógica financeira está blindada contra inconsistências e segue rigorosamente as regras de negócio de empréstimos reais.
