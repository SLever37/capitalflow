
import { LoanFormState } from '../domain/loanForm.mapper';
import { LoanBillingModality, PaymentMethod } from '@/types';

export const getInitialFormState = (defaultSourceId: string = ''): LoanFormState => {
    const defaultDate = new Date();
    defaultDate.setHours(12, 0, 0, 0);
    const defaultDateStr = defaultDate.toISOString().split('T')[0];

    return {
        clientId: '',
        debtorName: '',
        debtorPhone: '',
        debtorDocument: '',
        debtorAddress: '',
        sourceId: defaultSourceId,
        preferredPaymentMethod: 'PIX' as PaymentMethod,
        pixKey: '',
        principal: '',
        interestRate: '30',
        finePercent: '2', 
        dailyInterestPercent: '1',
        billingCycle: 'MONTHLY' as LoanBillingModality,
        notes: '',
        guaranteeDescription: '',
        startDate: defaultDateStr
    };
};
