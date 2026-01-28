
import { asString, asNumber } from './safe';

export const maskPhone = (value: string | undefined | null) => {
  const safeValue = asString(value);
  return safeValue.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15);
};

export const maskDocument = (value: string | undefined | null) => {
  const clean = asString(value).replace(/\D/g, '');
  if (clean.length <= 11) {
    return clean.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);
  }
  return clean.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18);
};

export const onlyDigits = (v: string | undefined | null) => asString(v).replace(/\D/g, '');

export const isTestClientName = (name: string | undefined | null) => {
  const n = asString(name).trim().toLowerCase();
  return n === 'teste';
};

export const formatMoney = (value: number | string | undefined | null, isStealth: boolean = false) => {
  if (isStealth) return "R$ ••••";
  const num = asNumber(value);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Converte inputs de string (ex: "1.200,50" ou "1200.50") para number float de forma segura.
 */
export const parseCurrency = (val: string | number | undefined | null): number => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    
    const str = String(val).trim();
    
    // Formato Brasileiro (com ponto separador de milhar e vírgula decimal)
    // Ex: 1.000,00 -> remove ponto, troca virgula por ponto
    if (str.includes('.') && str.includes(',')) {
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }
    
    // Formato com vírgula decimal simples
    // Ex: 1000,00 -> troca virgula por ponto
    if (str.includes(',')) {
        return parseFloat(str.replace(',', '.')) || 0;
    }
    
    // Formato padrão ou limpo
    return parseFloat(str) || 0;
};

/**
 * Normaliza telefone para o padrão brasileiro celular: (XX) 9XXXX-XXXX
 */
export const normalizeBrazilianPhone = (value: string | undefined | null): string => {
  const safeVal = asString(value);
  let digits = safeVal.replace(/\D/g, '');

  // Remove código do país se presente (55)
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.substring(2);
  }

  // Se for muito curto, retorna formatado simples
  if (digits.length < 8) return maskPhone(digits);

  // Extrai sufixo (últimos 8 dígitos) e o resto é prefixo
  const suffix = digits.slice(-8);
  let prefix = digits.slice(0, -8);
  
  // Se prefixo termina em 9 e sobrarem dígitos para DDD, remove o 9 (nono dígito implícito)
  if (prefix.endsWith('9') && prefix.length >= 3) {
    prefix = prefix.slice(0, -1);
  }

  // Validação de DDDs reais
  const validDDDs = [
    11, 12, 13, 14, 15, 16, 17, 18, 19,
    21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55,
    61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79,
    81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99
  ];

  let ddd = '';
  
  // Tenta extrair DDD do prefixo
  if (prefix.length >= 2) {
    const potentialDDD = parseInt(prefix.slice(-2), 10);
    if (validDDDs.includes(potentialDDD)) {
      ddd = prefix.slice(-2);
    }
  } 
  // Se não achou no prefixo, mas o número total tem 10 ou 11 dígitos, assume os primeiros 2 como DDD
  else if (digits.length === 10 || digits.length === 11) {
      const potentialDDD = parseInt(digits.slice(0, 2), 10);
      if (validDDDs.includes(potentialDDD)) {
          ddd = digits.slice(0, 2);
      }
  }

  // Se não identificou DDD, retorna formatado genérico para não inventar dados
  if (!ddd) return maskPhone(digits);

  const fullNumber = `${ddd}9${suffix}`;
  return fullNumber.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};
