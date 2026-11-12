export type CnpjData = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  address: string;
  situacao: string;
};

export const CNPJ_LENGTH = 14;

export function cnpjDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
  const d = cnpjDigits(value).slice(0, CNPJ_LENGTH);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
