"use client";

import { useEffect, useRef } from "react";
import { createLoader, createSerializer, type ParserMap, useQueryStates } from "nuqs";

/** Prefixo das chaves no localStorage; o logout apaga tudo que começa com ele. */
export const REMEMBERED_FILTERS_PREFIX = "my-routes-filtros:";

/**
 * Lembra no aparelho os filtros da URL (nuqs) de uma tela. Ao abrir a tela sem
 * nenhum desses parâmetros na URL, aplica os últimos usados; se a URL já traz
 * algum (link compartilhado, voltar no histórico), ela manda. Depois disso,
 * toda mudança é salva.
 *
 * `parsers` deve ser uma constante de módulo com os mesmos parsers dos
 * `useQueryState` da tela, e só com as preferências: busca e página ficam de fora.
 */
export function useRememberedFilters(name: string, parsers: ParserMap) {
  const [values, setValues] = useQueryStates(parsers);
  const serialized = createSerializer(parsers)(values);
  const decided = useRef(false);
  const storageKey = REMEMBERED_FILTERS_PREFIX + name;

  useEffect(() => {
    try {
      if (!decided.current) {
        decided.current = true;
        const url = new URLSearchParams(window.location.search);
        const urlHasFilters = Object.keys(parsers).some((key) => url.has(key));
        const saved = localStorage.getItem(storageKey);
        if (!urlHasFilters && saved) {
          // O loader descarta valores que não passam mais no parser (ex.: status removido).
          void setValues(createLoader(parsers)(saved));
          return;
        }
      }
      localStorage.setItem(storageKey, serialized);
    } catch {
      // localStorage indisponível (modo privado etc.): os filtros só não são lembrados
    }
  }, [serialized, storageKey, parsers, setValues]);
}
