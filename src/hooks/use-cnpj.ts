"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { CNPJ_LENGTH, cnpjDigits, type CnpjData } from "@/lib/cnpj";

export function useCnpjLookup() {
  const [data, setData] = useState<CnpjData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (cnpj: string): Promise<CnpjData | null> => {
    const digits = cnpjDigits(cnpj);
    if (digits.length !== CNPJ_LENGTH) {
      setError("CNPJ deve ter 14 dígitos");
      return null;
    }
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const found = await api<CnpjData>(`/api/cnpj/${digits}`, "Erro ao consultar CNPJ");
      setData(found);
      return found;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro de conexão");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
  };

  return { data, isLoading, error, lookup, reset };
}
