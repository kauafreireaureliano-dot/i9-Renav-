// Resolve o código IBGE de 7 dígitos de um município a partir do nome + UF,
// usando a API pública do IBGE (gratuita, sem chave). Necessário porque a
// SEFAZ exige esse código em qualquer endereço de uma NF-e — não existe outro
// jeito confiável de obtê-lo além de consultar a base oficial.
//
// Validado ao vivo em 2026-09-16: GET /localidades/estados/{UF}/municipios
// retorna a lista completa; cacheamos por estado (a lista praticamente nunca
// muda) para não bater na API a cada emissão de nota.

interface IbgeMunicipio {
  id: number;
  nome: string;
}

const cacheByUf = new Map<string, IbgeMunicipio[]>();

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

async function getMunicipiosByUf(uf: string): Promise<IbgeMunicipio[]> {
  const cached = cacheByUf.get(uf);
  if (cached) return cached;

  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
  );
  if (!res.ok) {
    throw new Error(`Falha ao consultar municípios do IBGE para UF=${uf} (HTTP ${res.status})`);
  }
  const municipios = (await res.json()) as IbgeMunicipio[];
  cacheByUf.set(uf, municipios);
  return municipios;
}

export async function getMunicipioCode(city: string, uf: string): Promise<string | undefined> {
  try {
    const municipios = await getMunicipiosByUf(uf.toUpperCase());
    const target = normalize(city);
    const match = municipios.find((m) => normalize(m.nome) === target);
    return match ? String(match.id) : undefined;
  } catch {
    // Se o IBGE estiver fora do ar, deixamos o código faltando — o provider
    // real trata isso como validação incompleta em vez de travar a operação.
    return undefined;
  }
}
