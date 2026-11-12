const CEP = /\b\d{5}-?\d{3}\b/;

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Retorna o primeiro endereço encontrado no HTML do comentário, ou null.
 * Estratégia: procura prefixo de logradouro seguido de conteúdo razoável,
 * priorizando trechos que contenham CEP.
 */
export function extractAddress(html: string): string | null {
  const text = stripHtml(html);

  const prefixRegex =
    /\b(Rua|R\.|Avenida|Av\.|Travessa|Trav\.|Alameda|Al\.|Praça|Pça\.|Rodovia|Rod\.|Estrada|Est\.|Largo|Lgo\.|Beco|Viela)\s+.{5,200}/gi;

  const matches = [...text.matchAll(prefixRegex)];
  if (matches.length === 0) return null;

  for (const m of matches) {
    const candidate = m[0]
      // Corta na primeira quebra lógica que não faz parte de um endereço
      .replace(/[.!?]\s+[A-Z].*$/, "")
      .trim();

    if (CEP.test(candidate)) return candidate;
  }

  const first = matches[0][0].replace(/[.!?]\s+[A-Z].*$/, "").trim();
  // Só retorna se parece mesmo um endereço (tem número ou complemento)
  if (/\d/.test(first)) return first;

  return null;
}
