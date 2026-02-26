import { createClient } from "@supabase/supabase-js";

// Variáveis definidas em .env na raiz do projeto
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY ?? "";

// Singleton — criado uma única vez, reutilizado em todo o app
let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

// ── Helpers internos ──────────────────────────────────────────

function configurado(): boolean {
  return (
    SUPABASE_URL.length > 10 &&
    !SUPABASE_URL.includes("SEU-PROJETO") &&
    SUPABASE_SERVICE_KEY.length > 20 &&
    !SUPABASE_SERVICE_KEY.includes("SUA_SERVICE")
  );
}

// ── Sincronização de Cidades ──────────────────────────────────

export function syncCidade(
  id: number,
  nome: string,
  uf: string,
  distanciaKm: number | null | undefined,
  criadoEm: string
): void {
  if (!configurado()) return;
  getClient()
    .from("cidades")
    .upsert({ id, nome, uf, distancia_km: distanciaKm ?? null, criado_em: criadoEm }, { onConflict: "id" })
    .then(() => {})
    .catch(() => {});
}

export function deletarCidadeSupabase(id: number): void {
  if (!configurado()) return;
  getClient().from("cidades").delete().eq("id", id).then(() => {}).catch(() => {});
}

// ── Sincronização de Entregadores ────────────────────────────

export function syncEntregador(
  id: number,
  nome: string,
  telefone: string,
  cidadesIds: number[],
  ativo: boolean,
  criadoEm: string
): void {
  if (!configurado()) return;
  getClient()
    .from("entregadores")
    .upsert({ id, nome, telefone, cidades_ids: cidadesIds, ativo, criado_em: criadoEm }, { onConflict: "id" })
    .then(() => {})
    .catch(() => {});
}

export function deletarEntregadorSupabase(id: number): void {
  if (!configurado()) return;
  getClient().from("entregadores").delete().eq("id", id).then(() => {}).catch(() => {});
}

// ── Sincronização de Veículos ────────────────────────────────

export function syncVeiculo(
  id: number,
  placa: string,
  modelo: string,
  motoristaPadrao: string | null | undefined,
  ativo: boolean,
  kmAtual: number | null | undefined,
  criadoEm: string
): void {
  if (!configurado()) return;
  getClient()
    .from("veiculos")
    .upsert(
      { id, placa, modelo, motorista_padrao: motoristaPadrao ?? null, ativo, km_atual: kmAtual ?? null, criado_em: criadoEm },
      { onConflict: "id" }
    )
    .then(() => {})
    .catch(() => {});
}

export function deletarVeiculoSupabase(id: number): void {
  if (!configurado()) return;
  getClient().from("veiculos").delete().eq("id", id).then(() => {}).catch(() => {});
}

// ── Sincronização de Rotas ────────────────────────────────────

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
  if (!configurado()) return;
  getClient()
    .from("rotas")
    .upsert(
      {
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
      },
      { onConflict: "id" }
    )
    .then(() => {})
    .catch(() => {});
}
