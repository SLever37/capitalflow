import { Loan, Installment, LoanPolicy } from "../../../../types";
import { getDaysDiff } from "../../../../utils/dateHelpers";
import { CalculationResult } from "../types";

const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

export const calculateDaily30 = (loan: Loan, inst: Installment, policy: LoanPolicy): CalculationResult => {
  const principal = Number(inst.principalRemaining);
  const interestRemaining = Number(inst.interestRemaining || 0);

  const daysLate = getDaysDiff(inst.dueDate);

  let lateInterest = 0;
  let lateFee = 0;

  // ❌ NÃO recalcula juros de ciclo
  // juros do ciclo já estão em interestRemaining

  if (daysLate > 0) {
    lateInterest =
      round(principal * (policy.dailyInterestPercent / 100) * daysLate);

    lateFee =
      policy.finePercent
        ? round(principal * (policy.finePercent / 100))
        : 0;
  }

  const totalInterest = round(interestRemaining + lateInterest);

  return {
    total: round(principal + totalInterest + lateFee),
    principal,
    interest: totalInterest,
    lateFee,
    baseForFine: principal,
    daysLate: Math.max(0, daysLate)
  };
};