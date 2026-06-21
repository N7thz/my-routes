"use client";

import { useState, useCallback } from "react";

export type CnpjData = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  address: string;
  situacao: string;
};

export function formatCnpj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function useCnpjLookup() {
  const [data, setData] = useState<CnpjData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (cnpj: string): Promise<CnpjData | null> => {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      setError("CNPJ deve ter 14 dígitos");
      return null;
    }
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/cnpj/${digits}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erro ao consultar CNPJ");
        return null;
      }
      setData(json);
      return json as CnpjData;
    } catch {
      setError("Erro de conexão");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, isLoading, error, lookup, reset };
}
