// Drop-in replacement for supabase.ts — same exported function signatures,
// zero Supabase dependency. Uses plain fetch with fire-and-forget pattern.
// URL e API Key são lidos do AsyncStorage em runtime (configuráveis pelo usuário).

import { getServerConfig, isConfigured } from "./serverConfig";

async function post(path: string, body: unknown): Promise<void> {
  const config = await getServerConfig();
  if (!isConfigured(config)) return;
  fetch(`${config.url}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
    },
    body: JSON.stringify(body),
  }).catch(() => {});
}

async function del(path: string): Promise<void> {
  const config = await getServerConfig();
  if (!isConfigured(config)) return;
  fetch(`${config.url}${path}`, {
    method: "DELETE",
    headers: { "x-api-key": config.apiKey },
  }).catch(() => {});
}

// ── Cidades ──────────────────────────────────────────────────────

export function syncCidade(
  id: number,
  nome: string,
  uf: string,
  distanciaKm: number | null | undefined,
  criadoEm: string
): void {
  post("/api/sync/cidade", {
    id,
    nome,
    uf,
    distancia_km: distanciaKm ?? null,
    criado_em: criadoEm,
  }).catch(() => {});
}

export function deletarCidadeSupabase(id: number): void {
  del(`/api/sync/cidade/${id}`).catch(() => {});
}

// ── Entregadores ─────────────────────────────────────────────────

export function syncEntregador(
  id: number,
  nome: string,
  telefone: string,
  cidadesIds: number[],
  ativo: boolean,
  criadoEm: string
): void {
  post("/api/sync/entregador", {
    id,
    nome,
    telefone,
    cidades_ids: cidadesIds,
    ativo,
    criado_em: criadoEm,
  }).catch(() => {});
}

export function deletarEntregadorSupabase(id: number): void {
  del(`/api/sync/entregador/${id}`).catch(() => {});
}

// ── Veículos ─────────────────────────────────────────────────────

export function syncVeiculo(
  id: number,
  placa: string,
  modelo: string,
  motoristaPadrao: string | null | undefined,
  ativo: boolean,
  kmAtual: number | null | undefined,
  criadoEm: string
): void {
  post("/api/sync/veiculo", {
    id,
    placa,
    modelo,
    motorista_padrao: motoristaPadrao ?? null,
    ativo,
    km_atual: kmAtual ?? null,
    criado_em: criadoEm,
  }).catch(() => {});
}

export function deletarVeiculoSupabase(id: number): void {
  del(`/api/sync/veiculo/${id}`).catch(() => {});
}

// ── Rotas ────────────────────────────────────────────────────────

export function syncRota(rota: {
  id: number;
  data: string;
  veiculoId: number;
  veiculoPlaca: string;
  motorista: string;
  kmSaida: number;
  kmChegada?: number;
  horaSaida: string;
  horaChegada?: string;
  status: "em_andamento" | "concluida";
  itens: any[];
  criadoEm: string;
}): void {
  post("/api/sync/rota", {
    id: rota.id,
    data: rota.data,
    veiculo_id: rota.veiculoId,
    veiculo_placa: rota.veiculoPlaca,
    motorista: rota.motorista,
    km_saida: rota.kmSaida,
    km_chegada: rota.kmChegada ?? null,
    hora_saida: rota.horaSaida,
    hora_chegada: rota.horaChegada ?? null,
    status: rota.status,
    itens: rota.itens,
    criado_em: rota.criadoEm,
    atualizado_em: new Date().toISOString(),
  }).catch(() => {});
}
