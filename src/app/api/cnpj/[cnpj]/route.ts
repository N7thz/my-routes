import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-handler";
import { CNPJ_LENGTH, cnpjDigits, type CnpjData } from "@/lib/cnpj";

type Params = { params: Promise<{ cnpj: string }> };

export const GET = apiRoute(async (_req, { params }: Params) => {
  const { cnpj } = await params;
  const digits = cnpjDigits(cnpj);

  if (digits.length !== CNPJ_LENGTH) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  }

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
    headers: { "User-Agent": "my-routes/1.0" },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    if (res.status === 404) {
      return NextResponse.json({ error: "CNPJ não encontrado na Receita Federal" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao consultar a Receita Federal" }, { status: 502 });
  }

  const d = await res.json();

  const addressParts = [
    d.logradouro,
    d.numero,
    d.complemento,
    d.bairro,
    d.municipio && d.uf ? `${d.municipio}/${d.uf}` : d.municipio ?? d.uf,
    d.cep ? `CEP ${d.cep}` : null,
  ].filter(Boolean);

  const result: CnpjData = {
    cnpj: digits,
    razaoSocial: d.razao_social ?? "",
    nomeFantasia: d.nome_fantasia || null,
    address: addressParts.join(", "),
    situacao: d.descricao_situacao_cadastral ?? d.situacao_cadastral ?? "",
  };

  return NextResponse.json(result);
});
