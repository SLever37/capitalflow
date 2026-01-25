
export const maskPhone = (value: string) => {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15);
};

export const maskDocument = (value: string) => {
  const clean = value.replace(/\D/g, '');
  if (clean.length <= 11) {
    return clean.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);
  }
  return clean.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18);
};

export const onlyDigits = (v: string) => (v || '').replace(/\D/g, '');

export const isTestClientName = (name: string) => {
  const n = (name || '').trim().toLowerCase();
  return n === 'teste';
};

export const formatMoney = (value: number, isStealth: boolean = false) => {
  if (isStealth) return "R$ ••••";
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Normaliza telefone para o padrão brasileiro celular: (XX) 9XXXX-XXXX
 * Regras:
 * 1. Remove 55 (DDI) se presente.
 * 2. Garante 8 últimos dígitos.
 * 3. Garante o 9º dígito.
 * 4. Valida DDD. Se inválido ou inexistente, usa 92.
 */
export const normalizeBrazilianPhone = (value: string): string => {
  let digits = value.replace(/\D/g, '');

  // Remove DDI 55 se o número for longo o suficiente (ex: 5592999998888 -> 92999998888)
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.substring(2);
  }

  // Se for muito curto, retorna como está (provavelmente inválido ou ramal)
  if (digits.length < 8) return maskPhone(digits);

  // Pega os últimos 8 dígitos (Sufixo fixo do celular)
  const suffix = digits.slice(-8);
  
  // Pega o que sobrou antes dos 8 dígitos
  let prefix = digits.slice(0, -8);
  
  // Verifica se o dígito '9' já existe antes do sufixo
  // Se existir, consumimos ele do prefixo. Se não, vamos injetar depois.
  if (prefix.endsWith('9')) {
    prefix = prefix.slice(0, -1);
  }

  // Lista de DDDs válidos no Brasil
  const validDDDs = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
    21, 22, 24, // RJ
    27, 28, // ES
    31, 32, 33, 34, 35, 37, 38, // MG
    41, 42, 43, 44, 45, 46, 47, 48, 49, // PR/SC
    51, 53, 54, 55, // RS
    61, 62, 63, 64, 65, 66, 67, 68, 69, // DF/GO/TO/MT/MS/AC/RO
    71, 73, 74, 75, 77, 79, // BA/SE
    81, 82, 83, 84, 85, 86, 87, 88, 89, // PE/AL/PB/RN/CE/PI
    91, 92, 93, 94, 95, 96, 97, 98, 99  // PA/AM/RR/AP/MA
  ];

  let ddd = '92'; // Padrão solicitado (Amazonas)
  
  // Tenta extrair um DDD válido do final do prefixo restante
  if (prefix.length >= 2) {
    const potentialDDD = parseInt(prefix.slice(-2), 10);
    if (validDDDs.includes(potentialDDD)) {
      ddd = prefix.slice(-2);
    }
  }

  // Reconstrói: DDD Validado + 9 Fixo + 8 Dígitos Finais
  const fullNumber = `${ddd}9${suffix}`;

  // Aplica máscara visual (XX) 9XXXX-XXXX
  return fullNumber.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};
